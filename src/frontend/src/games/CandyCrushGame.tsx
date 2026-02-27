import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const COLS = 8;
const ROWS = 8;
const CANDY_TYPES = 6;
const COLORS = ["#ff4444","#ff2d8e","#ff8c00","#39ff14","#00f5ff","#bf5fff"];
const SYMBOLS = ["●","■","▲","★","♦","♥"];
const TARGET_SCORE = 2000;

type Grid = (number | null)[][];

function makeGrid(): Grid {
  const g: Grid = [];
  for (let r = 0; r < ROWS; r++) {
    g.push([]);
    for (let c = 0; c < COLS; c++) {
      g[r].push(Math.floor(Math.random() * CANDY_TYPES));
    }
  }
  return g;
}

function findMatches(grid: Grid): Set<string> {
  const matched = new Set<string>();
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS - 2; c++) {
      const v = grid[r][c];
      if (v !== null && v === grid[r][c+1] && v === grid[r][c+2]) {
        matched.add(`${r},${c}`); matched.add(`${r},${c+1}`); matched.add(`${r},${c+2}`);
        if (c+3 < COLS && grid[r][c+3] === v) matched.add(`${r},${c+3}`);
        if (c+4 < COLS && grid[r][c+4] === v) matched.add(`${r},${c+4}`);
      }
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS - 2; r++) {
      const v = grid[r][c];
      if (v !== null && v === grid[r+1][c] && v === grid[r+2][c]) {
        matched.add(`${r},${c}`); matched.add(`${r+1},${c}`); matched.add(`${r+2},${c}`);
        if (r+3 < ROWS && grid[r+3][c] === v) matched.add(`${r+3},${c}`);
        if (r+4 < ROWS && grid[r+4][c] === v) matched.add(`${r+4},${c}`);
      }
    }
  }
  return matched;
}

function removeMatches(grid: Grid, matched: Set<string>): Grid {
  const ng = grid.map(r => [...r]);
  matched.forEach(key => {
    const [r, c] = key.split(",").map(Number);
    ng[r][c] = null;
  });
  return ng;
}

function gravity(grid: Grid): Grid {
  const ng = grid.map(r => [...r]);
  for (let c = 0; c < COLS; c++) {
    let writeR = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (ng[r][c] !== null) {
        ng[writeR][c] = ng[r][c];
        if (writeR !== r) ng[r][c] = null;
        writeR--;
      }
    }
    while (writeR >= 0) {
      ng[writeR][c] = Math.floor(Math.random() * CANDY_TYPES);
      writeR--;
    }
  }
  return ng;
}

function cascadeMatches(grid: Grid): { grid: Grid; points: number } {
  let g = grid;
  let total = 0;
  let multiplier = 1;
  while (true) {
    const matched = findMatches(g);
    if (matched.size === 0) break;
    total += matched.size * 10 * multiplier;
    multiplier++;
    g = gravity(removeMatches(g, matched));
  }
  return { grid: g, points: total };
}

export default function CandyCrushGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [grid, setGrid] = useState<Grid>(() => {
    const { grid: g } = cascadeMatches(makeGrid());
    return g;
  });
  const [selected, setSelected] = useState<[number,number] | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(30);

  const handleClick = useCallback((r: number, c: number) => {
    if (!isActive) return;

    if (!selected) {
      setSelected([r, c]);
      return;
    }

    const [sr, sc] = selected;
    if (sr === r && sc === c) { setSelected(null); return; }

    // Must be adjacent
    const isAdj = (Math.abs(sr - r) === 1 && sc === c) || (Math.abs(sc - c) === 1 && sr === r);
    if (!isAdj) { setSelected([r, c]); return; }

    // Swap
    const ng = grid.map(row => [...row]);
    [ng[sr][sc], ng[r][c]] = [ng[r][c], ng[sr][sc]];

    // Check for matches
    const { grid: final, points } = cascadeMatches(ng);
    if (points === 0) {
      // Swap back
      setSelected(null);
      return;
    }

    const newScore = score + points;
    const newMoves = moves - 1;
    setScore(newScore);
    setMoves(newMoves);
    onScoreUpdate(newScore);
    setGrid(final);
    setSelected(null);

    if (newScore >= TARGET_SCORE) {
      setTimeout(() => onGameOver(newScore), 500);
    } else if (newMoves <= 0) {
      setTimeout(() => onGameOver(newScore), 500);
    }
  }, [isActive, selected, grid, score, moves, onScoreUpdate, onGameOver]);

  const CELL_SIZE = 44;

  return (
    <div className="flex flex-col items-center gap-3 p-4">
      <div className="flex gap-6 font-arcade text-xs">
        <span style={{ color: "#ff2d8e" }}>SCORE: {score}/{TARGET_SCORE}</span>
        <span style={{ color: "#fff200" }}>MOVES: {moves}</span>
      </div>

      <div className="rounded overflow-hidden" style={{ border: "1px solid rgba(255,45,142,0.2)" }}>
        {grid.map((row, r) => (
          <div key={`candy-row-${r}`} className="flex">
            {row.map((cell, c) => {
              const isSelRow = selected?.[0] === r;
              const isSelCol = selected?.[1] === c;
              const isSel = isSelRow && isSelCol;
              return (
                <button
                  key={`candy-${r}-${c}`}
                  type="button"
                  onClick={() => handleClick(r, c)}
                  className="flex items-center justify-center transition-all duration-100"
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    background: isSel
                      ? `${COLORS[cell ?? 0]}44`
                      : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isSel ? COLORS[cell ?? 0] : "rgba(255,255,255,0.06)"}`,
                    transform: isSel ? "scale(1.1)" : "scale(1)",
                    boxShadow: isSel ? `0 0 12px ${COLORS[cell ?? 0]}88` : "none",
                    cursor: "pointer",
                  }}
                >
                  {cell !== null && (
                    <span
                      className="text-2xl select-none"
                      style={{
                        color: COLORS[cell],
                        textShadow: `0 0 8px ${COLORS[cell]}66`,
                        filter: isSel ? "brightness(1.4)" : "brightness(1)",
                      }}
                    >
                      {SYMBOLS[cell]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
        Click two adjacent candies to swap. Match 3+ to score!
      </p>
    </div>
  );
}
