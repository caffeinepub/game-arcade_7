import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const COLS = 8;
const ROWS = 8;
const TYPES = 5;
const JEWEL_COLORS = ["#ff4444", "#00f5ff", "#39ff14", "#bf5fff", "#fff200"];
const JEWEL_SYMBOLS = ["◆","●","▲","★","■"];

type Grid = number[][];

function makeGrid(): Grid {
  return Array(ROWS).fill(null).map(() =>
    Array(COLS).fill(null).map(() => Math.floor(Math.random() * TYPES))
  );
}

function getGroup(grid: Grid, startR: number, startC: number): [number,number][] {
  const target = grid[startR][startC];
  const visited = new Set<string>();
  const group: [number,number][] = [];
  const stack: [number,number][] = [[startR, startC]];
  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    if (grid[r][c] !== target) continue;
    visited.add(key);
    group.push([r, c]);
    stack.push([r-1,c],[r+1,c],[r,c-1],[r,c+1]);
  }
  return group;
}

function applyGravity(grid: Grid): Grid {
  const ng = grid.map(r => [...r]);
  for (let c = 0; c < COLS; c++) {
    let writeR = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (ng[r][c] !== -1) {
        ng[writeR][c] = ng[r][c];
        if (writeR !== r) ng[r][c] = -1;
        writeR--;
      }
    }
    while (writeR >= 0) {
      ng[writeR][c] = Math.floor(Math.random() * TYPES);
      writeR--;
    }
  }
  return ng;
}

export default function JewelQuestGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [grid, setGrid] = useState<Grid>(makeGrid);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(20);
  const [lastPoints, setLastPoints] = useState(0);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  const handleHover = useCallback((r: number, c: number) => {
    const group = getGroup(grid, r, c);
    if (group.length >= 2) {
      setHighlighted(new Set(group.map(([gr,gc]) => `${gr},${gc}`)));
    } else {
      setHighlighted(new Set());
    }
  }, [grid]);

  const handleClick = useCallback((r: number, c: number) => {
    if (!isActive) return;
    const group = getGroup(grid, r, c);
    if (group.length < 2) return;

    const ng = grid.map(row => [...row]);
    group.forEach(([gr, gc]) => { ng[gr][gc] = -1; });
    const final = applyGravity(ng);

    const pts = group.length * group.length * 10;
    const newScore = score + pts;
    const newMoves = moves - 1;
    setLastPoints(pts);
    setScore(newScore);
    setMoves(newMoves);
    setGrid(final);
    setHighlighted(new Set());
    onScoreUpdate(newScore);

    if (newScore >= 5000) {
      setTimeout(() => onGameOver(newScore), 500);
    } else if (newMoves <= 0) {
      setTimeout(() => onGameOver(newScore), 500);
    }
  }, [isActive, grid, score, moves, onScoreUpdate, onGameOver]);

  const CELL = 44;

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <div className="flex gap-6 font-arcade text-xs">
        <span style={{ color: "#bf5fff" }}>SCORE: {score}/5000</span>
        <span style={{ color: "#fff200" }}>MOVES: {moves}</span>
        {lastPoints > 0 && <span style={{ color: "#39ff14" }}>+{lastPoints}</span>}
      </div>

      <div className="rounded overflow-hidden" style={{ border: "1px solid rgba(191,95,255,0.2)" }}>
        {grid.map((row, r) => (
          <div key={`jq-row-${r}`} className="flex">
            {row.map((cell, c) => {
              const key = `${r},${c}`;
              const isHigh = highlighted.has(key);
              const col = JEWEL_COLORS[cell] || "#666";
              return (
                <button
                  key={`jq-${r}-${c}`}
                  type="button"
                  onClick={() => handleClick(r, c)}
                  onMouseEnter={() => handleHover(r, c)}
                  onMouseLeave={() => setHighlighted(new Set())}
                  className="flex items-center justify-center transition-all duration-100"
                  style={{
                    width: CELL,
                    height: CELL,
                    background: isHigh ? `${col}22` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isHigh ? col : "rgba(255,255,255,0.06)"}`,
                    transform: isHigh ? "scale(1.05)" : "scale(1)",
                    cursor: "pointer",
                  }}
                >
                  <span
                    className="text-2xl select-none"
                    style={{
                      color: col,
                      textShadow: isHigh ? `0 0 10px ${col}` : `0 0 4px ${col}44`,
                    }}
                  >
                    {JEWEL_SYMBOLS[cell] || "?"}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
        Click groups of 2+ matching jewels to remove them. Bigger groups = more points!
      </p>
    </div>
  );
}
