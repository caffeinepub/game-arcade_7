import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

// Board: pits[0-5] = player, pits[6] = player store, pits[7-12] = AI, pits[13] = AI store
function initBoard(): number[] {
  return [4,4,4,4,4,4, 0, 4,4,4,4,4,4, 0];
}

function sow(board: number[], idx: number, isPlayer: boolean): { newBoard: number[]; extraTurn: boolean; captured: boolean } {
  const nb = [...board];
  let stones = nb[idx];
  nb[idx] = 0;
  let pos = idx;
  while (stones > 0) {
    pos = (pos + 1) % 14;
    // Skip opponent's store
    if (isPlayer && pos === 13) continue;
    if (!isPlayer && pos === 6) continue;
    nb[pos]++;
    stones--;
  }
  const store = isPlayer ? 6 : 13;
  const extraTurn = pos === store;
  // Capture
  let captured = false;
  if (isPlayer && pos >= 0 && pos <= 5 && nb[pos] === 1 && nb[12 - pos] > 0) {
    nb[6] += nb[pos] + nb[12 - pos];
    nb[pos] = 0; nb[12 - pos] = 0;
    captured = true;
  }
  return { newBoard: nb, extraTurn, captured };
}

function checkGameOver(board: number[]): boolean {
  const playerEmpty = board.slice(0, 6).every(v => v === 0);
  const aiEmpty = board.slice(7, 13).every(v => v === 0);
  return playerEmpty || aiEmpty;
}

function finishGame(board: number[]): number[] {
  const nb = [...board];
  for (let i = 0; i < 6; i++) { nb[6] += nb[i]; nb[i] = 0; }
  for (let i = 7; i < 13; i++) { nb[13] += nb[i]; nb[i] = 0; }
  return nb;
}

function aiChoose(board: number[]): number {
  // Prefer extra turn, then capture, then most stones
  let best = -1, bestScore = -Infinity;
  for (let i = 7; i <= 12; i++) {
    if (board[i] === 0) continue;
    const { newBoard, extraTurn, captured } = sow(board, i, false);
    const score = extraTurn ? 100 : captured ? 50 : newBoard[13];
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best;
}

export default function MancalaGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [board, setBoard] = useState<number[]>(() => initBoard());
  const [turn, setTurn] = useState<"player"|"ai">("player");
  const [status, setStatus] = useState("YOUR TURN — click a pit");
  const [gameOver, setGameOver] = useState(false);

  const endGame = useCallback((b: number[]) => {
    const fb = finishGame(b);
    setBoard(fb);
    const ps = fb[6], as = fb[13];
    setStatus(ps > as ? `YOU WIN! ${ps}-${as} 🎉` : as > ps ? `AI WINS! ${as}-${ps}` : `DRAW! ${ps}-${as}`);
    setGameOver(true);
    onGameOver(ps);
  }, [onGameOver]);

  const handleClick = useCallback((idx: number) => {
    if (!isActive || gameOver || turn !== "player") return;
    if (idx < 0 || idx > 5 || board[idx] === 0) return;
    const { newBoard, extraTurn } = sow(board, idx, true);
    onScoreUpdate(newBoard[6]);
    if (checkGameOver(newBoard)) { endGame(newBoard); return; }
    setBoard(newBoard);
    if (extraTurn) { setStatus("EXTRA TURN! Click again"); return; }
    setTurn("ai"); setStatus("AI THINKING...");
    setTimeout(() => {
      const aiIdx = aiChoose(newBoard);
      if (aiIdx < 0) { endGame(newBoard); return; }
      const { newBoard: nb2, extraTurn: aiExtra } = sow(newBoard, aiIdx, false);
      if (checkGameOver(nb2)) { endGame(nb2); return; }
      setBoard(nb2); onScoreUpdate(nb2[6]);
      if (aiExtra) {
        setTimeout(() => {
          const aiIdx2 = aiChoose(nb2);
          if (aiIdx2 < 0) { setTurn("player"); setStatus("YOUR TURN"); return; }
          const { newBoard: nb3 } = sow(nb2, aiIdx2, false);
          if (checkGameOver(nb3)) { endGame(nb3); return; }
          setBoard(nb3); onScoreUpdate(nb3[6]);
          setTurn("player"); setStatus("YOUR TURN");
        }, 600);
      } else {
        setTurn("player"); setStatus("YOUR TURN");
      }
    }, 800);
  }, [board, turn, gameOver, isActive, endGame, onScoreUpdate]);

  const reset = () => { setBoard(initBoard()); setTurn("player"); setStatus("YOUR TURN — click a pit"); setGameOver(false); };
  const PIT_SIZE = 56;
  const STONE_COLORS = ["#ff4444","#ff8800","#fff200","#39ff14","#00f5ff","#bf5fff"];

  const PitView = ({ count, idx, clickable, highlight }: { count: number; idx: number; clickable: boolean; highlight: boolean }) => (
    <button type="button" onClick={() => clickable && handleClick(idx)}
      style={{
        width: PIT_SIZE, height: PIT_SIZE, borderRadius: "50%",
        background: highlight ? "rgba(255,68,68,0.2)" : "rgba(10,10,20,0.6)",
        border: `2px solid ${highlight ? "#ff4444" : "rgba(255,68,68,0.2)"}`,
        cursor: clickable ? "pointer" : "default",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, fontWeight: "bold",
        color: "#ff4444", fontFamily: "'Orbitron', sans-serif",
        boxShadow: highlight ? "0 0 12px rgba(255,68,68,0.4)" : "none",
      }}>
      {count}
    </button>
  );

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <div className="font-arcade text-[10px]" style={{ color: turn === "player" ? "#ff4444" : "#00f5ff" }}>{status}</div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 12, background: "rgba(255,68,68,0.04)", border: "2px solid rgba(255,68,68,0.15)", borderRadius: 12 }}>
        {/* Player store */}
        <div style={{ width: 48, height: PIT_SIZE * 2 + 8, borderRadius: 8, background: "rgba(255,68,68,0.1)", border: "2px solid rgba(255,68,68,0.3)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
          <span className="font-arcade text-[9px]" style={{ color: "#ff4444" }}>YOU</span>
          <span className="font-arcade text-xl" style={{ color: "#ff4444" }}>{board[6]}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {/* AI row (pits 7-12, displayed right to left) */}
          <div style={{ display: "flex", gap: 6 }}>
            {[12,11,10,9,8,7].map(i => (
              <div key={`ai-pit-${i}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span className="font-arcade text-[8px]" style={{ color: "#00f5ff" }}>{13-i}</span>
                <PitView count={board[i]} idx={i} clickable={false} highlight={false} />
              </div>
            ))}
          </div>
          {/* Player row */}
          <div style={{ display: "flex", gap: 6 }}>
            {[0,1,2,3,4,5].map(i => (
              <div key={`p-pit-${i}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <PitView count={board[i]} idx={i} clickable={turn === "player" && !gameOver && board[i] > 0} highlight={turn === "player" && !gameOver && board[i] > 0} />
                <span className="font-arcade text-[8px]" style={{ color: "#ff4444" }}>{i+1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI store */}
        <div style={{ width: 48, height: PIT_SIZE * 2 + 8, borderRadius: 8, background: "rgba(0,245,255,0.1)", border: "2px solid rgba(0,245,255,0.3)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
          <span className="font-arcade text-[9px]" style={{ color: "#00f5ff" }}>AI</span>
          <span className="font-arcade text-xl" style={{ color: "#00f5ff" }}>{board[13]}</span>
        </div>
      </div>

      <button type="button" onClick={reset} className="font-arcade text-[9px] px-3 py-1 rounded" style={{ background: "transparent", color: "#39ff14", border: "1px solid #39ff14" }}>NEW GAME</button>
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Click your pits (bottom row) to sow stones counterclockwise</p>
    </div>
  );
}
