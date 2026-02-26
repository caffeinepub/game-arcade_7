import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

interface Tile { id: number; type: string; layer: number; row: number; col: number; removed: boolean; }

const TILE_TYPES = [
  "🀇","🀈","🀉","🀊","🀋","🀌","🀍","🀎","🀏",
  "🀙","🀚","🀛","🀜","🀝","🀞","🀟","🀠","🀡",
  "🀐","🀑","🀒","🀓","🀔","🀕","🀖","🀗","🀘",
  "🀀","🀁","🀂","🀃","🀄","🀅","🀆",
];

function createLayout(): Tile[] {
  // Shanghai pyramid layout (simplified 4 layers)
  const positions: [number,number,number][] = [];
  const layers = [
    { rows: 8, cols: 12, layer: 0 },
    { rows: 6, cols: 10, layer: 1 },
    { rows: 4, cols: 8, layer: 2 },
    { rows: 2, cols: 4, layer: 3 },
  ];
  for (const { rows, cols, layer } of layers) {
    const rowOff = (8 - rows) / 2;
    const colOff = (12 - cols) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        positions.push([layer, rowOff + r, colOff + c]);
      }
    }
  }
  // Need even count, pick types
  const count = positions.length;
  const pairs: string[] = [];
  const types = [...TILE_TYPES];
  while (pairs.length < count) {
    const t = types[Math.floor(Math.random() * types.length)];
    pairs.push(t, t);
  }
  pairs.splice(count);
  pairs.sort(() => Math.random() - 0.5);

  return positions.map(([layer, row, col], i) => ({
    id: i, type: pairs[i], layer, row, col, removed: false,
  }));
}

function isFree(tile: Tile, tiles: Tile[]): boolean {
  const active = tiles.filter(t => !t.removed && t.id !== tile.id);
  // Check if blocked on left and right
  const leftBlocked = active.some(t => t.layer === tile.layer && Math.abs(t.row - tile.row) < 1 && t.col === tile.col - 1);
  const rightBlocked = active.some(t => t.layer === tile.layer && Math.abs(t.row - tile.row) < 1 && t.col === tile.col + 1);
  // Check if covered above
  const aboveCovered = active.some(t => t.layer === tile.layer + 1 && Math.abs(t.row - tile.row) <= 1 && Math.abs(t.col - tile.col) <= 1);
  return (!leftBlocked || !rightBlocked) && !aboveCovered;
}

export default function MahjongGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [tiles, setTiles] = useState<Tile[]>(() => createLayout());
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [matchMsg, setMatchMsg] = useState("");

  const activeTiles = tiles.filter(t => !t.removed);

  const handleClick = useCallback((id: number) => {
    if (!isActive) return;
    const tile = tiles.find(t => t.id === id);
    if (!tile || tile.removed) return;
    if (!isFree(tile, tiles)) return;

    if (selected === null) {
      setSelected(id);
      return;
    }
    if (selected === id) { setSelected(null); return; }

    const sel = tiles.find(t => t.id === selected)!;
    if (sel.type === tile.type) {
      const nt = tiles.map(t => t.id === id || t.id === selected ? { ...t, removed: true } : t);
      setTiles(nt);
      setSelected(null);
      const remaining = nt.filter(t => !t.removed).length;
      const ns = score + 10;
      setScore(ns);
      onScoreUpdate(ns);
      setMatchMsg("MATCH!");
      setTimeout(() => setMatchMsg(""), 800);
      if (remaining === 0) onGameOver(ns);
    } else {
      setSelected(id);
      setMatchMsg("NO MATCH");
      setTimeout(() => setMatchMsg(""), 800);
    }
  }, [tiles, selected, score, isActive, onGameOver, onScoreUpdate]);

  const reset = () => { setTiles(createLayout()); setSelected(null); setScore(0); setMatchMsg(""); };

  const CELL = 38;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="flex items-center gap-4">
        <span className="font-mono-tech text-xs" style={{ color: "#bf5fff" }}>Pairs: {activeTiles.length / 2}</span>
        <span className="font-arcade text-[10px]" style={{ color: matchMsg === "MATCH!" ? "#39ff14" : "#ff4444", minWidth: 80, textAlign: "center" }}>{matchMsg}</span>
        <button type="button" onClick={reset} className="font-arcade text-[9px] px-2 py-1 rounded" style={{ background: "transparent", color: "#39ff14", border: "1px solid #39ff14" }}>NEW</button>
      </div>

      <div style={{ position: "relative", width: 12 * CELL + 20, height: 8 * CELL + 40 }}>
        {[0,1,2,3].map(layer =>
          tiles
            .filter(t => t.layer === layer && !t.removed)
            .map(tile => {
              const free = isFree(tile, tiles);
              const isSel = selected === tile.id;
              return (
                <button type="button" key={tile.id}
                  onClick={() => free && handleClick(tile.id)}
                  style={{
                    position: "absolute",
                    left: tile.col * CELL + layer * 2,
                    top: tile.row * CELL - layer * 3,
                    width: CELL - 2, height: CELL - 2,
                    background: isSel ? "rgba(255,242,0,0.3)" : free ? "rgba(40,20,60,0.9)" : "rgba(20,10,30,0.7)",
                    border: isSel ? "2px solid #fff200" : free ? "1px solid rgba(191,95,255,0.5)" : "1px solid rgba(100,50,150,0.3)",
                    borderRadius: 3,
                    cursor: free ? "pointer" : "default",
                    fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: layer * 100 + tile.row,
                    boxShadow: isSel ? "0 0 10px rgba(255,242,0,0.5)" : free ? "0 0 6px rgba(191,95,255,0.3)" : "none",
                    filter: free ? "none" : "brightness(0.5)",
                  }}
                >
                  {tile.type}
                </button>
              );
            })
        )}
      </div>

      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Click matching free tile pairs to clear them</p>
    </div>
  );
}
