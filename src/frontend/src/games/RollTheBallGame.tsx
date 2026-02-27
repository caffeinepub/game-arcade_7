import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

// Pipe types: each has connections [top, right, bottom, left]
type PipeType = "empty" | "LR" | "UD" | "LU" | "LD" | "RU" | "RD" | "source" | "target";

const CONNECTIONS: Record<PipeType, boolean[]> = {
  // [top, right, bottom, left]
  empty:  [false, false, false, false],
  LR:    [false, true, false, true],
  UD:    [true, false, true, false],
  LU:    [true, false, false, true],
  LD:    [false, false, true, true],
  RU:    [true, true, false, false],
  RD:    [false, true, true, false],
  source: [false, true, false, false], // exits right
  target: [false, false, false, true], // enters from left
};

const SYMBOLS: Record<PipeType, string> = {
  empty: "·", LR: "─", UD: "│", LU: "┘", LD: "┐", RU: "└", RD: "┌",
  source: "●", target: "⊙",
};

// Sliding: non-fixed pipes can slide into adjacent empty cells
interface Level {
  grid: PipeType[][];
  fixed: boolean[][];
  rows: number;
  cols: number;
}

const LEVELS: Level[] = [
  {
    rows: 5, cols: 5,
    grid: [
      ["empty","empty","empty","empty","empty"],
      ["empty","LR","LR","LR","empty"],
      ["source","empty","empty","empty","target"],
      ["empty","LU","UD","RU","empty"],
      ["empty","empty","empty","empty","empty"],
    ],
    fixed: [
      [false,false,false,false,false],
      [false,false,false,false,false],
      [true,false,false,false,true],
      [false,true,true,true,false],
      [false,false,false,false,false],
    ],
  },
  {
    rows: 5, cols: 6,
    grid: [
      ["empty","RD","empty","empty","empty","empty"],
      ["source","LR","RD","empty","empty","empty"],
      ["empty","empty","LD","RD","empty","empty"],
      ["empty","empty","empty","LD","RD","empty"],
      ["empty","empty","empty","empty","LR","target"],
    ],
    fixed: [
      [false,true,false,false,false,false],
      [true,false,true,false,false,false],
      [false,false,true,true,false,false],
      [false,false,false,true,true,false],
      [false,false,false,false,false,true],
    ],
  },
];

function checkSolved(grid: PipeType[][], rows: number, cols: number): boolean {
  // Find source cell
  let sr = -1, sc = -1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === "source") { sr = r; sc = c; }
    }
  }
  if (sr === -1) return false;

  // Trace path from source
  let r = sr, c = sc;
  let fromDir = 3; // entering from left
  const visited = new Set<string>();

  while (true) {
    const key = `${r},${c}`;
    if (visited.has(key)) return false;
    visited.add(key);

    const pipe = grid[r][c];
    if (pipe === "target") return true;

    const conns = CONNECTIONS[pipe];
    // Find exit (not fromDir)
    let exitDir = -1;
    for (let d = 0; d < 4; d++) {
      if (d !== fromDir && conns[d]) exitDir = d;
    }
    if (exitDir === -1) return false;

    // Move: 0=top,1=right,2=bottom,3=left
    const dr = [-1, 0, 1, 0];
    const dc = [0, 1, 0, -1];
    const nr = r + dr[exitDir], nc = c + dc[exitDir];
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return false;

    const opposite = [2, 3, 0, 1];
    fromDir = opposite[exitDir];
    r = nr; c = nc;

    if (!CONNECTIONS[grid[r][c]][fromDir]) return false;
  }
}

export default function RollTheBallGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [levelIdx, setLevelIdx] = useState(0);
  const [grid, setGrid] = useState<PipeType[][]>(() => LEVELS[0].grid.map(row => [...row]));
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(false);
  const [selected, setSelected] = useState<[number,number] | null>(null);

  const level = LEVELS[levelIdx];

  const handleCellClick = useCallback((r: number, c: number) => {
    if (!isActive || solved) return;
    const isFixed = level.fixed[r][c];

    if (selected) {
      const [sr, sc] = selected;
      // Try to swap if one of them is empty
      const canSwap = !level.fixed[r][c] && !level.fixed[sr][sc] &&
        (grid[r][c] === "empty" || grid[sr][sc] === "empty");

      if (canSwap && Math.abs(sr - r) + Math.abs(sc - c) === 1) {
        const newGrid = grid.map(row => [...row]);
        [newGrid[r][c], newGrid[sr][sc]] = [newGrid[sr][sc], newGrid[r][c]];
        setGrid(newGrid);
        setSelected(null);

        if (checkSolved(newGrid, level.rows, level.cols)) {
          const newScore = score + (levelIdx + 1) * 500;
          setScore(newScore);
          setSolved(true);
          onScoreUpdate(newScore);
          if (levelIdx < LEVELS.length - 1) {
            setTimeout(() => {
              setLevelIdx(i => i + 1);
              setGrid(LEVELS[levelIdx + 1].grid.map(row => [...row]));
              setSolved(false);
            }, 1200);
          } else {
            setTimeout(() => onGameOver(newScore), 1200);
          }
        }
        return;
      }
      setSelected(null);
    }

    if (!isFixed && grid[r][c] !== "empty") {
      setSelected([r, c]);
    }
  }, [isActive, solved, selected, grid, level, levelIdx, score, onScoreUpdate, onGameOver]);

  const CELL = 64;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex gap-5 font-arcade text-xs">
        <span style={{ color: "#ff2d8e" }}>ROLL THE BALL</span>
        <span style={{ color: "#00f5ff" }}>LEVEL {levelIdx + 1}/{LEVELS.length}</span>
        <span style={{ color: "#39ff14" }}>SCORE: {score}</span>
      </div>

      <div className="rounded overflow-hidden" style={{ border: "1px solid rgba(255,45,142,0.2)" }}>
        {grid.map((row, r) => (
          <div key={`rtb-row-${r}`} className="flex">
            {row.map((cell, c) => {
              const isFixed = level.fixed[r][c];
              const isSel = selected?.[0] === r && selected?.[1] === c;
              const isSource = cell === "source";
              const isTarget = cell === "target";
              const col = isSource ? "#39ff14" : isTarget ? "#ff2d8e" : cell !== "empty" ? "#00f5ff" : "rgba(255,255,255,0.1)";

              return (
                <button
                  key={`rtb-${r}-${c}`}
                  type="button"
                  onClick={() => handleCellClick(r, c)}
                  className="flex items-center justify-center transition-all"
                  style={{
                    width: CELL,
                    height: CELL,
                    background: isSource ? "rgba(57,255,20,0.1)" :
                      isTarget ? "rgba(255,45,142,0.1)" :
                      isSel ? "rgba(0,245,255,0.15)" :
                      isFixed && cell !== "empty" ? "rgba(255,255,255,0.06)" :
                      "rgba(255,255,255,0.02)",
                    border: `1px solid ${isSel ? "#00f5ff" : "rgba(255,255,255,0.08)"}`,
                    boxShadow: isSel ? "0 0 10px #00f5ff66" : "none",
                    cursor: !isFixed && cell !== "empty" ? "pointer" : "default",
                  }}
                >
                  <span
                    className="font-mono text-2xl select-none"
                    style={{
                      color: col,
                      textShadow: `0 0 8px ${col}66`,
                      opacity: cell === "empty" ? 0.2 : 1,
                    }}
                  >
                    {SYMBOLS[cell]}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {solved && (
        <div className="font-arcade text-sm" style={{ color: "#39ff14", textShadow: "0 0 12px #39ff14" }}>
          PATH CONNECTED! 🎉
        </div>
      )}

      <p className="font-mono-tech text-xs text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
        Click a pipe to select it, click an adjacent empty cell to slide it. Connect ● to ⊙!
      </p>
    </div>
  );
}
