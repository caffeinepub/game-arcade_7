import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const COLS = 12, ROWS = 10;
const NUM_COLORS = 4;
const COLORS = ["#ff4444","#00f5ff","#39ff14","#fff200"];

function createGrid(): number[][] {
  return Array(ROWS).fill(null).map(() => Array(COLS).fill(null).map(() => Math.floor(Math.random() * NUM_COLORS)));
}

function getGroup(grid: number[][], r: number, c: number): [number,number][] {
  const color = grid[r][c];
  if (color < 0) return [];
  const visited = new Set<string>();
  const queue: [number,number][] = [[r, c]];
  const group: [number,number][] = [];
  while (queue.length > 0) {
    const [cr, cc] = queue.pop()!;
    const key = `${cr},${cc}`;
    if (visited.has(key)) continue;
    visited.add(key);
    group.push([cr, cc]);
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr=cr+dr, nc=cc+dc;
      if (nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&grid[nr][nc]===color&&!visited.has(`${nr},${nc}`)) queue.push([nr,nc]);
    }
  }
  return group;
}

function applyRemove(grid: number[][], group: [number,number][]): number[][] {
  const ng = grid.map(r => [...r]);
  for (const [r,c] of group) ng[r][c] = -1;
  // Gravity: drop cells down
  for (let c = 0; c < COLS; c++) {
    const col = ng.map(row => row[c]).filter(v => v >= 0);
    const pad = Array(ROWS - col.length).fill(-1);
    for (let r = 0; r < ROWS; r++) ng[r][c] = [...pad, ...col][r];
  }
  // Shift empty columns left
  const validCols: number[][] = [];
  for (let c = 0; c < COLS; c++) {
    if (ng.some(row => row[c] >= 0)) validCols.push(ng.map(row => row[c]));
  }
  while (validCols.length < COLS) validCols.push(Array(ROWS).fill(-1));
  return ng.map((row, r) => validCols.map(col => col[r]));
}

export default function SameGameGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [grid, setGrid] = useState<number[][]>(() => createGrid());
  const [hovered, setHovered] = useState<[number,number]|null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const hoveredGroup = hovered && grid[hovered[0]][hovered[0]] >= 0 ? getGroup(grid, hovered[0], hovered[1]) : [];
  const hoveredSet = new Set(hoveredGroup.map(([r,c]) => `${r},${c}`));

  const handleClick = useCallback((r: number, c: number) => {
    if (!isActive || gameOver || grid[r][c] < 0) return;
    const group = getGroup(grid, r, c);
    if (group.length < 2) return;
    const pts = Math.pow(group.length - 2, 2);
    const ng = applyRemove(grid, group);
    const newScore = score + pts;
    setGrid(ng); setScore(newScore); onScoreUpdate(newScore); setHovered(null);

    const remaining = ng.flat().filter(v => v >= 0).length;
    const hasGroups = ng.some((row, ri) => row.some((v, ci) => v >= 0 && getGroup(ng, ri, ci).length >= 2));
    if (remaining === 0) { setGameOver(true); onGameOver(newScore + 1000); }
    else if (!hasGroups) { setGameOver(true); onGameOver(newScore); }
  }, [grid, score, isActive, gameOver, onGameOver, onScoreUpdate]);

  const reset = () => { setGrid(createGrid()); setScore(0); setGameOver(false); setHovered(null); };
  const CELL = 44;

  const remaining = grid.flat().filter(v => v >= 0).length;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="flex gap-6 items-center">
        <span className="font-arcade text-xs" style={{ color: "#00f5ff" }}>Score: {score}</span>
        <span className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Left: {remaining}</span>
        {hoveredGroup.length >= 2 && <span className="font-arcade text-[10px]" style={{ color: "#fff200" }}>Group: {hoveredGroup.length} → +{Math.pow(hoveredGroup.length-2,2)}</span>}
      </div>

      <div style={{ background: "rgba(0,0,0,0.4)", border: "2px solid rgba(0,245,255,0.2)", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, ${CELL}px)` }}>
          {grid.map((row, r) => row.map((cell, c) => {
            const inGroup = hoveredSet.has(`${r},${c}`);
            const groupSize = hoveredGroup.length;
            return (
              <button type="button" key={`sg-r${r}c${c}`}
                onClick={() => cell >= 0 && handleClick(r, c)}
                onMouseEnter={() => cell >= 0 && setHovered([r, c])}
                onMouseLeave={() => setHovered(null)}
                style={{
                  width: CELL, height: CELL, padding: 0,
                  background: cell < 0 ? "rgba(0,0,0,0.6)" : inGroup && groupSize >= 2 ? COLORS[cell] : `${COLORS[cell]}88`,
                  border: inGroup && groupSize >= 2 ? `2px solid ${COLORS[cell]}` : "1px solid rgba(0,0,0,0.3)",
                  cursor: cell >= 0 ? "pointer" : "default",
                  transform: inGroup && groupSize >= 2 ? "scale(0.92)" : "scale(1)",
                  transition: "all 0.1s",
                  boxShadow: inGroup && groupSize >= 2 ? `0 0 12px ${COLORS[cell]}` : "none",
                }}>
              </button>
            );
          }))}
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={reset} className="font-arcade text-[9px] px-3 py-1 rounded" style={{ background: "transparent", color: "#39ff14", border: "1px solid #39ff14" }}>NEW</button>
      </div>
      {gameOver && <div className="font-arcade text-sm" style={{ color: remaining === 0 ? "#39ff14" : "#ff4444" }}>{remaining === 0 ? "CLEARED! 🎉" : "NO MORE MOVES"}</div>}
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Click groups of 2+ same-colored tiles • Hover to preview</p>
    </div>
  );
}
