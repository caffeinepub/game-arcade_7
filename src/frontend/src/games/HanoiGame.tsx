import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const NUM_DISCS = 5;
const OPTIMAL = Math.pow(2, NUM_DISCS) - 1;

function initPegs(): number[][] {
  return [Array.from({ length: NUM_DISCS }, (_, i) => NUM_DISCS - i), [], []];
}

export default function HanoiGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [pegs, setPegs] = useState<number[][]>(() => initPegs());
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const handlePegClick = useCallback((pegIdx: number) => {
    if (!isActive || gameOver) return;
    if (selected === null) {
      if (pegs[pegIdx].length === 0) return;
      setSelected(pegIdx);
      return;
    }
    if (selected === pegIdx) { setSelected(null); return; }
    const top = pegs[selected][pegs[selected].length - 1];
    const dest = pegs[pegIdx];
    if (dest.length > 0 && dest[dest.length - 1] < top) { setSelected(null); return; }
    const np = pegs.map(p => [...p]);
    np[selected].pop(); np[pegIdx].push(top);
    const nm = moves + 1;
    setPegs(np); setMoves(nm); setSelected(null);
    const sc = Math.max(0, 1000 - nm);
    onScoreUpdate(sc);
    if (np[2].length === NUM_DISCS) { setGameOver(true); onGameOver(sc); }
  }, [pegs, selected, moves, isActive, gameOver, onGameOver, onScoreUpdate]);

  const reset = () => { setPegs(initPegs()); setSelected(null); setMoves(0); setGameOver(false); };

  const PWIDTH = 140, DISC_H = 18, BASE_W = 120;
  const discColors = ["#ff4444","#ff8800","#fff200","#39ff14","#00f5ff"];

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <div className="flex gap-6 items-center">
        <span className="font-mono-tech text-sm" style={{ color: "#00f5ff" }}>Moves: {moves}</span>
        <span className="font-mono-tech text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Optimal: {OPTIMAL}</span>
        <span className="font-mono-tech text-sm" style={{ color: "#fff200" }}>Score: {Math.max(0, 1000 - moves)}</span>
      </div>

      <div style={{ display: "flex", gap: 8, padding: 16, background: "rgba(255,242,0,0.04)", border: "1px solid rgba(255,242,0,0.15)", borderRadius: 8 }}>
        {pegs.map((peg, pi) => (
          <button type="button" key={`peg-${pi}`} onClick={() => handlePegClick(pi)}
            style={{
              width: PWIDTH, height: NUM_DISCS * (DISC_H + 4) + 30,
              background: selected === pi ? "rgba(255,242,0,0.08)" : "transparent",
              border: `2px solid ${selected === pi ? "#fff200" : "rgba(255,242,0,0.15)"}`,
              borderRadius: 4, cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: 4, gap: 2,
              position: "relative",
            }}>
            {/* Pole */}
            <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", width: 6, height: NUM_DISCS * (DISC_H + 4) + 10, background: "rgba(255,242,0,0.4)", borderRadius: 3 }} />
            {/* Base */}
            <div style={{ width: BASE_W, height: 8, background: "rgba(255,242,0,0.3)", borderRadius: 4, position: "absolute", bottom: 8, zIndex: 1 }} />
            {/* Discs */}
            <div style={{ position: "absolute", bottom: 18, display: "flex", flexDirection: "column-reverse", alignItems: "center", gap: 2, zIndex: 2 }}>
              {peg.map((disc, di) => {
                const w = disc * (BASE_W / (NUM_DISCS + 1));
                return (
                  <div key={`disc-${pi}-${di}`} style={{
                    width: w + 20, height: DISC_H,
                    background: discColors[disc - 1] || "#fff",
                    borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: `0 0 8px ${discColors[disc - 1] || "#fff"}66`,
                    fontFamily: "'Orbitron', sans-serif", fontSize: 10, fontWeight: "bold", color: "#000",
                  }}>{disc}</div>
                );
              })}
            </div>
            <span className="font-arcade text-[9px]" style={{ position: "absolute", top: 4, color: "rgba(255,242,0,0.4)" }}>PEG {pi+1}</span>
          </button>
        ))}
      </div>

      {selected !== null && <div className="font-arcade text-[10px]" style={{ color: "#fff200" }}>Moving disc {pegs[selected][pegs[selected].length - 1]} from Peg {selected + 1}</div>}
      <div className="flex gap-3">
        <button type="button" onClick={reset} className="font-arcade text-[10px] px-4 py-2 rounded" style={{ background: "transparent", color: "#39ff14", border: "1px solid #39ff14" }}>RESET</button>
      </div>
      {gameOver && <div className="font-arcade text-sm" style={{ color: "#39ff14" }}>SOLVED in {moves} moves! 🎉</div>}
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Click peg to pick up top disc • Click another peg to place</p>
    </div>
  );
}
