import { useState, useEffect, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

type Cell = "wall" | "floor" | "target" | "box" | "boxOnTarget" | "player" | "playerOnTarget";

interface Level {
  grid: Cell[][];
  moves: number;
}

const LEVELS: string[][] = [
  [
    "########",
    "#  . . #",
    "# $$ . #",
    "#  @   #",
    "#      #",
    "########",
  ],
  [
    "##########",
    "#        #",
    "# $$ .. .#",
    "#  @     #",
    "#  .$ .  #",
    "#        #",
    "##########",
  ],
  [
    "##########",
    "#   #    #",
    "#  $.$   #",
    "# $  $.  #",
    "#  .@.   #",
    "#   ..   #",
    "#        #",
    "##########",
  ],
];

function parseLevel(lines: string[]): Cell[][] {
  return lines.map(line =>
    line.split("").map(ch => {
      switch (ch) {
        case "#": return "wall";
        case ".": return "target";
        case "$": return "box";
        case "*": return "boxOnTarget";
        case "@": return "player";
        case "+": return "playerOnTarget";
        default: return "floor";
      }
    })
  );
}

interface GameState {
  grid: Cell[][];
  playerR: number;
  playerC: number;
  moves: number;
}

function findPlayer(grid: Cell[][]): { r: number; c: number } {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] === "player" || grid[r][c] === "playerOnTarget") return { r, c };
    }
  }
  return { r: 0, c: 0 };
}

function initLevel(levelIdx: number): GameState {
  const grid = parseLevel(LEVELS[levelIdx]);
  const pos = findPlayer(grid);
  return { grid, playerR: pos.r, playerC: pos.c, moves: 0 };
}

function isWin(grid: Cell[][]): boolean {
  return !grid.some(row => row.includes("box"));
}

function movePlayer(state: GameState, dr: number, dc: number): GameState {
  const { grid, playerR, playerC } = state;
  const nr = playerR + dr;
  const nc = playerC + dc;
  if (nr < 0 || nr >= grid.length || nc < 0 || nc >= grid[0].length) return state;

  const target = grid[nr][nc];
  if (target === "wall") return state;

  const newGrid = grid.map(row => [...row]);
  const isBox = target === "box" || target === "boxOnTarget";

  if (isBox) {
    const br = nr + dr;
    const bc = nc + dc;
    if (br < 0 || br >= grid.length || bc < 0 || bc >= grid[0].length) return state;
    const behindBox = grid[br][bc];
    if (behindBox === "wall" || behindBox === "box" || behindBox === "boxOnTarget") return state;
    newGrid[br][bc] = behindBox === "target" ? "boxOnTarget" : "box";
  }

  const playerCurrentlyOnTarget = grid[playerR][playerC] === "playerOnTarget";
  newGrid[playerR][playerC] = playerCurrentlyOnTarget ? "target" : "floor";
  const destIsTarget = target === "target" || target === "boxOnTarget";
  newGrid[nr][nc] = destIsTarget ? "playerOnTarget" : "player";

  return { grid: newGrid, playerR: nr, playerC: nc, moves: state.moves + 1 };
}

const CELL_COLORS: Partial<Record<Cell, string>> = {
  wall: "#1a1a2e",
  floor: "#0a0a0f",
  target: "#0a0a0f",
  box: "#bf5fff",
  boxOnTarget: "#39ff14",
  player: "#00f5ff",
  playerOnTarget: "#00f5ff",
};

export default function SokobanGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [levelIdx, setLevelIdx] = useState(0);
  const [state, setState] = useState<GameState>(() => initLevel(0));
  const [totalMoves, setTotalMoves] = useState(0);

  const handleMove = useCallback((dr: number, dc: number) => {
    if (!isActive) return;
    setState(prev => {
      const next = movePlayer(prev, dr, dc);
      if (next !== prev) {
        if (isWin(next.grid)) {
          const newTotal = totalMoves + next.moves;
          setTotalMoves(newTotal);
          const score = Math.max(0, 1000 - newTotal * 5);
          onScoreUpdate(score);
          if (levelIdx < LEVELS.length - 1) {
            setTimeout(() => {
              setLevelIdx(l => l + 1);
              setState(initLevel(levelIdx + 1));
            }, 800);
          } else {
            setTimeout(() => onGameOver(score), 1000);
          }
        }
      }
      return next;
    });
  }, [isActive, totalMoves, levelIdx, onGameOver, onScoreUpdate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const dirs: Record<string, [number, number]> = {
        ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
        w: [-1, 0], s: [1, 0], a: [0, -1], d: [0, 1],
      };
      const dir = dirs[e.key];
      if (dir) { e.preventDefault(); handleMove(dir[0], dir[1]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleMove]);

  const grid = state.grid;
  const boxCount = grid.flat().filter(c => c === "box").length;
  const doneCount = grid.flat().filter(c => c === "boxOnTarget").length;
  const total = boxCount + doneCount;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex gap-6 font-arcade text-xs">
        <span style={{ color: "#00f5ff" }}>LEVEL {levelIdx + 1}/{LEVELS.length}</span>
        <span style={{ color: "#fff200" }}>MOVES: {state.moves}</span>
        <span style={{ color: "#39ff14" }}>BOXES: {doneCount}/{total}</span>
      </div>

      <div className="border" style={{ borderColor: "rgba(0,245,255,0.2)" }}>
        {grid.map((row, r) => (
          <div key={`sokoban-r-${r}`} className="flex">
            {row.map((cell, c) => (
              <div
                key={`sokoban-${r}-${c}`}
                className="flex items-center justify-center text-lg"
                style={{
                  width: 40,
                  height: 40,
                  background: CELL_COLORS[cell] || "#0a0a0f",
                  border: "1px solid rgba(255,255,255,0.05)",
                  boxShadow: cell === "player" || cell === "playerOnTarget"
                    ? "0 0 10px #00f5ff66"
                    : cell === "boxOnTarget"
                    ? "0 0 8px #39ff1466"
                    : "none",
                }}
              >
                {cell === "wall" && <span style={{ color: "#3a3a5c" }}>█</span>}
                {cell === "target" && <span style={{ color: "rgba(191,95,255,0.5)", fontSize: 20 }}>×</span>}
                {cell === "box" && <span style={{ color: "#bf5fff", fontSize: 20 }}>□</span>}
                {cell === "boxOnTarget" && <span style={{ color: "#39ff14", fontSize: 20 }}>■</span>}
                {(cell === "player" || cell === "playerOnTarget") && (
                  <span style={{ color: "#00f5ff", fontSize: 18 }}>◉</span>
                )}
                {cell === "playerOnTarget" && <span style={{ color: "rgba(191,95,255,0.5)", position: "absolute", fontSize: 8 }}>×</span>}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setState(initLevel(levelIdx))}
          className="font-arcade text-[9px] px-3 py-2 rounded"
          style={{ background: "rgba(255,68,68,0.15)", color: "#ff4444", border: "1px solid rgba(255,68,68,0.3)" }}
        >
          RESET
        </button>
      </div>

      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
        Arrow keys / WASD to move. Push boxes onto × targets.
      </p>
    </div>
  );
}
