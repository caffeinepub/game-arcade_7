import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

type Suit = "♠" | "♥";
type Card = { suit: Suit; rank: number; id: string; faceUp: boolean };

const SUITS: Suit[] = ["♠", "♥"];

function rankLabel(r: number) {
  if (r === 1) return "A"; if (r === 11) return "J"; if (r === 12) return "Q"; if (r === 13) return "K";
  return String(r);
}

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (let i = 0; i < 2; i++) {
    for (const suit of SUITS) {
      for (let r = 1; r <= 13; r++) {
        deck.push({ suit, rank: r, id: `${suit}${r}-${i}`, faceUp: false });
      }
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

interface GameState {
  tableau: Card[][];
  stock: Card[][];  // groups of 10 for dealing
  completed: number;
}

function initGame(): GameState {
  const deck = createDeck();
  const tableau: Card[][] = Array(10).fill(null).map(() => []);
  // Deal: 4 cols get 6 cards, 6 cols get 5 cards
  let idx = 0;
  for (let col = 0; col < 10; col++) {
    const count = col < 4 ? 6 : 5;
    for (let i = 0; i < count; i++) {
      tableau[col].push({ ...deck[idx++], faceUp: false });
    }
    tableau[col][tableau[col].length - 1].faceUp = true;
  }
  const stock: Card[][] = [];
  while (idx < deck.length) {
    const group: Card[] = [];
    for (let i = 0; i < 10 && idx < deck.length; i++) {
      group.push({ ...deck[idx++], faceUp: true });
    }
    stock.push(group);
  }
  return { tableau, stock, completed: 0 };
}

function getMovableSequence(col: Card[]): Card[] {
  if (col.length === 0) return [];
  const seq: Card[] = [col[col.length - 1]];
  for (let i = col.length - 2; i >= 0; i--) {
    const top = seq[seq.length - 1];
    const card = col[i];
    if (!card.faceUp) break;
    if (card.suit !== top.suit || card.rank !== top.rank + 1) break;
    seq.push(card);
  }
  return seq.reverse();
}

function canPlace(seq: Card[], col: Card[]): boolean {
  if (col.length === 0) return true;
  const top = col[col.length - 1];
  if (!top.faceUp) return false;
  return seq[0].rank === top.rank - 1;
}

function checkComplete(col: Card[]): boolean {
  if (col.length < 13) return false;
  const last13 = col.slice(-13);
  const suit = last13[0].suit;
  for (let i = 0; i < 13; i++) {
    if (last13[i].suit !== suit || last13[i].rank !== 13 - i) return false;
  }
  return true;
}

export default function SpiderSolitaireGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [state, setState] = useState<GameState>(initGame);
  const [selected, setSelected] = useState<{ col: number; seq: Card[] } | null>(null);
  const [score, setScore] = useState(0);

  const handleColumnClick = useCallback((colIdx: number) => {
    if (!isActive) return;
    const col = state.tableau[colIdx];

    if (selected === null) {
      const seq = getMovableSequence(col);
      if (seq.length > 0) setSelected({ col: colIdx, seq });
      return;
    }

    if (selected.col === colIdx) { setSelected(null); return; }

    if (canPlace(selected.seq, col)) {
      const newTab = state.tableau.map(c => [...c]);
      // Remove from source
      newTab[selected.col] = newTab[selected.col].slice(0, newTab[selected.col].length - selected.seq.length);
      if (newTab[selected.col].length > 0) {
        newTab[selected.col][newTab[selected.col].length - 1] = { ...newTab[selected.col][newTab[selected.col].length - 1], faceUp: true };
      }
      // Add to target
      newTab[colIdx] = [...newTab[colIdx], ...selected.seq];

      // Check for completed sequences
      let newCompleted = state.completed;
      for (let c = 0; c < 10; c++) {
        if (checkComplete(newTab[c])) {
          newTab[c] = newTab[c].slice(0, -13);
          if (newTab[c].length > 0) newTab[c][newTab[c].length - 1].faceUp = true;
          newCompleted++;
        }
      }

      const newScore = newCompleted * 100 + score + 5;
      setScore(newScore);
      onScoreUpdate(newScore);
      setState({ ...state, tableau: newTab, completed: newCompleted });
      setSelected(null);

      if (newCompleted === 8) {
        setTimeout(() => onGameOver(newScore), 600);
      }
    } else {
      const seq = getMovableSequence(col);
      setSelected(seq.length > 0 ? { col: colIdx, seq } : null);
    }
  }, [isActive, selected, state, score, onScoreUpdate, onGameOver]);

  const dealCards = useCallback(() => {
    if (state.stock.length === 0) return;
    const [group, ...rest] = state.stock;
    const newTab = state.tableau.map((col, i) => [...col, { ...group[i], faceUp: true }]);
    setState({ ...state, tableau: newTab, stock: rest });
    setSelected(null);
  }, [state]);

  return (
    <div className="flex flex-col gap-2 p-3 w-full max-w-4xl" style={{ minHeight: 520 }}>
      <div className="flex justify-between font-arcade text-[9px]">
        <span style={{ color: "#ff4444" }}>SPIDER SOLITAIRE</span>
        <span style={{ color: "#39ff14" }}>SETS: {state.completed}/8</span>
        <span style={{ color: "#00f5ff" }}>SCORE: {score}</span>
        <button
          type="button"
          onClick={dealCards}
          disabled={state.stock.length === 0}
          className="font-arcade text-[8px] px-2 py-1 rounded"
          style={{
            background: state.stock.length > 0 ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
            color: state.stock.length > 0 ? "#fff" : "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          DEAL ({state.stock.length})
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto flex-1">
        {state.tableau.map((col, ci) => {
          const isSel = selected?.col === ci;
          return (
            <button
              key={`spider-col-${ci}`}
              type="button"
              onClick={() => handleColumnClick(ci)}
              className="flex-1 relative rounded"
              style={{
                minWidth: 52,
                minHeight: 300,
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${isSel ? "rgba(255,68,68,0.4)" : "rgba(255,255,255,0.06)"}`,
                cursor: "pointer",
                position: "relative",
              }}
            >
              {col.map((card, si) => (
                <div
                  key={`spider-${card.id}`}
                  className="absolute rounded text-center"
                  style={{
                    top: si * 18,
                    left: 2,
                    right: 2,
                    height: 52,
                    background: card.faceUp ? "#1a1a2e" : "#0d0d1a",
                    border: `1px solid ${isSel && si >= col.length - (selected?.seq.length ?? 0) ? "#ff4444" : "rgba(255,255,255,0.1)"}`,
                    color: card.faceUp ? (card.suit === "♥" ? "#ff4444" : "#e8e8e8") : "rgba(255,255,255,0.1)",
                    fontSize: 10,
                    fontFamily: "monospace",
                    padding: "2px 4px",
                    zIndex: si + 1,
                    textAlign: "left",
                  }}
                >
                  {card.faceUp ? `${rankLabel(card.rank)}${card.suit}` : "⊞"}
                </div>
              ))}
              {col.length === 0 && <div className="text-center pt-4" style={{ color: "rgba(255,255,255,0.1)", fontSize: 10 }}>empty</div>}
            </button>
          );
        })}
      </div>

      <p className="font-mono-tech text-xs text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
        Click to select a column, click destination to move. Build K→A in one suit to complete!
      </p>
    </div>
  );
}
