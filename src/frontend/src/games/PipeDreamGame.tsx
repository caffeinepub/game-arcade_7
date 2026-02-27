import { useState, useCallback, useEffect, useRef } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const COLS = 9;
const ROWS = 7;
type PipeType = "empty" | "LR" | "UD" | "LU" | "LD" | "RU" | "RD" | "cross";

// Directions: L=left, R=right, U=up, D=down
const PIPE_CONNECTIONS: Record<PipeType, string[]> = {
  empty: [],
  LR: ["L","R"],
  UD: ["U","D"],
  LU: ["L","U"],
  LD: ["L","D"],
  RU: ["R","U"],
  RD: ["R","D"],
  cross: ["L","R","U","D"],
};

const PIPE_SYMBOLS: Record<PipeType, string> = {
  empty: "·",
  LR: "─",
  UD: "│",
  LU: "┘",
  LD: "┐",
  RU: "└",
  RD: "┌",
  cross: "┼",
};

const PIPE_TYPES: PipeType[] = ["LR","UD","LU","LD","RU","RD"];

function randomPipe(): PipeType {
  return PIPE_TYPES[Math.floor(Math.random() * PIPE_TYPES.length)];
}

function getQueue(): PipeType[] {
  return Array(5).fill(null).map(randomPipe);
}

type Grid = PipeType[][];

function initGrid(): Grid {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill("empty" as PipeType));
}

function oppositeDir(dir: string): string {
  if (dir === "L") return "R";
  if (dir === "R") return "L";
  if (dir === "U") return "D";
  return "U";
}

function countFlow(grid: Grid, startR: number, startC: number, startDir: string): number {
  let count = 0;
  let r = startR, c = startC;
  let fromDir = startDir;

  while (true) {
    const pipe = grid[r][c];
    const conns = PIPE_CONNECTIONS[pipe];
    if (!conns.includes(fromDir)) break;

    count++;
    // Find exit direction (not fromDir)
    const exitDir = conns.find(d => d !== fromDir);
    if (!exitDir) break;

    // Move in exitDir
    const dr: Record<string, number> = { U: -1, D: 1, L: 0, R: 0 };
    const dc: Record<string, number> = { U: 0, D: 0, L: -1, R: 1 };
    r += dr[exitDir];
    c += dc[exitDir];
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
    fromDir = oppositeDir(exitDir);
  }
  return count;
}

export default function PipeDreamGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [grid, setGrid] = useState<Grid>(initGrid);
  const [queue, setQueue] = useState<PipeType[]>(getQueue);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [flowing, setFlowing] = useState(false);
  const [flowCount, setFlowCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start = middle-left
  const startR = Math.floor(ROWS / 2);
  const startC = 0;
  const startDir = "R";

  const placePipe = useCallback((r: number, c: number) => {
    if (!isActive || flowing) return;
    if (grid[r][c] !== "empty") return;
    const next = queue[0];
    if (!next) return;

    setGrid(prev => {
      const ng = prev.map(row => [...row]);
      ng[r][c] = next;
      return ng;
    });
    setQueue(prev => {
      const nq = [...prev.slice(1), randomPipe()];
      return nq;
    });
  }, [isActive, flowing, grid, queue]);

  const startFlow = useCallback(() => {
    if (flowing) return;
    setFlowing(true);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [flowing]);

  useEffect(() => {
    if (flowing) {
      const count = countFlow(grid, startR, startC, startDir);
      setFlowCount(count);
      const newScore = count * 50;
      setScore(newScore);
      onScoreUpdate(newScore);
      setTimeout(() => onGameOver(newScore), 1000);
    }
  }, [flowing, grid, startR, onScoreUpdate, onGameOver]);

  useEffect(() => {
    if (!isActive || flowing) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          startFlow();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, flowing, startFlow]);

  const CELL = 48;

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <div className="flex gap-6 font-arcade text-xs">
        <span style={{ color: "#39ff14" }}>PIPE DREAM</span>
        <span style={{ color: timeLeft < 10 ? "#ff4444" : "#fff200" }}>TIME: {timeLeft}s</span>
        <span style={{ color: "#00f5ff" }}>SCORE: {score}</span>
      </div>

      {/* Queue */}
      <div className="flex gap-2 items-center">
        <span className="font-arcade text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>NEXT:</span>
        {queue.map((pipe, i) => (
          <div
            key={`queue-${i}`}
            className="flex items-center justify-center rounded"
            style={{
              width: 32,
              height: 32,
              background: i === 0 ? "rgba(57,255,20,0.2)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${i === 0 ? "rgba(57,255,20,0.5)" : "rgba(255,255,255,0.1)"}`,
              color: i === 0 ? "#39ff14" : "rgba(255,255,255,0.5)",
              fontSize: 20,
              fontFamily: "monospace",
            }}
          >
            {PIPE_SYMBOLS[pipe]}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="rounded overflow-hidden" style={{ border: "1px solid rgba(57,255,20,0.2)" }}>
        {grid.map((row, r) => (
          <div key={`pipe-row-${r}`} className="flex">
            {row.map((cell, c) => {
              const isStart = r === startR && c === 0;
              void flowing;
              return (
                <button
                  key={`pipe-${r}-${c}`}
                  type="button"
                  onClick={() => placePipe(r, c)}
                  className="flex items-center justify-center transition-colors"
                  style={{
                    width: CELL,
                    height: CELL,
                    background: isStart ? "rgba(255,242,0,0.15)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isStart ? "rgba(255,242,0,0.3)" : "rgba(255,255,255,0.06)"}`,
                    color: cell !== "empty" ? "#39ff14" : "rgba(255,255,255,0.15)",
                    fontSize: 26,
                    fontFamily: "monospace",
                    cursor: cell === "empty" && !flowing ? "pointer" : "default",
                    textShadow: cell !== "empty" ? "0 0 8px #39ff1466" : "none",
                  }}
                >
                  {isStart && cell === "empty" ? "★" : PIPE_SYMBOLS[cell]}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={startFlow}
        disabled={flowing}
        className="font-arcade text-[10px] px-4 py-2 rounded"
        style={{
          background: !flowing ? "rgba(57,255,20,0.15)" : "rgba(255,255,255,0.05)",
          color: !flowing ? "#39ff14" : "rgba(255,255,255,0.3)",
          border: `1px solid ${!flowing ? "rgba(57,255,20,0.4)" : "rgba(255,255,255,0.1)"}`,
        }}
      >
        {flowing ? `FLOWING — ${flowCount} PIPES` : "START FLOW EARLY"}
      </button>

      <p className="font-mono-tech text-xs text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
        Click cells to place pipes from the queue. Connect the flow from ★ before time runs out!
      </p>
    </div>
  );
}
