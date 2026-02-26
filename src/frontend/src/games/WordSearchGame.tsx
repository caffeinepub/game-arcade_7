import { useState, useCallback, useRef } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const WORDS = ["JAVASCRIPT","PYTHON","ARCADE","CANVAS","PIXEL","NEON","CYBER","ROBOT","LASER","MATRIX"];
const GRID_SIZE = 14;

interface PlacedWord { word: string; positions: [number,number][]; }

function buildGrid(): { grid: string[][]; placed: PlacedWord[] } {
  const g: string[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(""));
  const placed: PlacedWord[] = [];
  const dirs: [number,number][] = [[0,1],[1,0],[1,1],[-1,1],[0,-1],[-1,0],[-1,-1],[1,-1]];

  for (const word of WORDS) {
    let success = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
      const maxR = dr === 0 ? GRID_SIZE - 1 : dr > 0 ? GRID_SIZE - word.length : word.length - 1;
      const maxC = dc === 0 ? GRID_SIZE - 1 : dc > 0 ? GRID_SIZE - word.length : word.length - 1;
      if (maxR < 0 || maxC < 0) continue;
      const r = Math.floor(Math.random() * (maxR + 1));
      const c = Math.floor(Math.random() * (maxC + 1));
      const positions: [number,number][] = [];
      let ok = true;
      for (let i = 0; i < word.length; i++) {
        const nr = r + dr * i, nc = c + dc * i;
        if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) { ok = false; break; }
        if (g[nr][nc] && g[nr][nc] !== word[i]) { ok = false; break; }
        positions.push([nr, nc]);
      }
      if (ok) {
        for (let i = 0; i < word.length; i++) g[positions[i][0]][positions[i][1]] = word[i];
        placed.push({ word, positions });
        success = true; break;
      }
    }
    if (!success) { /* skip word if can't place */ }
  }
  // Fill empty cells
  for (let r = 0; r < GRID_SIZE; r++) for (let c = 0; c < GRID_SIZE; c++) {
    if (!g[r][c]) g[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  }
  return { grid: g, placed };
}

export default function WordSearchGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [{ grid, placed }] = useState(() => buildGrid());
  const [found, setFound] = useState<string[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [startCell, setStartCell] = useState<[number,number]|null>(null);
  const [hoveredCell, setHoveredCell] = useState<[number,number]|null>(null);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);

  const getLineCells = useCallback((start: [number,number], end: [number,number]): [number,number][] => {
    const dr = Math.sign(end[0] - start[0]);
    const dc = Math.sign(end[1] - start[1]);
    const len = Math.max(Math.abs(end[0]-start[0]), Math.abs(end[1]-start[1]));
    return Array.from({length: len+1}, (_, i) => [start[0]+dr*i, start[1]+dc*i] as [number,number]);
  }, []);

  const checkWord = useCallback((cells: [number,number][]) => {
    const text = cells.map(([r,c]) => grid[r][c]).join("");
    const rev = [...text].reverse().join("");
    for (const pw of placed) {
      if (!found.includes(pw.word) && (text === pw.word || rev === pw.word)) {
        const ns = score + 100;
        const nf = [...found, pw.word];
        setFound(nf); setScore(ns); onScoreUpdate(ns);
        setHighlighted(prev => { const n = new Set(prev); for (const [r,c] of cells) n.add(`${r},${c}`); return n; });
        if (nf.length === placed.length) onGameOver(ns);
        return;
      }
    }
  }, [grid, placed, found, score, onScoreUpdate, onGameOver]);

  const handleMouseDown = (r: number, c: number) => { if (!isActive) return; setSelecting(true); setStartCell([r, c]); setHoveredCell([r, c]); };
  const handleMouseEnter = (r: number, c: number) => { if (!isActive || !selecting) return; setHoveredCell([r, c]); };
  const handleMouseUp = () => {
    if (startCell && hoveredCell) { const cells = getLineCells(startCell, hoveredCell); checkWord(cells); }
    setSelecting(false); setStartCell(null); setHoveredCell(null);
  };

  const currentLine = startCell && hoveredCell ? new Set(getLineCells(startCell, hoveredCell).map(([r,c]) => `${r},${c}`)) : new Set<string>();
  const CELL = 30;

  return (
    <div className="flex flex-col items-center gap-3 select-none" onMouseUp={handleMouseUp}>
      <div className="flex gap-4">
        <span className="font-arcade text-[10px]" style={{ color: "#00f5ff" }}>Found: {found.length}/{placed.length}</span>
        <span className="font-arcade text-[10px]" style={{ color: "#fff200" }}>Score: {score}</span>
      </div>

      {/* Word list */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 600, justifyContent: "center" }}>
        {WORDS.map(w => (
          <span key={`word-${w}`} className="font-mono-tech text-xs px-2 py-0.5 rounded"
            style={{ background: found.includes(w) ? "rgba(57,255,20,0.2)" : "rgba(255,255,255,0.05)", color: found.includes(w) ? "#39ff14" : "rgba(255,255,255,0.4)", textDecoration: found.includes(w) ? "line-through" : "none", border: `1px solid ${found.includes(w) ? "rgba(57,255,20,0.3)" : "rgba(255,255,255,0.08)"}` }}>
            {w}
          </span>
        ))}
      </div>

      <div style={{ userSelect: "none", display: "grid", gridTemplateColumns: `repeat(${GRID_SIZE}, ${CELL}px)`, border: "1px solid rgba(0,245,255,0.2)", borderRadius: 4 }}>
        {grid.map((row, r) => row.map((letter, c) => {
          const key = `${r},${c}`;
          const isHL = highlighted.has(key);
          const isSel = currentLine.has(key);
          return (
            <button type="button" key={`ws-${r}-${c}`}
              onMouseDown={() => handleMouseDown(r, c)}
              onMouseEnter={() => handleMouseEnter(r, c)}
              style={{
                width: CELL, height: CELL, padding: 0,
                background: isHL ? "rgba(57,255,20,0.3)" : isSel ? "rgba(0,245,255,0.3)" : "transparent",
                border: "1px solid rgba(255,255,255,0.04)",
                cursor: "crosshair",
                fontFamily: "'Orbitron', sans-serif", fontSize: 11, fontWeight: "bold",
                color: isHL ? "#39ff14" : isSel ? "#00f5ff" : "rgba(255,255,255,0.7)",
              }}>
              {letter}
            </button>
          );
        }))}
      </div>
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Click and drag to select words</p>
    </div>
  );
}
