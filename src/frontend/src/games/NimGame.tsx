import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

function initPiles(): number[] { return [3, 5, 7]; }

function nimValue(piles: number[]): number {
  return piles.reduce((xor, p) => xor ^ p, 0);
}

function aiMove(piles: number[]): [number, number] {
  // Winning strategy: find pile to reduce to make XOR = 0
  const xorAll = nimValue(piles);
  for (let i = 0; i < piles.length; i++) {
    const desired = piles[i] ^ xorAll;
    if (desired < piles[i]) return [i, piles[i] - desired];
  }
  // No winning move, take 1 from largest
  const maxIdx = piles.indexOf(Math.max(...piles));
  return [maxIdx, 1];
}

export default function NimGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [piles, setPiles] = useState<number[]>(() => initPiles());
  const [selected, setSelected] = useState<{ pile: number; count: number } | null>(null);
  const [turn, setTurn] = useState<"player"|"ai">("player");
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [status, setStatus] = useState("YOUR TURN — click objects to remove (misère: avoid last)");

  const handleObjectClick = useCallback((pileIdx: number, objIdx: number) => {
    if (!isActive || gameOver || turn !== "player") return;
    if (selected?.pile === pileIdx) {
      // Toggle selection up to this index
      const count = objIdx + 1 - (piles[pileIdx] - (selected?.count || 0));
      if (count > 0) setSelected({ pile: pileIdx, count: piles[pileIdx] - objIdx });
      else setSelected({ pile: pileIdx, count: 1 });
    } else {
      setSelected({ pile: pileIdx, count: piles[pileIdx] - objIdx });
    }
  }, [piles, selected, turn, gameOver, isActive]);

  const confirmMove = useCallback(() => {
    if (!selected || !isActive || gameOver) return;
    const np = [...piles];
    np[selected.pile] -= selected.count;
    if (np[selected.pile] < 0) return;
    setSelected(null);

    const allGone = np.every(p => p === 0);
    if (allGone) {
      // Misère: last to take LOSES — player took last, player loses
      const nw = wins; const nl = losses + 1;
      setLosses(nl); setPiles(np); setGameOver(true);
      setStatus("You took the last! AI WINS (misère rule)");
      onGameOver(nw * 100);
      return;
    }

    setPiles(np); setTurn("ai"); setStatus("AI THINKING...");
    setTimeout(() => {
      const [aiPile, aiCount] = aiMove(np);
      const np2 = [...np]; np2[aiPile] -= aiCount;
      if (np2.every(p => p === 0)) {
        const newWins = wins + 1;
        setWins(newWins); setPiles(np2); setGameOver(true);
        setStatus("AI took the last! YOU WIN! 🎉");
        onScoreUpdate(newWins * 100); onGameOver(newWins * 100);
      } else {
        setPiles(np2); setTurn("player"); setStatus("YOUR TURN");
      }
    }, 800);
  }, [selected, piles, wins, losses, gameOver, isActive, onGameOver, onScoreUpdate]);

  const reset = () => { setPiles(initPiles()); setSelected(null); setTurn("player"); setGameOver(false); setStatus("YOUR TURN — click objects to remove (misère: avoid last)"); };

  const PILE_COLORS = ["#ff4444","#00f5ff","#39ff14"];

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <div className="flex gap-6">
        <span className="font-arcade text-[10px]" style={{ color: "#39ff14" }}>WINS: {wins}</span>
        <span className="font-arcade text-[10px]" style={{ color: "#ff4444" }}>LOSSES: {losses}</span>
      </div>

      <div className="font-arcade text-[10px] text-center" style={{ color: "#fff200", maxWidth: 320 }}>{status}</div>

      {/* Piles */}
      <div style={{ display: "flex", gap: 24, alignItems: "flex-end", padding: 16, background: "rgba(255,68,68,0.04)", border: "1px solid rgba(255,68,68,0.2)", borderRadius: 8 }}>
        {piles.map((pile, pi) => (
          <div key={`pile-${pi}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
              {Array.from({length:pile}, (_,oi) => {
                const isSelected = selected?.pile === pi && oi >= pile - selected.count;
                return (
                  <button type="button" key={`obj-${pi}-${oi}`} onClick={() => handleObjectClick(pi, oi)}
                    style={{
                      width: 36, height: 18, borderRadius: 4, padding: 0,
                      background: isSelected ? PILE_COLORS[pi] : `${PILE_COLORS[pi]}44`,
                      border: `2px solid ${PILE_COLORS[pi]}`,
                      cursor: turn === "player" && !gameOver ? "pointer" : "default",
                      boxShadow: isSelected ? `0 0 8px ${PILE_COLORS[pi]}` : "none",
                    }} />
                );
              })}
            </div>
            <span className="font-arcade text-[9px]" style={{ color: PILE_COLORS[pi] }}>PILE {pi+1}: {pile}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        {selected && turn === "player" && !gameOver && (
          <button type="button" onClick={confirmMove} className="font-arcade text-[10px] px-4 py-2 rounded" style={{ background: "rgba(255,68,68,0.15)", color: "#ff4444", border: "1px solid #ff4444" }}>
            REMOVE {selected.count} from Pile {selected.pile+1}
          </button>
        )}
        <button type="button" onClick={reset} className="font-arcade text-[9px] px-3 py-1 rounded" style={{ background: "transparent", color: "#39ff14", border: "1px solid #39ff14" }}>NEW GAME</button>
      </div>
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Misère Nim: force the AI to take the last object</p>
    </div>
  );
}
