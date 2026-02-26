import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

function createPuzzle(): boolean[] {
  // Start all off, randomly toggle to create solvable puzzle
  const lights = Array(25).fill(false);
  for (let i = 0; i < 15; i++) {
    const idx = Math.floor(Math.random() * 25);
    toggle(lights, idx);
  }
  return lights;
}

function toggle(lights: boolean[], idx: number): void {
  const r = Math.floor(idx / 5), c = idx % 5;
  lights[idx] = !lights[idx];
  if (r > 0) lights[(r-1)*5+c] = !lights[(r-1)*5+c];
  if (r < 4) lights[(r+1)*5+c] = !lights[(r+1)*5+c];
  if (c > 0) lights[r*5+c-1] = !lights[r*5+c-1];
  if (c < 4) lights[r*5+c+1] = !lights[r*5+c+1];
}

export default function LightsOutGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [lights, setLights] = useState<boolean[]>(() => createPuzzle());
  const [moves, setMoves] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);

  const handleClick = useCallback((idx: number) => {
    if (!isActive || gameOver) return;
    const nl = [...lights];
    toggle(nl, idx);
    const nm = moves + 1;
    setLights(nl); setMoves(nm);
    const sc = Math.max(0, 500 - nm);
    onScoreUpdate(sc);
    if (nl.every(v => !v)) {
      setGameOver(true);
      onGameOver(sc);
    }
  }, [lights, moves, isActive, gameOver, onGameOver, onScoreUpdate]);

  const nextLevel = () => {
    setLights(createPuzzle()); setMoves(0); setGameOver(false); setLevel(l => l + 1);
  };
  const CELL = 64;

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <div className="flex gap-6 items-center">
        <span className="font-arcade text-[10px]" style={{ color: "#fff200" }}>Level {level}</span>
        <span className="font-mono-tech text-sm" style={{ color: "#00f5ff" }}>Moves: {moves}</span>
        <span className="font-mono-tech text-sm" style={{ color: "#fff200" }}>Score: {Math.max(0, 500 - moves)}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(5, ${CELL}px)`, gap: 6, padding: 12, background: "rgba(0,0,0,0.3)", border: "2px solid rgba(255,242,0,0.2)", borderRadius: 8 }}>
        {lights.map((on, i) => (
          <button type="button" key={`lo-${i}`} onClick={() => handleClick(i)}
            style={{
              width: CELL, height: CELL, cursor: "pointer",
              background: on
                ? "radial-gradient(circle, #fff7a0, #fff200)"
                : "rgba(20,18,0,0.8)",
              border: `2px solid ${on ? "#fff200" : "rgba(255,242,0,0.15)"}`,
              borderRadius: 8,
              boxShadow: on ? "0 0 20px rgba(255,242,0,0.8), 0 0 40px rgba(255,242,0,0.4)" : "none",
              transition: "all 0.15s",
            }}>
          </button>
        ))}
      </div>

      <div className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
        Lights on: {lights.filter(Boolean).length}
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={() => { setLights(createPuzzle()); setMoves(0); setGameOver(false); }}
          className="font-arcade text-[9px] px-3 py-1.5 rounded"
          style={{ background: "transparent", color: "#39ff14", border: "1px solid #39ff14" }}>NEW PUZZLE</button>
        {gameOver && (
          <button type="button" onClick={nextLevel}
            className="font-arcade text-[10px] px-4 py-2 rounded"
            style={{ background: "rgba(255,242,0,0.15)", color: "#fff200", border: "1px solid #fff200" }}>NEXT LEVEL</button>
        )}
      </div>

      {gameOver && <div className="font-arcade text-sm" style={{ color: "#fff200" }}>ALL LIGHTS OUT! 🎉</div>}
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Click a light to toggle it and its neighbors</p>
    </div>
  );
}
