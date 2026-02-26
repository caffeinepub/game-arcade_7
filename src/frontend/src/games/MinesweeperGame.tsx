import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const ROWS = 9;
const COLS = 9;
const MINES = 10;

type CellState = "hidden" | "revealed" | "flagged";

interface Cell {
  mine: boolean;
  adjacent: number;
  state: CellState;
}

function createBoard(): Cell[][] {
  const board: Cell[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ mine: false, adjacent: 0, state: "hidden" }))
  );

  // Place mines
  let placed = 0;
  while (placed < MINES) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    if (!board[r][c].mine) {
      board[r][c].mine = true;
      placed++;
    }
  }

  // Calculate adjacents
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c].mine) continue;
      let count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].mine) {
            count++;
          }
        }
      }
      board[r][c].adjacent = count;
    }
  }

  return board;
}

function revealCells(board: Cell[][], r: number, c: number): Cell[][] {
  const newBoard = board.map((row) => row.map((cell) => ({ ...cell })));

  const flood = (cr: number, cc: number) => {
    if (cr < 0 || cr >= ROWS || cc < 0 || cc >= COLS) return;
    const cell = newBoard[cr][cc];
    if (cell.state === "revealed" || cell.state === "flagged") return;
    cell.state = "revealed";
    if (cell.adjacent === 0 && !cell.mine) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          flood(cr + dr, cc + dc);
        }
      }
    }
  };

  flood(r, c);
  return newBoard;
}

const NUMBER_COLORS: Record<number, string> = {
  1: "#00f5ff",
  2: "#39ff14",
  3: "#ff2d8e",
  4: "#bf5fff",
  5: "#ff8c00",
  6: "#00f5ff",
  7: "#ffffff",
  8: "#888888",
};

export default function MinesweeperGame({ onGameOver, onScoreUpdate }: Props) {
  const [board, setBoard] = useState<Cell[][]>(() => createBoard());
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const countRevealed = useCallback((b: Cell[][]): number => {
    let count = 0;
    for (const row of b) {
      for (const cell of row) {
        if (cell.state === "revealed") count++;
      }
    }
    return count;
  }, []);

  const startGame = useCallback(() => {
    const b = createBoard();
    setBoard(b);
    setStarted(true);
    setGameOver(false);
    setWon(false);
    onScoreUpdate(0);
  }, [onScoreUpdate]);

  const handleClick = useCallback((r: number, c: number) => {
    if (!started || gameOver || won) return;
    const cell = board[r][c];
    if (cell.state === "flagged" || cell.state === "revealed") return;

    if (cell.mine) {
      // Reveal all mines
      const newBoard = board.map((row) =>
        row.map((c) => c.mine ? { ...c, state: "revealed" as CellState } : { ...c })
      );
      setBoard(newBoard);
      setGameOver(true);
      const score = countRevealed(board) * 10;
      onGameOver(score);
      return;
    }

    const newBoard = revealCells(board, r, c);
    const revealed = countRevealed(newBoard);
    const score = revealed * 10;
    onScoreUpdate(score);
    setBoard(newBoard);

    // Win check
    const safeTotal = ROWS * COLS - MINES;
    if (revealed >= safeTotal) {
      setWon(true);
      onGameOver(score);
    }
  }, [started, gameOver, won, board, countRevealed, onGameOver, onScoreUpdate]);

  const handleRightClick = useCallback((e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (!started || gameOver || won) return;
    const cell = board[r][c];
    if (cell.state === "revealed") return;
    setBoard((prev) =>
      prev.map((row, ri) =>
        row.map((cell, ci) => {
          if (ri === r && ci === c) {
            return { ...cell, state: cell.state === "flagged" ? "hidden" : "flagged" };
          }
          return cell;
        })
      )
    );
  }, [started, gameOver, won, board]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: `repeat(${COLS}, 38px)`,
          gap: 3,
          padding: 12,
          background: "rgba(255,45,142,0.05)",
          border: "1px solid rgba(255,45,142,0.3)",
          borderRadius: 4,
        }}
      >
        {board.flat().map((cell, idx) => {
          const r = Math.floor(idx / COLS);
          const c = idx % COLS;
          const cellKey = `cell-${r}-${c}`;
          let content: string = "";
          let bg = "rgba(255,45,142,0.1)";
          let color = "#fff";
          let shadow = "none";

          if (cell.state === "revealed") {
            bg = "rgba(0,0,0,0.4)";
            if (cell.mine) {
              content = "💣";
              bg = "rgba(255,45,142,0.3)";
              shadow = "0 0 10px #ff2d8e";
            } else if (cell.adjacent > 0) {
              content = String(cell.adjacent);
              color = NUMBER_COLORS[cell.adjacent] || "#fff";
              shadow = `0 0 6px ${color}`;
            }
          } else if (cell.state === "flagged") {
            content = "🚩";
          }

          return (
            <button
              key={cellKey}
              type="button"
              onClick={() => handleClick(r, c)}
              onContextMenu={(e) => handleRightClick(e, r, c)}
              className="flex items-center justify-center font-orbitron font-bold transition-all"
              style={{
                width: 38,
                height: 38,
                fontSize: cell.adjacent > 0 ? 14 : 16,
                background: bg,
                color,
                boxShadow: shadow,
                border: cell.state === "revealed"
                  ? "1px solid rgba(255,255,255,0.05)"
                  : "1px solid rgba(255,45,142,0.35)",
                cursor: cell.state === "revealed" ? "default" : "pointer",
                borderRadius: 2,
              }}
            >
              {content}
            </button>
          );
        })}
      </div>

      {!started && (
        <button
          type="button"
          onClick={startGame}
          className="font-arcade text-xs px-6 py-3 transition-all"
          style={{
            color: "#ff2d8e",
            border: "1px solid #ff2d8e",
            boxShadow: "0 0 10px rgba(255,45,142,0.4)",
          }}
        >
          START GAME
        </button>
      )}

      {gameOver && (
        <div className="text-center">
          <p className="font-arcade text-xs mb-3" style={{ color: "#ff2d8e", textShadow: "0 0 10px #ff2d8e" }}>
            BOOM! GAME OVER 💥
          </p>
          <button
            type="button"
            onClick={startGame}
            className="font-arcade text-xs px-4 py-2 transition-all"
            style={{ color: "#ff2d8e", border: "1px solid #ff2d8e" }}
          >
            PLAY AGAIN
          </button>
        </div>
      )}

      {won && (
        <div className="text-center">
          <p className="font-arcade text-xs mb-3" style={{ color: "#39ff14", textShadow: "0 0 10px #39ff14" }}>
            YOU WIN! 🎉
          </p>
          <button
            type="button"
            onClick={startGame}
            className="font-arcade text-xs px-4 py-2 transition-all"
            style={{ color: "#39ff14", border: "1px solid #39ff14" }}
          >
            PLAY AGAIN
          </button>
        </div>
      )}

      <p className="font-mono-tech text-xs text-muted-foreground">
        Left click = reveal • Right click = flag
      </p>
    </div>
  );
}
