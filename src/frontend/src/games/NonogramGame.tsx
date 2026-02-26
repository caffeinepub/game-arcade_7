import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const SIZE = 10;

// Predefined puzzles
const PUZZLES = [
  {
    name: "Heart",
    solution: [
      [0,1,1,0,0,0,1,1,0,0],
      [1,1,1,1,0,1,1,1,1,0],
      [1,1,1,1,1,1,1,1,1,0],
      [1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,0,0],
      [0,0,1,1,1,1,1,0,0,0],
      [0,0,0,1,1,1,0,0,0,0],
      [0,0,0,0,1,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0],
    ],
  },
];

function getClues(line: number[]): number[] {
  const clues: number[] = [];
  let count = 0;
  for (const v of line) {
    if (v) count++;
    else if (count > 0) { clues.push(count); count = 0; }
  }
  if (count > 0) clues.push(count);
  return clues.length > 0 ? clues : [0];
}

type CellState = 0 | 1 | 2; // 0=empty, 1=filled, 2=crossed

export default function NonogramGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [puzzleIdx] = useState(0);
  const puzzle = PUZZLES[puzzleIdx];
  const [grid, setGrid] = useState<CellState[][]>(() => Array(SIZE).fill(null).map(() => Array(SIZE).fill(0)));
  const [gameOver, setGameOver] = useState(false);

  const rowClues = puzzle.solution.map(row => getClues(row));
  const colClues = puzzle.solution[0].map((_, c) => getClues(puzzle.solution.map(r => r[c])));

  const handleClick = useCallback((r: number, c: number, right: boolean) => {
    if (!isActive || gameOver) return;
    setGrid(prev => {
      const ng = prev.map(row => [...row]) as CellState[][];
      if (right) ng[r][c] = ng[r][c] === 2 ? 0 : 2;
      else ng[r][c] = ng[r][c] === 1 ? 0 : 1;

      // Check if solved
      const correct = ng.every((row, ri) => row.every((v, ci) => (v === 1) === (puzzle.solution[ri][ci] === 1)));
      if (correct) {
        const filled = ng.flat().filter(v => v === 1).length;
        setGameOver(true);
        onGameOver(filled);
      } else {
        const filled = ng.flat().filter(v => v === 1 && puzzle.solution[Math.floor(ng.flat().indexOf(v) / SIZE)][ng.flat().indexOf(v) % SIZE] === 1).length;
        onScoreUpdate(filled);
      }
      return ng;
    });
  }, [isActive, gameOver, puzzle, onGameOver, onScoreUpdate]);

  const reset = () => { setGrid(Array(SIZE).fill(null).map(() => Array(SIZE).fill(0))); setGameOver(false); };
  const CELL = 32;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="font-arcade text-[10px]" style={{ color: "#39ff14" }}>NONOGRAM — {puzzle.name}</div>

      <div style={{ display: "flex" }}>
        {/* Top-left corner */}
        <div style={{ width: 60, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          {rowClues.map((_, ri) => <div key={`rc-space-${ri}`} style={{ height: CELL }} />)}
        </div>

        <div>
          {/* Column clues */}
          <div style={{ display: "flex" }}>
            {colClues.map((clue, ci) => (
              <div key={`cc-${ci}`} style={{ width: CELL, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 2 }}>
                {clue.map((n, ni) => (
                  <span key={`cc-${ci}-${ni}`} className="font-arcade" style={{ fontSize: 9, color: "#00f5ff", lineHeight: 1.3 }}>{n}</span>
                ))}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${SIZE}, ${CELL}px)` }}>
            {grid.map((row, r) => row.map((cell, c) => {
              const isSol = puzzle.solution[r][c] === 1;
              const isCorrect = cell === 1 && isSol;
              const isWrong = cell === 1 && !isSol;
              return (
                <button type="button" key={`ng-${r}-${c}`}
                  onClick={() => handleClick(r, c, false)}
                  onContextMenu={(e) => { e.preventDefault(); handleClick(r, c, true); }}
                  style={{
                    width: CELL, height: CELL, padding: 0, cursor: "pointer",
                    background: cell === 1 ? (gameOver && isWrong ? "rgba(255,68,68,0.4)" : "rgba(57,255,20,0.3)") : cell === 2 ? "rgba(255,68,68,0.1)" : "rgba(0,0,0,0.3)",
                    border: `1px solid ${(r % 5 === 4 || r === SIZE-1) && (c % 5 === 4 || c === SIZE-1) ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}`,
                    borderRight: c % 5 === 4 ? "2px solid rgba(57,255,20,0.3)" : "1px solid rgba(255,255,255,0.06)",
                    borderBottom: r % 5 === 4 ? "2px solid rgba(57,255,20,0.3)" : "1px solid rgba(255,255,255,0.06)",
                    fontSize: 14, color: cell === 2 ? "#ff4444" : "transparent",
                  }}>
                  {cell === 2 ? "×" : ""}
                </button>
              );
            }))}
          </div>
        </div>
      </div>

      {/* Row clues overlaid - simplified */}
      <div style={{ display: "flex", gap: 3 }}>
        <button type="button" onClick={reset} className="font-arcade text-[9px] px-3 py-1 rounded" style={{ background: "transparent", color: "#00f5ff", border: "1px solid #00f5ff" }}>RESET</button>
      </div>
      {gameOver && <div className="font-arcade text-sm" style={{ color: "#39ff14" }}>SOLVED! 🎉</div>}
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Left-click to fill • Right-click to mark ×</p>
    </div>
  );
}
