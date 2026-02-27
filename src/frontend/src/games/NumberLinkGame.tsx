import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const GRID_SIZE = 6;
const COLORS = ["#ff4444","#00f5ff","#39ff14","#fff200","#bf5fff","#ff8c00"];

const PUZZLES: [number, number, number][][] = [
  [[0,0,0],[0,5,5],[1,0,4],[1,5,1],[2,1,0],[2,3,4],[3,4,0],[3,2,3]],
  [[0,0,0],[0,4,5],[1,0,2],[1,5,2],[2,0,4],[2,5,4],[3,2,0],[3,2,5],[4,3,2],[4,1,3]],
  [[0,0,0],[0,5,5],[1,0,3],[1,5,0],[2,2,1],[2,4,4],[3,1,5],[3,3,0],[4,4,1],[4,2,5]],
];

type GridCell = { color: number; endpoint: boolean } | null;

function initGrid(puzzle: [number, number, number][]): GridCell[][] {
  const g: GridCell[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
  for (const [color, r, c] of puzzle) {
    g[r][c] = { color, endpoint: true };
  }
  return g;
}

function getEndpointColorFor(puzzle: [number, number, number][], r: number, c: number): number | null {
  for (const [color, er, ec] of puzzle) {
    if (er === r && ec === c) return color;
  }
  return null;
}

type Path = { color: number; cells: [number,number][] };

export default function NumberLinkGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [grid, setGrid] = useState<GridCell[][]>(() => initGrid(PUZZLES[0]));
  const [paths, setPaths] = useState<Path[]>([]);
  const [drawing, setDrawing] = useState<Path | null>(null);
  const [score, setScore] = useState(0);
  const [solved, setSolved] = useState(false);

  const puzzle = PUZZLES[puzzleIdx];

  const startDraw = useCallback((r: number, c: number) => {
    if (!isActive || solved) return;
    const epColor = getEndpointColorFor(puzzle, r, c);
    if (epColor === null) return;

    setPaths(prev => prev.filter(p => p.color !== epColor));
    setGrid(prev => {
      const ng = prev.map(row => [...row]);
      for (let gr = 0; gr < GRID_SIZE; gr++) {
        for (let gc = 0; gc < GRID_SIZE; gc++) {
          if (ng[gr][gc]?.color === epColor && !ng[gr][gc]!.endpoint) ng[gr][gc] = null;
        }
      }
      return ng;
    });
    setDrawing({ color: epColor, cells: [[r, c]] });
  }, [isActive, solved, puzzle]);

  const continueDraw = useCallback((r: number, c: number) => {
    if (!drawing) return;
    const lastCell = drawing.cells[drawing.cells.length - 1];
    if (lastCell[0] === r && lastCell[1] === c) return;
    const dist = Math.abs(lastCell[0] - r) + Math.abs(lastCell[1] - c);
    if (dist !== 1) return;
    const cell = grid[r][c];
    if (cell && cell.color !== drawing.color) return;

    const existIdx = drawing.cells.findIndex(([cr, cc]) => cr === r && cc === c);
    if (existIdx !== -1) {
      const truncated = drawing.cells.slice(0, existIdx + 1);
      setGrid(prev => {
        const ng = prev.map(row => [...row]);
        for (const [cr, cc] of drawing.cells.slice(existIdx + 1)) {
          if (!getEndpointColorFor(puzzle, cr, cc)) ng[cr][cc] = null;
        }
        return ng;
      });
      setDrawing({ ...drawing, cells: truncated });
      return;
    }

    setGrid(prev => {
      const ng = prev.map(row => [...row]);
      if (!ng[r][c]) ng[r][c] = { color: drawing.color, endpoint: false };
      return ng;
    });
    setDrawing(prev => prev ? { ...prev, cells: [...prev.cells, [r, c]] } : null);
  }, [drawing, grid, puzzle]);

  const endDraw = useCallback(() => {
    if (!drawing || drawing.cells.length < 2) { setDrawing(null); return; }
    const lastCell = drawing.cells[drawing.cells.length - 1];
    const startCell = drawing.cells[0];
    const lastColor = getEndpointColorFor(puzzle, lastCell[0], lastCell[1]);

    if (lastColor === drawing.color && (lastCell[0] !== startCell[0] || lastCell[1] !== startCell[1])) {
      const newPaths = [...paths.filter(p => p.color !== drawing.color), drawing];
      setPaths(newPaths);

      const uniqueColors = [...new Set(puzzle.map(([c]) => c))];
      if (newPaths.length === uniqueColors.length) {
        const pts = (puzzleIdx + 1) * 300;
        const newScore = score + pts;
        setScore(newScore);
        setSolved(true);
        onScoreUpdate(newScore);
        if (puzzleIdx < PUZZLES.length - 1) {
          setTimeout(() => {
            const nextIdx = puzzleIdx + 1;
            setPuzzleIdx(nextIdx);
            setGrid(initGrid(PUZZLES[nextIdx]));
            setPaths([]);
            setSolved(false);
          }, 1200);
        } else {
          setTimeout(() => onGameOver(newScore), 1200);
        }
      }
    }
    setDrawing(null);
  }, [drawing, paths, puzzle, puzzleIdx, score, onScoreUpdate, onGameOver]);

  const CELL = 52;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex gap-6 font-arcade text-xs">
        <span style={{ color: "#bf5fff" }}>NUMBER LINK</span>
        <span style={{ color: "#00f5ff" }}>PUZZLE {puzzleIdx + 1}/{PUZZLES.length}</span>
        <span style={{ color: "#39ff14" }}>SCORE: {score}</span>
      </div>

      <div
        className="relative select-none"
        style={{
          width: GRID_SIZE * CELL + 8,
          height: GRID_SIZE * CELL + 8,
          background: "#0a0a0f",
          border: "1px solid rgba(191,95,255,0.2)",
          borderRadius: 4,
        }}
      >
        <svg
          width={GRID_SIZE * CELL}
          height={GRID_SIZE * CELL}
          style={{ position: "absolute", top: 4, left: 4 }}
          aria-label="Number Link puzzle grid"
        >
          {Array(GRID_SIZE + 1).fill(0).map((_, i) => (
            <g key={`nl-line-${i}`}>
              <line x1={i * CELL} y1={0} x2={i * CELL} y2={GRID_SIZE * CELL} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              <line x1={0} y1={i * CELL} x2={GRID_SIZE * CELL} y2={i * CELL} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            </g>
          ))}

          {paths.map(path => (
            <polyline
              key={`nlpath-${path.color}`}
              points={path.cells.map(([r, c]) => `${c * CELL + CELL/2},${r * CELL + CELL/2}`).join(" ")}
              fill="none"
              stroke={COLORS[path.color]}
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.6}
            />
          ))}

          {drawing && drawing.cells.length > 1 && (
            <polyline
              points={drawing.cells.map(([r, c]) => `${c * CELL + CELL/2},${r * CELL + CELL/2}`).join(" ")}
              fill="none"
              stroke={COLORS[drawing.color]}
              strokeWidth={10}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          )}

          {Array(GRID_SIZE).fill(0).map((_, r) =>
            Array(GRID_SIZE).fill(0).map((_, c) => {
              const ep = getEndpointColorFor(puzzle, r, c);
              if (ep === null) return null;
              return (
                <g key={`nlep-${r}-${c}`}>
                  <circle cx={c * CELL + CELL/2} cy={r * CELL + CELL/2} r={17}
                    fill={COLORS[ep]} style={{ filter: `drop-shadow(0 0 6px ${COLORS[ep]})` }} />
                  <text x={c * CELL + CELL/2} y={r * CELL + CELL/2 + 5}
                    textAnchor="middle" fill="#0a0a0f" fontSize={13} fontWeight="bold" fontFamily="monospace">
                    {ep + 1}
                  </text>
                </g>
              );
            })
          )}

          {Array(GRID_SIZE).fill(0).map((_, r) =>
            Array(GRID_SIZE).fill(0).map((_, c) => (
              <rect
                key={`nlrect-${r}-${c}`}
                x={c * CELL} y={r * CELL} width={CELL} height={CELL}
                fill="transparent" style={{ cursor: "pointer" }}
                onPointerDown={() => startDraw(r, c)}
                onPointerEnter={() => continueDraw(r, c)}
                onPointerUp={endDraw}
              />
            ))
          )}
        </svg>
      </div>

      {solved && (
        <div className="font-arcade text-sm" style={{ color: "#39ff14", textShadow: "0 0 12px #39ff14" }}>
          SOLVED!
        </div>
      )}

      <p className="font-mono-tech text-xs text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
        Drag from a number to connect matching pairs. Connect all pairs to solve the puzzle!
      </p>
    </div>
  );
}
