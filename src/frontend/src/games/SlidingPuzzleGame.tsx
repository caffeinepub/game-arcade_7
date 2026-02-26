import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

function createSolved(): number[] { return [...Array(16).keys()]; } // 0 = blank

function shuffle(tiles: number[]): number[] {
  const t = [...tiles];
  for (let i = 0; i < 1000; i++) {
    const blank = t.indexOf(0);
    const r = Math.floor(blank / 4), c = blank % 4;
    const neighbors: number[] = [];
    if (r > 0) neighbors.push((r-1)*4+c);
    if (r < 3) neighbors.push((r+1)*4+c);
    if (c > 0) neighbors.push(r*4+c-1);
    if (c < 3) neighbors.push(r*4+c+1);
    const swap = neighbors[Math.floor(Math.random() * neighbors.length)];
    [t[blank], t[swap]] = [t[swap], t[blank]];
  }
  return t;
}

function isSolved(tiles: number[]): boolean {
  return tiles.every((v, i) => v === i);
}

export default function SlidingPuzzleGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [tiles, setTiles] = useState<number[]>(() => shuffle(createSolved()));
  const [moves, setMoves] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const handleClick = useCallback((idx: number) => {
    if (!isActive || gameOver || tiles[idx] === 0) return;
    const blank = tiles.indexOf(0);
    const r = Math.floor(idx / 4), c = idx % 4;
    const br = Math.floor(blank / 4), bc = blank % 4;
    if (Math.abs(r - br) + Math.abs(c - bc) !== 1) return;
    const nt = [...tiles];
    [nt[idx], nt[blank]] = [nt[blank], nt[idx]];
    const nm = moves + 1;
    setTiles(nt); setMoves(nm);
    const sc = Math.max(0, 1000 - nm);
    onScoreUpdate(sc);
    if (isSolved(nt)) { setGameOver(true); onGameOver(sc); }
  }, [tiles, moves, isActive, gameOver, onGameOver, onScoreUpdate]);

  const reset = () => { setTiles(shuffle(createSolved())); setMoves(0); setGameOver(false); };
  const CELL = 70;

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <div className="flex gap-6 items-center">
        <span className="font-mono-tech text-sm" style={{ color: "#00f5ff" }}>Moves: {moves}</span>
        <span className="font-mono-tech text-sm" style={{ color: "#fff200" }}>Best: {Math.max(0, 1000 - moves)}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(4, ${CELL}px)`, gap: 4, padding: 8, background: "rgba(0,245,255,0.04)", border: "2px solid rgba(0,245,255,0.2)", borderRadius: 6 }}>
        {tiles.map((tile, i) => (
          <button type="button" key={`sp-tile-${i}`} onClick={() => handleClick(i)}
            style={{
              width: CELL, height: CELL,
              background: tile === 0 ? "rgba(0,0,0,0.1)" : `hsl(${tile * 22}, 70%, 15%)`,
              border: tile === 0 ? "2px dashed rgba(255,255,255,0.05)" : `2px solid hsl(${tile * 22}, 70%, 35%)`,
              borderRadius: 6, cursor: tile === 0 ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 22, fontWeight: "bold",
              color: `hsl(${tile * 22}, 100%, 65%)`,
              textShadow: tile === 0 ? "none" : `0 0 10px hsl(${tile * 22}, 100%, 60%)`,
              boxShadow: tile === 0 ? "none" : `inset 0 0 15px rgba(0,0,0,0.3)`,
            }}>
            {tile !== 0 && tile}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={reset} className="font-arcade text-[10px] px-4 py-2 rounded" style={{ background: "transparent", color: "#39ff14", border: "1px solid #39ff14" }}>SHUFFLE</button>
      </div>
      {gameOver && <div className="font-arcade text-sm" style={{ color: "#39ff14" }}>SOLVED in {moves} moves! 🎉</div>}
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Click tiles adjacent to blank space to slide them</p>
    </div>
  );
}
