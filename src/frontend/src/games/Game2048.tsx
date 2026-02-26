import { useState, useEffect, useCallback, useRef } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

type Grid = (number | null)[][];

const TILE_COLORS: Record<number, { bg: string; text: string; glow: string }> = {
  2:    { bg: "#1a1a2e", text: "#e0e0e0", glow: "none" },
  4:    { bg: "#16213e", text: "#e0e0e0", glow: "none" },
  8:    { bg: "#0d3b6e", text: "#ffffff", glow: "0 0 8px #00f5ff" },
  16:   { bg: "#0a5c8a", text: "#ffffff", glow: "0 0 10px #00f5ff" },
  32:   { bg: "#39ff14", text: "#000000", glow: "0 0 12px #39ff14" },
  64:   { bg: "#2acc0d", text: "#000000", glow: "0 0 15px #39ff14" },
  128:  { bg: "#bf5fff", text: "#ffffff", glow: "0 0 15px #bf5fff" },
  256:  { bg: "#9b38d4", text: "#ffffff", glow: "0 0 20px #bf5fff" },
  512:  { bg: "#ff2d8e", text: "#ffffff", glow: "0 0 20px #ff2d8e" },
  1024: { bg: "#e0197a", text: "#ffffff", glow: "0 0 25px #ff2d8e" },
  2048: { bg: "#fff200", text: "#000000", glow: "0 0 30px #fff200" },
};

function createGrid(): Grid {
  let g: Grid = Array.from({ length: 4 }, () => Array(4).fill(null));
  g = addTile(g);
  g = addTile(g);
  return g;
}

function addTile(grid: Grid): Grid {
  const empty: [number, number][] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (!grid[r][c]) empty.push([r, c]);
    }
  }
  if (!empty.length) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const newGrid = grid.map((row) => [...row]);
  newGrid[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newGrid;
}

function moveLeft(grid: Grid): { grid: Grid; score: number; moved: boolean } {
  let score = 0;
  let moved = false;
  const newGrid = grid.map((row) => {
    const filtered = row.filter(Boolean) as number[];
    const merged: number[] = [];
    for (let i = 0; i < filtered.length; i++) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        const val = filtered[i] * 2;
        merged.push(val);
        score += val;
        i++;
      } else {
        merged.push(filtered[i]);
      }
    }
    const result = [...merged, ...Array(4 - merged.length).fill(null)];
    if (result.some((v, i) => v !== row[i])) moved = true;
    return result;
  });
  return { grid: newGrid, score, moved };
}

function rotateGrid(grid: Grid): Grid {
  return grid[0].map((_, i) => grid.map((row) => row[i]).reverse());
}

function applyMove(grid: Grid, dir: string): { grid: Grid; score: number; moved: boolean } {
  let g = grid;
  let rotations = 0;
  if (dir === "UP") rotations = 3;
  else if (dir === "RIGHT") rotations = 2;
  else if (dir === "DOWN") rotations = 1;

  for (let i = 0; i < rotations; i++) g = rotateGrid(g);
  const result = moveLeft(g);
  let ng = result.grid;
  const backRotations = (4 - rotations) % 4;
  for (let i = 0; i < backRotations; i++) ng = rotateGrid(ng);
  return { grid: ng, score: result.score, moved: result.moved };
}

function hasWon(grid: Grid): boolean {
  return grid.some((row) => row.some((v) => v === 2048));
}

function hasLost(grid: Grid): boolean {
  if (grid.some((row) => row.some((v) => !v))) return false;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const v = grid[r][c];
      if (c < 3 && grid[r][c + 1] === v) return false;
      if (r < 3 && grid[r + 1][c] === v) return false;
    }
  }
  return true;
}

export default function Game2048({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [grid, setGrid] = useState<Grid>(() => createGrid());
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);
  const [won, setWon] = useState(false);
  const [continued, setContinued] = useState(false);
  const touchStartRef = useRef({ startX: 0, startY: 0 });
  const continuedRef = useRef(false);

  const handleMove = useCallback((dir: string) => {
    if (!started) return;
    setGrid((prev) => {
      const { grid: newGrid, score: addScore, moved } = applyMove(prev, dir);
      if (!moved) return prev;
      const withTile = addTile(newGrid);
      setScore((s) => {
        const newScore = s + addScore;
        onScoreUpdate(newScore);
        return newScore;
      });
      if (!continuedRef.current && hasWon(withTile)) setWon(true);
      if (hasLost(withTile)) {
        setScore((s) => { onGameOver(s); return s; });
      }
      return withTile;
    });
  }, [started, onGameOver, onScoreUpdate]);

  const startGame = useCallback(() => {
    const g = createGrid();
    setGrid(g);
    setScore(0);
    setStarted(true);
    setWon(false);
    setContinued(false);
    continuedRef.current = false;
    onScoreUpdate(0);
  }, [onScoreUpdate]);

  useEffect(() => {
    if (!isActive) return;
    const handleKey = (e: KeyboardEvent) => {
      const dirMap: Record<string, string> = {
        ArrowLeft: "LEFT", ArrowRight: "RIGHT",
        ArrowUp: "UP", ArrowDown: "DOWN",
      };
      const dir = dirMap[e.key];
      if (dir) { handleMove(dir); e.preventDefault(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isActive, handleMove]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartRef.current.startX;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.startY;
    if (Math.abs(dx) > Math.abs(dy)) {
      handleMove(dx > 0 ? "RIGHT" : "LEFT");
    } else {
      handleMove(dy > 0 ? "DOWN" : "UP");
    }
  };

  const tiles = grid.flat();

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 72px)",
          gap: 8,
          padding: 12,
          borderRadius: 4,
          background: "rgba(0,245,255,0.05)",
          border: "1px solid rgba(0,245,255,0.2)",
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {tiles.map((val, idx) => {
          const r = Math.floor(idx / 4);
          const c = idx % 4;
          const tileKey = `tile-${r}-${c}`;
          const colors = val ? (TILE_COLORS[val] || { bg: "#fff200", text: "#000", glow: "0 0 30px #fff200" }) : null;
          return (
            <div
              key={tileKey}
              className="flex items-center justify-center font-orbitron font-bold rounded"
              style={{
                width: 72,
                height: 72,
                background: colors ? colors.bg : "rgba(255,255,255,0.04)",
                color: colors ? colors.text : "transparent",
                boxShadow: colors ? colors.glow : "none",
                fontSize: val ? (val >= 1000 ? 16 : val >= 100 ? 20 : 26) : 16,
                transition: "all 0.1s ease",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {val ?? ""}
            </div>
          );
        })}
      </div>

      {!started && (
        <button
          type="button"
          onClick={startGame}
          className="font-arcade text-xs px-6 py-3 hover:text-black transition-all"
          style={{
            color: "#fff200",
            border: "1px solid #fff200",
            boxShadow: "0 0 10px rgba(255,242,0,0.4)",
          }}
        >
          START GAME
        </button>
      )}

      {won && !continued && (
        <div className="text-center">
          <p className="font-arcade text-sm mb-3" style={{ color: "#fff200", textShadow: "0 0 20px #fff200" }}>
            YOU REACHED 2048! 🎉
          </p>
          <button
            type="button"
            onClick={() => { setContinued(true); continuedRef.current = true; }}
            className="font-arcade text-xs px-4 py-2 transition-all mr-2"
            style={{ color: "#fff200", border: "1px solid #fff200" }}
          >
            KEEP GOING
          </button>
          <button
            type="button"
            onClick={startGame}
            className="font-arcade text-xs text-muted-foreground border border-border px-4 py-2 hover:bg-muted transition-all"
          >
            NEW GAME
          </button>
        </div>
      )}
    </div>
  );
}
