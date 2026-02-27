import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

// Triple Triad: 3x3 board, cards have 4 values (top, right, bottom, left) 1-9
// Higher edge value captures adjacent cards

type CardOwner = "player" | "ai" | null;
interface Card {
  id: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
  owner: CardOwner;
  name: string;
}

function makeCard(id: number, t: number, r: number, b: number, l: number, name: string, owner: CardOwner): Card {
  return { id, top: t, right: r, bottom: b, left: l, owner, name };
}

const PLAYER_HAND: Card[] = [
  makeCard(1, 8,3,5,4, "Dragon", "player"),
  makeCard(2, 5,7,3,6, "Phoenix", "player"),
  makeCard(3, 4,8,6,2, "Golem", "player"),
  makeCard(4, 7,4,9,2, "Leviathan", "player"),
  makeCard(5, 3,9,4,7, "Wizard", "player"),
];

const AI_HAND: Card[] = [
  makeCard(6, 7,4,6,5, "Orc", "ai"),
  makeCard(7, 5,6,4,7, "Troll", "ai"),
  makeCard(8, 9,2,5,3, "Titan", "ai"),
  makeCard(9, 4,5,8,6, "Witch", "ai"),
  makeCard(10, 6,7,3,8, "Knight", "ai"),
];

type BoardCell = Card | null;

function applyCaptures(board: BoardCell[][], r: number, c: number): BoardCell[][] {
  const nb = board.map(row => [...row]);
  const placed = nb[r][c];
  if (!placed) return nb;

  // Check all 4 directions
  const dirs = [
    { dr: -1, dc: 0, myEdge: placed.top, theirEdge: "bottom" as keyof Card },
    { dr: 1, dc: 0, myEdge: placed.bottom, theirEdge: "top" as keyof Card },
    { dr: 0, dc: -1, myEdge: placed.left, theirEdge: "right" as keyof Card },
    { dr: 0, dc: 1, myEdge: placed.right, theirEdge: "left" as keyof Card },
  ];

  for (const { dr, dc, myEdge, theirEdge } of dirs) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr > 2 || nc < 0 || nc > 2) continue;
    const neighbor = nb[nr][nc];
    if (neighbor && neighbor.owner !== placed.owner) {
      if (myEdge > (neighbor[theirEdge] as number)) {
        nb[nr][nc] = { ...neighbor, owner: placed.owner };
      }
    }
  }
  return nb;
}

export default function TripleTriadGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [board, setBoard] = useState<BoardCell[][]>([[null,null,null],[null,null,null],[null,null,null]]);
  const [playerHand, setPlayerHand] = useState<Card[]>([...PLAYER_HAND]);
  const [aiHand, setAIHand] = useState<Card[]>([...AI_HAND]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [turn, setTurn] = useState<"player" | "ai">("player");
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState("Select a card from your hand, then place it.");

  const checkWin = useCallback((board: BoardCell[][], playerH: Card[], aiH: Card[]) => {
    const cells = board.flat();
    const allPlaced = cells.every(c => c !== null);
    const totalCells = 9;
    const handCardsLeft = playerH.length + aiH.length;

    if (allPlaced || handCardsLeft === 0) {
      const playerCount = cells.filter(c => c?.owner === "player").length + playerH.length;
      const aiCount = cells.filter(c => c?.owner === "ai").length + aiH.length;
      const pts = playerCount * 100;
      onScoreUpdate(pts);
      const msg = playerCount > aiCount ? "You WIN!" : playerCount === aiCount ? "DRAW!" : "AI wins...";
      setMessage(msg);
      setGameOver(true);
      setTimeout(() => onGameOver(pts), 1200);
      void totalCells;
    }
  }, [onScoreUpdate, onGameOver]);

  const placeCard = useCallback((r: number, c: number) => {
    if (!isActive || gameOver || turn !== "player" || !selectedCard || board[r][c] !== null) return;

    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = selectedCard;
    const afterCapture = applyCaptures(newBoard, r, c);
    const newPlayerHand = playerHand.filter(card => card.id !== selectedCard.id);

    setBoard(afterCapture);
    setPlayerHand(newPlayerHand);
    setSelectedCard(null);
    setTurn("ai");
    setMessage("AI is thinking...");

    // AI turn
    setTimeout(() => {
      if (aiHand.length === 0) {
        checkWin(afterCapture, newPlayerHand, aiHand);
        return;
      }

      // AI picks a card and placement
      let bestScore = -1;
      let bestCard = aiHand[0];
      let bestR = 0, bestC = 0;

      for (const card of aiHand) {
        for (let ar = 0; ar < 3; ar++) {
          for (let ac = 0; ac < 3; ac++) {
            if (afterCapture[ar][ac] !== null) continue;
            const testBoard = afterCapture.map(row => [...row]);
            testBoard[ar][ac] = card;
            const after = applyCaptures(testBoard, ar, ac);
            const aiScore = after.flat().filter(cell => cell?.owner === "ai").length;
            if (aiScore > bestScore) {
              bestScore = aiScore;
              bestCard = card;
              bestR = ar;
              bestC = ac;
            }
          }
        }
      }

      const aib = afterCapture.map(row => [...row]);
      aib[bestR][bestC] = bestCard;
      const aiAfterCapture = applyCaptures(aib, bestR, bestC);
      const newAIHand = aiHand.filter(c => c.id !== bestCard.id);

      setBoard(aiAfterCapture);
      setAIHand(newAIHand);
      setTurn("player");
      setMessage("Your turn — select and place a card!");
      checkWin(aiAfterCapture, newPlayerHand, newAIHand);
    }, 800);
  }, [isActive, gameOver, turn, selectedCard, board, playerHand, aiHand, checkWin]);

  const CARD_W = 70;
  const CELL = 90;

  const renderCard = (card: Card, small = false, selectable = false, onSel?: () => void, isSel = false) => {
    const isP = card.owner === "player";
    const col = isP ? "#00f5ff" : "#ff2d8e";
    const w = small ? CARD_W : CARD_W + 10;
    const h = small ? 88 : 100;
    return (
      <button
        key={`tt-card-${card.id}`}
        type="button"
        onClick={selectable ? onSel : undefined}
        className="rounded flex flex-col items-center relative transition-all"
        style={{
          width: w,
          height: h,
          background: "#111122",
          border: `2px solid ${isSel ? "#fff200" : col + "88"}`,
          boxShadow: isSel ? "0 0 12px #fff200" : `0 0 6px ${col}44`,
          cursor: selectable ? "pointer" : "default",
          padding: 2,
        }}
      >
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>{card.name}</div>
        <div style={{ fontSize: 18, fontWeight: "bold", color: col, fontFamily: "monospace", lineHeight: 1 }}>{card.top}</div>
        <div className="flex justify-between w-full px-1">
          <span style={{ fontSize: 18, fontWeight: "bold", color: col, fontFamily: "monospace" }}>{card.left}</span>
          <span style={{ fontSize: 18, fontWeight: "bold", color: col, fontFamily: "monospace" }}>{card.right}</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: "bold", color: col, fontFamily: "monospace", lineHeight: 1 }}>{card.bottom}</div>
      </button>
    );
  };

  const playerCount = board.flat().filter(c => c?.owner === "player").length + playerHand.length;
  const aiCount = board.flat().filter(c => c?.owner === "ai").length + aiHand.length;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex gap-6 font-arcade text-xs">
        <span style={{ color: "#00f5ff" }}>YOU: {playerCount}</span>
        <span style={{ color: "#ff2d8e" }}>AI: {aiCount}</span>
      </div>

      {/* AI hand */}
      <div className="flex gap-2">
        <div className="font-arcade text-[9px] self-center" style={{ color: "#ff2d8e" }}>AI:</div>
        {aiHand.map(card => (
          <div key={`ttai-${card.id}`} style={{ opacity: 0.6 }}>
            {renderCard(card, true)}
          </div>
        ))}
      </div>

      {/* Board */}
      <div className="grid grid-cols-3 gap-1">
        {board.map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`ttboard-${r}-${c}`}
              type="button"
              onClick={() => placeCard(r, c)}
              className="rounded flex items-center justify-center transition-all"
              style={{
                width: CELL,
                height: CELL,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.12)",
                cursor: cell === null && turn === "player" && selectedCard ? "pointer" : "default",
              }}
            >
              {cell && renderCard(cell, false)}
            </button>
          ))
        )}
      </div>

      {/* Player hand */}
      <div className="flex gap-2">
        <div className="font-arcade text-[9px] self-center" style={{ color: "#00f5ff" }}>YOU:</div>
        {playerHand.map(card => (
          renderCard(card, true, true, () => setSelectedCard(c => c?.id === card.id ? null : card), selectedCard?.id === card.id)
        ))}
      </div>

      <div className="font-arcade text-[9px]" style={{ color: gameOver ? "#fff200" : "#00f5ff" }}>
        {message}
      </div>
    </div>
  );
}
