import { useState, useCallback, useEffect, useRef } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const ROWS = 6;
const COLS = 7;
type Cell = "empty" | "player" | "cpu";

function emptyBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill("empty"));
}

function checkWin(board: Cell[][], player: Cell): boolean {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      if ([0, 1, 2, 3].every((i) => board[r][c + i] === player)) return true;
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c < COLS; c++)
      if ([0, 1, 2, 3].every((i) => board[r + i][c] === player)) return true;
  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      if ([0, 1, 2, 3].every((i) => board[r - i][c + i] === player)) return true;
  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c <= COLS - 4; c++)
      if ([0, 1, 2, 3].every((i) => board[r + i][c + i] === player)) return true;
  return false;
}

function dropPiece(board: Cell[][], col: number, player: Cell): Cell[][] | null {
  const b = board.map((r) => [...r]);
  for (let r = ROWS - 1; r >= 0; r--) {
    if (b[r][col] === "empty") { b[r][col] = player; return b; }
  }
  return null;
}

function cpuMove(board: Cell[][]): number {
  for (let c = 0; c < COLS; c++) {
    const b = dropPiece(board, c, "cpu");
    if (b && checkWin(b, "cpu")) return c;
  }
  for (let c = 0; c < COLS; c++) {
    const b = dropPiece(board, c, "player");
    if (b && checkWin(b, "player")) return c;
  }
  const pref = [3, 2, 4, 1, 5, 0, 6];
  for (const c of pref) {
    if (board[0][c] === "empty") return c;
  }
  return 0;
}

export default function ConnectFourGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [board, setBoard] = useState<Cell[][]>(emptyBoard);
  const [turn, setTurn] = useState<"player" | "cpu">("player");
  const [status, setStatus] = useState<"playing" | "win" | "lose" | "draw">("playing");
  const [hoverCol, setHoverCol] = useState<number>(-1);
  const [wins, setWins] = useState(0);
  const gameOverFired = useRef(false);

  const handleColumnClick = useCallback((col: number) => {
    if (!isActive || status !== "playing" || turn !== "player") return;
    const nb = dropPiece(board, col, "player");
    if (!nb) return;
    if (checkWin(nb, "player")) {
      setBoard(nb);
      setStatus("win");
      const newWins = wins + 1;
      setWins(newWins);
      onScoreUpdate(newWins);
      if (!gameOverFired.current) { gameOverFired.current = true; setTimeout(() => onGameOver(newWins), 800); }
      return;
    }
    if (nb.every((r) => r.every((c) => c !== "empty"))) {
      setBoard(nb);
      setStatus("draw");
      if (!gameOverFired.current) { gameOverFired.current = true; setTimeout(() => onGameOver(wins), 800); }
      return;
    }
    setBoard(nb);
    setTurn("cpu");
  }, [board, turn, status, wins, isActive, onGameOver, onScoreUpdate]);

  useEffect(() => {
    if (turn !== "cpu" || status !== "playing") return;
    const timer = setTimeout(() => {
      const col = cpuMove(board);
      const nb = dropPiece(board, col, "cpu");
      if (!nb) return;
      if (checkWin(nb, "cpu")) {
        setBoard(nb);
        setStatus("lose");
        if (!gameOverFired.current) { gameOverFired.current = true; setTimeout(() => onGameOver(wins), 800); }
        return;
      }
      if (nb.every((r) => r.every((c) => c !== "empty"))) {
        setBoard(nb);
        setStatus("draw");
        if (!gameOverFired.current) { gameOverFired.current = true; setTimeout(() => onGameOver(wins), 800); }
        return;
      }
      setBoard(nb);
      setTurn("player");
    }, 500);
    return () => clearTimeout(timer);
  }, [turn, board, status, wins, onGameOver]);

  const CELL_SIZE = 60;
  const PAD = 12;
  const boardW = COLS * CELL_SIZE + PAD * 2;

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <div className="flex items-center gap-6 font-arcade text-xs" style={{ color: "#fff200" }}>
        <span>WINS: {wins}</span>
        <span style={{ color: turn === "player" ? "#00f5ff" : "#ff2d8e" }}>
          {status === "playing"
            ? turn === "player" ? "YOUR TURN" : "CPU THINKING..."
            : status === "win" ? "YOU WIN!"
            : status === "lose" ? "CPU WINS"
            : "DRAW!"}
        </span>
      </div>

      <div
        className="rounded overflow-hidden"
        style={{ background: "#0d1a3a", border: "2px solid rgba(0,245,255,0.3)", padding: PAD, width: boardW }}
      >
        {/* Drop indicators */}
        <div className="flex mb-1" style={{ gap: 4 }}>
          {Array.from({ length: COLS }, (_, c) => (
            <div
              key={`ind-${c}`}
              style={{ width: CELL_SIZE - 4, height: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {hoverCol === c && turn === "player" && status === "playing" && (
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#00f5ff", boxShadow: "0 0 8px #00f5ff" }} />
              )}
            </div>
          ))}
        </div>

        {board.map((row, r) => (
          <div key={`row-${r}`} className="flex" style={{ gap: 4, marginBottom: 4 }}>
            {row.map((cell, c) => (
              <button
                key={`cell-${r}-${c}`}
                type="button"
                style={{
                  width: CELL_SIZE - 4, height: CELL_SIZE - 4, borderRadius: "50%",
                  background: cell === "empty" ? "rgba(0,0,0,0.5)" : cell === "player" ? "#00f5ff" : "#ff2d8e",
                  boxShadow: cell === "player" ? "0 0 12px #00f5ff" : cell === "cpu" ? "0 0 12px #ff2d8e" : "inset 0 2px 4px rgba(0,0,0,0.5)",
                  border: "none", cursor: turn === "player" && status === "playing" ? "pointer" : "default",
                  transition: "background 0.2s",
                }}
                onClick={() => handleColumnClick(c)}
                onMouseEnter={() => setHoverCol(c)}
                onMouseLeave={() => setHoverCol(-1)}
              />
            ))}
          </div>
        ))}
      </div>

      <p className="font-mono-tech text-xs" style={{ color: "rgba(0,245,255,0.5)" }}>
        Click column to drop disc · Get 4 in a row to win
      </p>
    </div>
  );
}
