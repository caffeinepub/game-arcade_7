import { useState, useCallback, useEffect, useRef } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

type Grid = (number | null)[][];

function generateSudoku(): { puzzle: Grid; solution: Grid } {
  // Start with solved grid
  const base = [
    [5,3,4,6,7,8,9,1,2],[6,7,2,1,9,5,3,4,8],[1,9,8,3,4,2,5,6,7],
    [8,5,9,7,6,1,4,2,3],[4,2,6,8,5,3,7,9,1],[7,1,3,9,2,4,8,5,6],
    [9,6,1,5,3,7,2,8,4],[2,8,7,4,1,9,6,3,5],[3,4,5,2,8,6,1,7,9],
  ];
  // Shuffle rows within bands, columns within stacks
  const shuffle = (arr: number[]) => arr.sort(() => Math.random() - 0.5);
  const rowPerm = [shuffle([0,1,2]),shuffle([3,4,5]),shuffle([6,7,8])].flat();
  const colPerm = [shuffle([0,1,2]),shuffle([3,4,5]),shuffle([6,7,8])].flat();
  const numMap: number[] = [0,...shuffle([1,2,3,4,5,6,7,8,9])];

  const solution: Grid = rowPerm.map(r => colPerm.map(c => numMap[base[r][c]]));
  const puzzle: Grid = solution.map(row => [...row]);
  // Remove ~45 cells for medium difficulty
  const cells = Array.from({ length: 81 }, (_, i) => i).sort(() => Math.random() - 0.5);
  for (let i = 0; i < 45; i++) {
    const r = Math.floor(cells[i] / 9);
    const c = cells[i] % 9;
    puzzle[r][c] = null;
  }
  return { puzzle, solution };
}

export default function SudokuGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [{ puzzle, solution }, setGame] = useState(() => generateSudoku());
  const [grid, setGrid] = useState<Grid>(() => puzzle.map(r => [...r]));
  const [fixed, setFixed] = useState<boolean[][]>(() => puzzle.map(r => r.map(v => v !== null)));
  const [selected, setSelected] = useState<[number,number]|null>(null);
  const [errors, setErrors] = useState<boolean[][]>(() => Array(9).fill(null).map(() => Array(9).fill(false)));
  const [startTime] = useState(Date.now());
  const [completed, setCompleted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (completed) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [completed, startTime]);

  const newGame = useCallback(() => {
    const g = generateSudoku();
    setGame(g);
    setGrid(g.puzzle.map(r => [...r]));
    setFixed(g.puzzle.map(r => r.map(v => v !== null)));
    setSelected(null);
    setErrors(Array(9).fill(null).map(() => Array(9).fill(false)));
    setCompleted(false);
  }, []);

  const handleCellClick = (r: number, c: number) => { if (isActive) setSelected([r, c]); };

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (!selected || !isActive) return;
    const [r, c] = selected;
    if (fixed[r][c]) return;
    const num = parseInt(e.key);
    if (!isNaN(num) && num >= 1 && num <= 9) {
      const ng = grid.map(row => [...row]);
      ng[r][c] = num;
      const ne = errors.map(row => [...row]);
      ne[r][c] = solution[r][c] !== num;
      setGrid(ng);
      setErrors(ne);
      const filled = ng.flat().filter(v => v !== null).length;
      onScoreUpdate(Math.floor(filled * 10));
      const allCorrect = ng.every((row, ri) => row.every((v, ci) => v === solution[ri][ci]));
      if (allCorrect) {
        const finalScore = Math.max(0, 1000 - elapsed);
        setCompleted(true);
        onScoreUpdate(finalScore);
        onGameOver(finalScore);
      }
    } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
      const ng = grid.map(row => [...row]);
      ng[r][c] = null;
      const ne = errors.map(row => [...row]);
      ne[r][c] = false;
      setGrid(ng);
      setErrors(ne);
    }
  }, [selected, fixed, grid, errors, solution, elapsed, isActive, onGameOver, onScoreUpdate]);

  const CELL = 44;
  const fmt = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

  return (
    <div className="flex flex-col items-center gap-4 select-none" onKeyDown={handleKey} tabIndex={0} style={{ outline: "none" }}>
      <div className="flex items-center gap-6">
        <span className="font-mono-tech text-sm" style={{ color: "#00f5ff" }}>⏱ {fmt(elapsed)}</span>
        <button type="button" onClick={newGame}
          className="font-arcade text-[10px] px-3 py-1.5 rounded"
          style={{ background: "transparent", color: "#39ff14", border: "1px solid #39ff14" }}>
          NEW
        </button>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: `repeat(9, ${CELL}px)`,
        border: "2px solid rgba(255,242,0,0.5)", borderRadius: 4,
      }}>
        {grid.map((row, r) => row.map((val, c) => {
          const isSel = selected?.[0] === r && selected?.[1] === c;
          const isErr = errors[r][c];
          const isFixed = fixed[r][c];
          const sameNum = selected && grid[selected[0]][selected[1]] && val === grid[selected[0]][selected[1]];
          const borderR = r % 3 === 2 && r < 8 ? "2px solid rgba(255,242,0,0.5)" : "1px solid rgba(255,255,255,0.08)";
          const borderB = c % 3 === 2 && c < 8 ? "2px solid rgba(255,242,0,0.5)" : "1px solid rgba(255,255,255,0.08)";
          return (
            <button type="button" key={`sdk-${r}-${c}`}
              onClick={() => handleCellClick(r, c)}
              style={{
                width: CELL, height: CELL, padding: 0,
                background: isSel ? "rgba(255,242,0,0.2)" : sameNum ? "rgba(255,242,0,0.08)" : "transparent",
                borderRight: borderR, borderBottom: borderB,
                borderTop: "none", borderLeft: "none",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 18, fontWeight: "bold",
                color: isErr ? "#ff4444" : isFixed ? "#00f5ff" : "#39ff14",
                textShadow: isFixed ? "0 0 8px rgba(0,245,255,0.5)" : isErr ? "0 0 8px rgba(255,68,68,0.5)" : "none",
              }}
            >
              {val || ""}
            </button>
          );
        }))}
      </div>

      {completed && <div className="font-arcade text-sm" style={{ color: "#39ff14", textShadow: "0 0 15px #39ff14" }}>SOLVED! 🎉</div>}
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Click cell • Type 1-9 • Backspace to clear</p>
    </div>
  );
}
