import { useState, useCallback, useEffect } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

type Grid = (number | null)[][];

const TILE_COLORS: Record<number, { bg: string; text: string; glow: string }> = {
  2:    { bg: "#1e2a3a", text: "#8ab4c4", glow: "rgba(0,245,255,0.2)" },
  4:    { bg: "#1e3a2a", text: "#8ac48b", glow: "rgba(57,255,20,0.2)" },
  8:    { bg: "#3a2a1e", text: "#c4a08b", glow: "rgba(255,140,0,0.3)" },
  16:   { bg: "#3a1e2a", text: "#c48bab", glow: "rgba(255,45,142,0.3)" },
  32:   { bg: "#2a1e3a", text: "#ab8bc4", glow: "rgba(191,95,255,0.3)" },
  64:   { bg: "#1a2a4a", text: "#7ab4e4", glow: "rgba(0,180,255,0.4)" },
  128:  { bg: "#003333", text: "#00f5ff", glow: "rgba(0,245,255,0.6)" },
  256:  { bg: "#003300", text: "#39ff14", glow: "rgba(57,255,20,0.6)" },
  512:  { bg: "#330033", text: "#bf5fff", glow: "rgba(191,95,255,0.7)" },
  1024: { bg: "#333300", text: "#fff200", glow: "rgba(255,242,0,0.7)" },
  2048: { bg: "#330000", text: "#ff4444", glow: "rgba(255,68,68,0.9)" },
};

function initGrid(): Grid {
  const g: Grid = Array(4).fill(null).map(() => Array(4).fill(null));
  return addRandom(addRandom(g));
}

function addRandom(grid: Grid): Grid {
  const empty: [number, number][] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!grid[r][c]) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const ng = grid.map(row => [...row]);
  ng[r][c] = Math.random() < 0.9 ? 2 : 4;
  return ng;
}

function slideRow(row: (number | null)[]): { row: (number | null)[]; score: number } {
  const nums = row.filter(Boolean) as number[];
  let score = 0;
  const merged: number[] = [];
  let i = 0;
  while (i < nums.length) {
    if (i + 1 < nums.length && nums[i] === nums[i + 1]) {
      const val = nums[i] * 2;
      merged.push(val);
      score += val;
      i += 2;
    } else {
      merged.push(nums[i]);
      i++;
    }
  }
  while (merged.length < 4) merged.push(0);
  return { row: merged.map(v => v || null), score };
}

function move(grid: Grid, dir: string): { grid: Grid; score: number } {
  let g = grid.map(row => [...row]);
  let total = 0;

  const slide = (row: (number | null)[]) => slideRow(row);

  if (dir === "left") {
    g = g.map(row => { const { row: r, score } = slide(row); total += score; return r; });
  } else if (dir === "right") {
    g = g.map(row => { const { row: r, score } = slide([...row].reverse()); total += score; return r.reverse(); });
  } else if (dir === "up") {
    for (let c = 0; c < 4; c++) {
      const col = g.map(row => row[c]);
      const { row: r, score } = slide(col);
      total += score;
      r.forEach((v, ri) => { g[ri][c] = v; });
    }
  } else if (dir === "down") {
    for (let c = 0; c < 4; c++) {
      const col = g.map(row => row[c]).reverse();
      const { row: r, score } = slide(col);
      total += score;
      r.reverse().forEach((v, ri) => { g[ri][c] = v; });
    }
  }

  return { grid: g, score: total };
}

function hasValidMoves(grid: Grid): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!grid[r][c]) return true;
      if (c < 3 && grid[r][c] === grid[r][c + 1]) return true;
      if (r < 3 && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
}

export default function Game2048_3D({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [grid, setGrid] = useState<Grid>(initGrid);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [moveDir, setMoveDir] = useState<string | null>(null);

  const doMove = useCallback((dir: string) => {
    if (!isActive) return;
    setMoveDir(dir);
    setTimeout(() => setMoveDir(null), 200);

    setGrid(prev => {
      const { grid: ng, score: pts } = move(prev, dir);
      if (JSON.stringify(ng) === JSON.stringify(prev)) return prev;
      const final = addRandom(ng);
      setScore(s => {
        const ns = s + pts;
        setBest(b => Math.max(b, ns));
        onScoreUpdate(ns);
        if ([...final.flat()].some(v => v === 2048)) {
          setTimeout(() => onGameOver(ns), 500);
        } else if (!hasValidMoves(final)) {
          setTimeout(() => onGameOver(ns), 800);
        }
        return ns;
      });
      return final;
    });
  }, [isActive, onGameOver, onScoreUpdate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const dirs: Record<string, string> = {
        ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
        a: "left", d: "right", w: "up", s: "down",
      };
      if (dirs[e.key]) { e.preventDefault(); doMove(dirs[e.key]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [doMove]);

  // Tilt animation based on move direction
  useEffect(() => {
    if (!moveDir) { setTilt({ x: 0, y: 0 }); return; }
    if (moveDir === "left") setTilt({ x: 0, y: -8 });
    else if (moveDir === "right") setTilt({ x: 0, y: 8 });
    else if (moveDir === "up") setTilt({ x: -8, y: 0 });
    else if (moveDir === "down") setTilt({ x: 8, y: 0 });
  }, [moveDir]);

  const CELL = 80;
  const GAP = 6;

  return (
    <div className="flex flex-col items-center gap-5 p-4">
      <div className="flex gap-8">
        <div className="text-center">
          <div className="font-arcade text-[8px]" style={{ color: "rgba(255,255,255,0.4)" }}>SCORE</div>
          <div className="font-arcade text-lg" style={{ color: "#00f5ff", textShadow: "0 0 12px #00f5ff" }}>{score}</div>
        </div>
        <div className="text-center">
          <div className="font-arcade text-[8px]" style={{ color: "rgba(255,255,255,0.4)" }}>BEST</div>
          <div className="font-arcade text-lg" style={{ color: "#fff200" }}>{best}</div>
        </div>
      </div>

      {/* 3D tilting board */}
      <div
        style={{
          transform: `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: moveDir ? "transform 0.1s ease" : "transform 0.3s ease-out",
          transformStyle: "preserve-3d",
        }}
      >
        <div
          className="rounded-2xl p-2"
          style={{
            background: "#111122",
            border: "2px solid rgba(0,245,255,0.15)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(0,245,255,0.1)",
            display: "grid",
            gridTemplateColumns: `repeat(4, ${CELL}px)`,
            gap: GAP,
            padding: 10,
          }}
        >
          {grid.flat().map((cell, idx) => {
            const style = cell ? (TILE_COLORS[cell] || TILE_COLORS[2]) : null;
            return (
              <div
                key={`3d-cell-${idx}`}
                className="rounded-lg flex items-center justify-center font-arcade transition-all duration-150"
                style={{
                  width: CELL,
                  height: CELL,
                  background: style?.bg || "rgba(255,255,255,0.04)",
                  color: style?.text || "transparent",
                  boxShadow: style ? `0 0 15px ${style.glow}, inset 0 1px 0 rgba(255,255,255,0.1)` : "none",
                  border: style ? `1px solid ${style.glow}` : "1px solid rgba(255,255,255,0.05)",
                  fontSize: cell && cell >= 1000 ? 18 : cell && cell >= 100 ? 22 : 28,
                  fontWeight: "bold",
                  textShadow: style ? `0 0 10px ${style.text}` : "none",
                  transform: cell ? "translateZ(4px)" : "none",
                }}
              >
                {cell || ""}
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-1.5 items-center">
        <button
          type="button"
          onClick={() => doMove("up")}
          className="font-arcade text-sm w-12 h-12 rounded"
          style={{ background: "rgba(0,245,255,0.1)", color: "#00f5ff", border: "1px solid rgba(0,245,255,0.2)" }}
        >
          ↑
        </button>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => doMove("left")}
            className="font-arcade text-sm w-12 h-12 rounded"
            style={{ background: "rgba(0,245,255,0.1)", color: "#00f5ff", border: "1px solid rgba(0,245,255,0.2)" }}
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => doMove("down")}
            className="font-arcade text-sm w-12 h-12 rounded"
            style={{ background: "rgba(0,245,255,0.1)", color: "#00f5ff", border: "1px solid rgba(0,245,255,0.2)" }}
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => doMove("right")}
            className="font-arcade text-sm w-12 h-12 rounded"
            style={{ background: "rgba(0,245,255,0.1)", color: "#00f5ff", border: "1px solid rgba(0,245,255,0.2)" }}
          >
            →
          </button>
        </div>
      </div>

      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
        Arrow keys / swipe to slide tiles. Merge to reach 2048!
      </p>
    </div>
  );
}
