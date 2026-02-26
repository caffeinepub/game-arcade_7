import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

type Piece = { color: "red" | "black"; king: boolean } | null;
type Board = Piece[][];

function createBoard(): Board {
  const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) board[r][c] = { color: "black", king: false };
    }
  }
  for (let r = 5; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) board[r][c] = { color: "red", king: false };
    }
  }
  return board;
}

interface Move { fromR: number; fromC: number; toR: number; toC: number; captureR?: number; captureC?: number; }

function getMoves(board: Board, color: "red" | "black", mustCapture = false): Move[] {
  const moves: Move[] = [];
  const captures: Move[] = [];
  const dir = color === "red" ? -1 : 1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.color !== color) continue;
      const dirs = p.king ? [-1, 1] : [dir];
      for (const dr of dirs) {
        for (const dc of [-1, 1]) {
          const mr = r + dr; const mc = c + dc;
          if (mr >= 0 && mr < 8 && mc >= 0 && mc < 8) {
            if (!board[mr][mc]) {
              moves.push({ fromR: r, fromC: c, toR: mr, toC: mc });
            } else if (board[mr][mc]?.color !== color) {
              const jr = r + dr * 2; const jc = c + dc * 2;
              if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8 && !board[jr][jc]) {
                captures.push({ fromR: r, fromC: c, toR: jr, toC: jc, captureR: mr, captureC: mc });
              }
            }
          }
        }
      }
    }
  }
  return captures.length > 0 ? captures : (mustCapture ? [] : moves);
}

function applyMove(board: Board, move: Move): Board {
  const nb = board.map(r => r.map(c => c ? { ...c } : null));
  const p = nb[move.fromR][move.fromC]!;
  nb[move.toR][move.toC] = p;
  nb[move.fromR][move.fromC] = null;
  if (move.captureR !== undefined && move.captureC !== undefined) {
    nb[move.captureR][move.captureC] = null;
  }
  if ((p.color === "red" && move.toR === 0) || (p.color === "black" && move.toR === 7)) {
    nb[move.toR][move.toC] = { ...p, king: true };
  }
  return nb;
}

function aiMove(board: Board): Board {
  const moves = getMoves(board, "black");
  if (moves.length === 0) return board;
  const move = moves[Math.floor(Math.random() * moves.length)];
  return applyMove(board, move);
}

export default function CheckersGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [board, setBoard] = useState<Board>(() => createBoard());
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [aiTurn, setAiTurn] = useState(false);
  const [validMoves, setValidMoves] = useState<Move[]>([]);

  const handleClick = useCallback((r: number, c: number) => {
    if (!isActive || gameOver || aiTurn) return;

    const allMoves = getMoves(board, "red");
    if (selected) {
      const move = validMoves.find(m => m.toR === r && m.toC === c);
      if (move) {
        const nb = applyMove(board, move);
        const captured = move.captureR !== undefined ? 1 : 0;
        const newScore = score + captured * 10;
        setScore(newScore);
        onScoreUpdate(newScore);
        setSelected(null);
        setValidMoves([]);

        const blackCount = nb.flat().filter(p => p?.color === "black").length;
        const redCount = nb.flat().filter(p => p?.color === "red").length;
        if (blackCount === 0) {
          setBoard(nb);
          setGameOver(true);
          onGameOver(newScore);
          return;
        }

        setAiTurn(true);
        setBoard(nb);
        setTimeout(() => {
          const nb2 = aiMove(nb);
          const redCount2 = nb2.flat().filter(p => p?.color === "red").length;
          setBoard(nb2);
          setAiTurn(false);
          if (redCount2 === 0 || getMoves(nb2, "red").length === 0) {
            setGameOver(true);
            onGameOver(newScore);
          }
        }, 500);
        return;
      }
    }

    const piece = board[r][c];
    if (piece?.color === "red") {
      const pieceMoves = allMoves.filter(m => m.fromR === r && m.fromC === c);
      setSelected([r, c]);
      setValidMoves(pieceMoves);
    } else {
      setSelected(null);
      setValidMoves([]);
    }
  }, [board, selected, validMoves, score, isActive, gameOver, aiTurn, onGameOver, onScoreUpdate]);

  const resetGame = () => {
    setBoard(createBoard());
    setSelected(null);
    setScore(0);
    setGameOver(false);
    setAiTurn(false);
    setValidMoves([]);
  };

  const CELL = 56;

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <div className="flex items-center gap-8 mb-2">
        <div className="text-center">
          <div className="font-arcade text-[9px] mb-1" style={{ color: "rgba(255,68,68,0.6)" }}>YOU (RED)</div>
          <div className="font-arcade text-xl" style={{ color: "#ff4444", textShadow: "0 0 10px #ff4444" }}>
            {board.flat().filter(p => p?.color === "red").length}
          </div>
        </div>
        <div className="font-arcade text-[9px]" style={{ color: "#fff200" }}>PIECES</div>
        <div className="text-center">
          <div className="font-arcade text-[9px] mb-1" style={{ color: "rgba(0,245,255,0.6)" }}>AI (BLACK)</div>
          <div className="font-arcade text-xl" style={{ color: "#00f5ff", textShadow: "0 0 10px #00f5ff" }}>
            {board.flat().filter(p => p?.color === "black").length}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(8, ${CELL}px)`, gap: 0, border: "2px solid rgba(255,68,68,0.4)", borderRadius: 4 }}>
        {board.map((row, r) => row.map((piece, c) => {
          const isDark = (r + c) % 2 === 1;
          const isSelected = selected?.[0] === r && selected?.[1] === c;
          const isValid = validMoves.some(m => m.toR === r && m.toC === c);
          return (
            <button
              type="button"
              key={`cell-r${r}c${c}`}
              onClick={() => handleClick(r, c)}
              style={{
                width: CELL, height: CELL,
                background: isSelected ? "rgba(255,242,0,0.3)" : isValid ? "rgba(57,255,20,0.25)" : isDark ? "rgba(255,68,68,0.08)" : "rgba(0,0,0,0.4)",
                cursor: isDark ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative",
                boxSizing: "border-box",
                border: isValid ? "2px solid #39ff14" : isSelected ? "2px solid #fff200" : "1px solid transparent",
                padding: 0,
              }}
            >
              {isValid && !piece && <div style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(57,255,20,0.5)" }} />}
              {piece && (
                <div style={{
                  width: CELL - 12, height: CELL - 12,
                  borderRadius: "50%",
                  background: piece.color === "red" ? "radial-gradient(circle at 35% 35%, #ff6666, #cc0000)" : "radial-gradient(circle at 35% 35%, #555, #111)",
                  border: `2px solid ${piece.color === "red" ? "#ff8888" : "#888"}`,
                  boxShadow: piece.color === "red" ? "0 0 8px rgba(255,68,68,0.5)" : "0 2px 4px rgba(0,0,0,0.5)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                }}>
                  {piece.king && <span style={{ color: "#fff200", fontSize: 14, fontWeight: "bold" }}>♛</span>}
                </div>
              )}
            </button>
          );
        }))}
      </div>

      <div className="font-arcade text-[10px]" style={{ color: aiTurn ? "#00f5ff" : "#fff200", minHeight: 20 }}>
        {gameOver ? "GAME OVER!" : aiTurn ? "AI THINKING..." : "YOUR TURN"}
      </div>

      <div className="flex gap-4">
        <button type="button" onClick={resetGame}
          className="font-arcade text-[10px] px-4 py-2 rounded"
          style={{ background: "transparent", color: "#39ff14", border: "1px solid #39ff14" }}>
          NEW GAME
        </button>
      </div>
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
        Click piece to select • Click highlighted square to move
      </p>
    </div>
  );
}
