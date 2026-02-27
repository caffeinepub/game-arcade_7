import { useState, useCallback, useEffect } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

// Hexagonal grid with axial coordinates
// We use a radius-2 hex grid: 19 cells
type HexCoord = { q: number; r: number };
type HexGrid = Map<string, number>;

function hexKey(q: number, r: number) { return `${q},${r}`; }

function getHexCells(): HexCoord[] {
  const cells: HexCoord[] = [];
  const radius = 2;
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) <= radius) {
        cells.push({ q, r });
      }
    }
  }
  return cells;
}

const HEX_CELLS = getHexCells();

function initGrid(): HexGrid {
  const grid = new Map<string, number>();
  // Start with 2 tiles
  const cells = [...HEX_CELLS].sort(() => Math.random() - 0.5);
  grid.set(hexKey(cells[0].q, cells[0].r), 2);
  grid.set(hexKey(cells[1].q, cells[1].r), 2);
  return grid;
}

const HEX_DIRS = [
  { dq: 1, dr: 0 }, { dq: -1, dr: 0 },
  { dq: 0, dr: 1 }, { dq: 0, dr: -1 },
  { dq: 1, dr: -1 }, { dq: -1, dr: 1 },
];

function addRandom(grid: HexGrid): HexGrid {
  const empty = HEX_CELLS.filter(c => !grid.has(hexKey(c.q, c.r)));
  if (empty.length === 0) return grid;
  const cell = empty[Math.floor(Math.random() * empty.length)];
  const ng = new Map(grid);
  ng.set(hexKey(cell.q, cell.r), Math.random() < 0.9 ? 2 : 4);
  return ng;
}

function slide(grid: HexGrid, dq: number, dr: number): { grid: HexGrid; score: number } {
  // Sort cells in direction of movement
  const sorted = [...HEX_CELLS].sort((a, b) => {
    return (b.q * dq + b.r * dr) - (a.q * dq + a.r * dr);
  });

  const ng = new Map<string, number>();
  const merged = new Set<string>();
  let score = 0;

  for (const cell of sorted) {
    const key = hexKey(cell.q, cell.r);
    const val = grid.get(key);
    if (val === undefined) continue;

    let q = cell.q, r = cell.r;
    // Move in direction until wall or other tile
    while (true) {
      const nq = q + dq, nr = r + dr;
      if (!HEX_CELLS.some(c => c.q === nq && c.r === nr)) break;
      const nkey = hexKey(nq, nr);
      if (ng.has(nkey)) {
        // Check merge
        if (!merged.has(nkey) && ng.get(nkey) === val) {
          ng.set(nkey, val * 2);
          merged.add(nkey);
          score += val * 2;
          q = -999; r = -999; // signal merged
        }
        break;
      }
      q = nq; r = nr;
    }

    if (q !== -999) {
      ng.set(hexKey(q, r), val);
    }
  }

  return { grid: ng, score };
}

const TILE_COLORS: Record<number, string> = {
  2: "#1a2a3a", 4: "#1a3a2a", 8: "#2a3a1a",
  16: "#3a2a1a", 32: "#3a1a2a", 64: "#1a2a4a",
  128: "#00f5ff33", 256: "#39ff1433", 512: "#bf5fff33",
  1024: "#fff20033", 2048: "#ff2d8e33",
};

function hexToPixel(q: number, r: number, size: number): { x: number; y: number } {
  const x = size * (3/2 * q);
  const y = size * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r);
  return { x, y };
}

export default function Hex2048Game({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [grid, setGrid] = useState<HexGrid>(initGrid);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  const doSlide = useCallback((dq: number, dr: number) => {
    if (!isActive) return;
    setGrid(prev => {
      const { grid: ng, score: pts } = slide(prev, dq, dr);
      if (pts === 0 && JSON.stringify([...ng]) === JSON.stringify([...prev])) return prev;
      const final = addRandom(ng);
      setScore(s => {
        const ns = s + pts;
        setBest(b => Math.max(b, ns));
        onScoreUpdate(ns);
        if ([...ng.values()].some(v => v >= 2048)) {
          setTimeout(() => onGameOver(ns), 500);
        }
        return ns;
      });
      return final;
    });
  }, [isActive, onGameOver, onScoreUpdate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "q": case "Q": doSlide(-1, 0); break;
        case "e": case "E": doSlide(1, 0); break;
        case "a": case "A": doSlide(-1, 1); break;
        case "d": case "D": doSlide(1, -1); break;
        case "z": case "Z": doSlide(0, 1); break;
        case "x": case "X": doSlide(0, -1); break;
        case "ArrowLeft": e.preventDefault(); doSlide(-1, 0); break;
        case "ArrowRight": e.preventDefault(); doSlide(1, 0); break;
        case "ArrowUp": e.preventDefault(); doSlide(1, -1); break;
        case "ArrowDown": e.preventDefault(); doSlide(-1, 1); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [doSlide]);

  const HEX_SIZE = 42;
  const CENTER_X = 200;
  const CENTER_Y = 220;

  const maxVal = Math.max(...Array.from(grid.values()), 0);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex gap-8 font-arcade text-xs">
        <div className="text-center">
          <div style={{ color: "rgba(255,255,255,0.4)" }}>SCORE</div>
          <div style={{ color: "#bf5fff" }}>{score}</div>
        </div>
        <div className="text-center">
          <div style={{ color: "rgba(255,255,255,0.4)" }}>BEST</div>
          <div style={{ color: "#fff200" }}>{best}</div>
        </div>
        <div className="text-center">
          <div style={{ color: "rgba(255,255,255,0.4)" }}>TOP TILE</div>
          <div style={{ color: "#00f5ff" }}>{maxVal}</div>
        </div>
      </div>

      <svg width={400} height={440} style={{ overflow: "visible" }} aria-label="Hex 2048 grid">
        {HEX_CELLS.map(({ q, r }) => {
          const { x, y } = hexToPixel(q, r, HEX_SIZE);
          const key = hexKey(q, r);
          const val = grid.get(key);
          const bg = val ? (TILE_COLORS[val] || "#2a1a3a") : "rgba(255,255,255,0.03)";
          const border = val ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.06)";

          // Hexagon path
          const points = Array(6).fill(0).map((_, i) => {
            const angle = (60 * i - 30) * Math.PI / 180;
            return `${CENTER_X + x + (HEX_SIZE - 2) * Math.cos(angle)},${CENTER_Y + y + (HEX_SIZE - 2) * Math.sin(angle)}`;
          }).join(" ");

          return (
            <g key={`hex-${q}-${r}`}>
              <polygon
                points={points}
                fill={bg}
                stroke={border}
                strokeWidth={1}
              />
              {val && (
                <text
                  x={CENTER_X + x}
                  y={CENTER_Y + y + 5}
                  textAnchor="middle"
                  fill={val >= 128 ? "#fff" : "rgba(255,255,255,0.9)"}
                  fontSize={val >= 1000 ? 14 : val >= 100 ? 16 : 18}
                  fontWeight="bold"
                  fontFamily="monospace"
                  style={{ textShadow: `0 0 8px ${TILE_COLORS[val] || "#fff"}` }}
                >
                  {val}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Direction buttons */}
      <div className="flex gap-2">
        {[
          { label: "←", dq: -1, dr: 0 },
          { label: "↗", dq: 1, dr: -1 },
          { label: "↘", dq: 0, dr: 1 },
          { label: "→", dq: 1, dr: 0 },
          { label: "↙", dq: -1, dr: 1 },
          { label: "↖", dq: 0, dr: -1 },
        ].map(btn => (
          <button
            key={`hex2048-btn-${btn.label}`}
            type="button"
            onClick={() => doSlide(btn.dq, btn.dr)}
            className="font-arcade text-sm w-10 h-10 rounded flex items-center justify-center"
            style={{ background: "rgba(191,95,255,0.1)", color: "#bf5fff", border: "1px solid rgba(191,95,255,0.3)" }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
        Arrow keys or Q/E/A/D/Z/X to slide. Merge tiles to reach 2048!
      </p>
    </div>
  );
}
