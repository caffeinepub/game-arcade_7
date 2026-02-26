import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

// Simplified backgammon: 24 points, player moves from 24→1, AI from 1→24
// Player = red (checkers), AI = white
interface Point { red: number; white: number; }

function initBoard(): Point[] {
  const b: Point[] = Array(24).fill(null).map(() => ({ red: 0, white: 0 }));
  // Standard setup (point indices 0=bar-entry, 23=home-entry)
  b[0] = { red: 0, white: 2 }; b[5] = { red: 5, white: 0 };
  b[7] = { red: 3, white: 0 }; b[11] = { red: 0, white: 5 };
  b[12] = { red: 5, white: 0 }; b[16] = { red: 0, white: 3 };
  b[18] = { red: 0, white: 5 }; b[23] = { red: 2, white: 0 };
  return b;
}

function rollDice(): [number, number] {
  return [Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)];
}

export default function BackgammonGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [board, setBoard] = useState<Point[]>(() => initBoard());
  const [dice, setDice] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [turn, setTurn] = useState<"player" | "ai">("player");
  const [status, setStatus] = useState("Roll dice to start!");
  const [redBornOff, setRedBornOff] = useState(0);
  const [whiteBornOff, setWhiteBornOff] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [moves, setMoves] = useState(0);

  const rollForPlayer = useCallback(() => {
    if (turn !== "player" || dice.length > 0 || !isActive) return;
    const d = rollDice();
    const diceArr = d[0] === d[1] ? [d[0], d[0], d[0], d[0]] : [d[0], d[1]];
    setDice(diceArr);
    setStatus(`Rolled ${d[0]}, ${d[1]} — click a red piece to move`);
  }, [turn, dice, isActive]);

  const getValidMoves = useCallback((from: number, diceLeft: number[]) => {
    const valid: { to: number; die: number }[] = [];
    const p = board[from];
    if (!p || p.red === 0) return valid;
    for (const die of [...new Set(diceLeft)]) {
      const to = from - die;
      if (to < 0) {
        // Bear off: only if all red checkers in home (points 0-5)
        const allHome = board.every((pt, i) => i > 5 || pt.red === 0);
        if (allHome) valid.push({ to: -1, die });
      } else if (board[to].white <= 1) {
        valid.push({ to, die });
      }
    }
    return valid;
  }, [board]);

  const handlePointClick = useCallback((idx: number) => {
    if (!isActive || gameOver || turn !== "player" || dice.length === 0) return;

    if (selected !== null) {
      const valids = getValidMoves(selected, dice);
      const move = valids.find(v => v.to === idx);
      if (move) {
        const nb = board.map(p => ({ ...p }));
        nb[selected].red--;
        if (idx >= 0) {
          if (nb[idx].white === 1) nb[idx].white = 0; // hit
          nb[idx].red++;
        } else {
          setRedBornOff(prev => {
            const newVal = prev + 1;
            if (newVal >= 15) { setGameOver(true); setStatus("YOU WIN! 🎉"); const sc = Math.max(0, 1000 - moves); onGameOver(sc); }
            return newVal;
          });
        }
        setBoard(nb);
        setMoves(m => { const nm = m + 1; onScoreUpdate(Math.max(0, 1000 - nm)); return nm; });
        const newDice = [...dice];
        const di = newDice.indexOf(move.die);
        if (di >= 0) newDice.splice(di, 1);
        setDice(newDice);
        setSelected(null);
        if (newDice.length === 0) {
          setStatus("AI THINKING...");
          setTurn("ai");
          setTimeout(() => {
            const d2 = rollDice();
            const dArr = d2[0] === d2[1] ? [d2[0],d2[0],d2[0],d2[0]] : [d2[0],d2[1]];
            let cb = nb.map(pt => ({ ...pt }));
            let remDice = [...dArr];
            let aiBO = 0;
            for (let attempt = 0; attempt < 4 && remDice.length > 0; attempt++) {
              let moved = false;
              for (let from2 = 23; from2 >= 0; from2--) {
                if (cb[from2].white === 0) continue;
                for (const die of [...new Set(remDice)]) {
                  const to2 = from2 + die;
                  if (to2 > 23) {
                    const allHome = cb.every((pt, i) => i < 18 || pt.white === 0);
                    if (allHome) { cb[from2].white--; aiBO++; const di2 = remDice.indexOf(die); if (di2>=0) remDice.splice(di2,1); moved = true; break; }
                  } else if (cb[to2].red <= 1) { cb[from2].white--; cb[to2].white++; const di2 = remDice.indexOf(die); if (di2>=0) remDice.splice(di2,1); moved = true; break; }
                }
                if (moved) break;
              }
              if (!moved) break;
            }
            setWhiteBornOff(prev => {
              const total = prev + aiBO;
              if (total >= 15) { setGameOver(true); setStatus("AI WINS!"); onGameOver(0); }
              return total;
            });
            setBoard(cb);
            setTurn("player"); setDice([]); setStatus("YOUR TURN — Roll dice!");
          }, 1200);
        }
        return;
      }
      setSelected(null);
    }
    if (board[idx].red > 0) { setSelected(idx); setStatus(`Selected point ${idx + 1} — click destination`); }
  }, [board, selected, dice, turn, gameOver, isActive, moves, getValidMoves, onGameOver, onScoreUpdate]);

  const reset = () => { setBoard(initBoard()); setDice([]); setSelected(null); setTurn("player"); setStatus("Roll dice to start!"); setRedBornOff(0); setWhiteBornOff(0); setGameOver(false); setMoves(0); };

  const PWIDTH = 32, PHEIGHT = 60;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="font-arcade text-[10px] text-center" style={{ color: "#fff200", minHeight: 18 }}>{status}</div>

      <div className="flex gap-3 items-center mb-1">
        <span className="font-mono-tech text-xs" style={{ color: "#ff4444" }}>🔴 Born off: {redBornOff}/15</span>
        <span className="font-mono-tech text-xs" style={{ color: "#fff" }}>⚪ Born off: {whiteBornOff}/15</span>
        {dice.length > 0 && <span className="font-arcade text-xs" style={{ color: "#00f5ff" }}>🎲 {dice.join(", ")}</span>}
      </div>

      {/* Board visualization */}
      <div style={{ display: "flex", gap: 4, padding: 8, background: "rgba(139,90,43,0.1)", border: "2px solid rgba(139,90,43,0.3)", borderRadius: 4 }}>
        {/* Top half (12-23) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", gap: 2 }}>
            {Array.from({length:12},(_,i)=>i+12).map(i => {
              const p = board[i];
              const isSel = selected === i;
              const isValid = selected !== null && getValidMoves(selected, dice).some(v => v.to === i);
              return (
                <button type="button" key={`pt-${i}`} onClick={() => handlePointClick(i)}
                  style={{ width: PWIDTH, minHeight: PHEIGHT, background: isValid ? "rgba(57,255,20,0.2)" : isSel ? "rgba(255,242,0,0.2)" : (i%2===0?"rgba(80,40,0,0.3)":"rgba(0,40,80,0.3)"), border: `1px solid ${isSel?"#fff200":isValid?"#39ff14":"rgba(255,255,255,0.1)"}`, borderRadius: 2, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: 2, fontSize: 9, color: "rgba(255,255,255,0.4)", gap: 1 }}>
                  <span>{i+1}</span>
                  {Array.from({length:p.red},(_,k)=><div key={k} style={{width:18,height:18,borderRadius:"50%",background:"radial-gradient(circle,#ff6666,#cc0000)"}} />)}
                  {Array.from({length:p.white},(_,k)=><div key={k} style={{width:18,height:18,borderRadius:"50%",background:"radial-gradient(circle,#fff,#ccc)"}} />)}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            {Array.from({length:12},(_,i)=>11-i).map(i => {
              const p = board[i];
              const isSel = selected === i;
              const isValid = selected !== null && getValidMoves(selected, dice).some(v => v.to === i);
              return (
                <button type="button" key={`pb-${i}`} onClick={() => handlePointClick(i)}
                  style={{ width: PWIDTH, minHeight: PHEIGHT, background: isValid ? "rgba(57,255,20,0.2)" : isSel ? "rgba(255,242,0,0.2)" : (i%2===0?"rgba(80,40,0,0.3)":"rgba(0,40,80,0.3)"), border: `1px solid ${isSel?"#fff200":isValid?"#39ff14":"rgba(255,255,255,0.1)"}`, borderRadius: 2, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: 2, fontSize: 9, color: "rgba(255,255,255,0.4)", gap: 1 }}>
                  {Array.from({length:p.red},(_,k)=><div key={k} style={{width:18,height:18,borderRadius:"50%",background:"radial-gradient(circle,#ff6666,#cc0000)"}} />)}
                  {Array.from({length:p.white},(_,k)=><div key={k} style={{width:18,height:18,borderRadius:"50%",background:"radial-gradient(circle,#fff,#ccc)"}} />)}
                  <span>{i+1}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        {turn === "player" && dice.length === 0 && !gameOver && (
          <button type="button" onClick={rollForPlayer} className="font-arcade text-[10px] px-4 py-2 rounded" style={{ background: "transparent", color: "#fff200", border: "1px solid #fff200" }}>🎲 ROLL</button>
        )}
        {selected !== null && getValidMoves(selected, dice).some(v => v.to === -1) && (
          <button type="button" onClick={() => handlePointClick(-1)} className="font-arcade text-[9px] px-3 py-1 rounded" style={{ background: "transparent", color: "#ff2d8e", border: "1px solid #ff2d8e" }}>BEAR OFF</button>
        )}
        <button type="button" onClick={reset} className="font-arcade text-[9px] px-3 py-1 rounded" style={{ background: "transparent", color: "#00f5ff", border: "1px solid #00f5ff" }}>NEW</button>
      </div>
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Red = You • Move pieces toward point 1 to bear off</p>
    </div>
  );
}
