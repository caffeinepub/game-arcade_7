import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const COLORS = ["#ff4444","#ff8800","#fff200","#39ff14","#00f5ff","#bf5fff"];
const COLOR_NAMES = ["Red","Orange","Yellow","Green","Cyan","Purple"];
const CODE_LEN = 4;
const MAX_GUESSES = 10;

function genCode(): number[] {
  return Array.from({ length: CODE_LEN }, () => Math.floor(Math.random() * COLORS.length));
}

function getHint(code: number[], guess: number[]): { blacks: number; whites: number } {
  let blacks = 0, whites = 0;
  const codeLeft: number[] = [], guessLeft: number[] = [];
  for (let i = 0; i < CODE_LEN; i++) {
    if (code[i] === guess[i]) blacks++;
    else { codeLeft.push(code[i]); guessLeft.push(guess[i]); }
  }
  for (const g of guessLeft) {
    const idx = codeLeft.indexOf(g);
    if (idx >= 0) { whites++; codeLeft.splice(idx, 1); }
  }
  return { blacks, whites };
}

interface GuessRow { guess: number[]; blacks: number; whites: number; }

export default function MastermindGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [code, setCode] = useState<number[]>(() => genCode());
  const [current, setCurrent] = useState<number[]>([0,0,0,0]);
  const [history, setHistory] = useState<GuessRow[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const submit = useCallback(() => {
    if (!isActive || gameOver || history.length >= MAX_GUESSES) return;
    const { blacks, whites } = getHint(code, current);
    const row: GuessRow = { guess: [...current], blacks, whites };
    const nh = [...history, row];
    setHistory(nh);
    if (blacks === CODE_LEN) {
      const sc = Math.max(0, 1000 - nh.length * 100);
      setWon(true); setGameOver(true); setRevealed(true);
      onScoreUpdate(sc); onGameOver(sc);
    } else if (nh.length >= MAX_GUESSES) {
      setGameOver(true); setRevealed(true); onGameOver(0);
    }
  }, [code, current, history, gameOver, isActive, onGameOver, onScoreUpdate]);

  const reset = () => { setCode(genCode()); setCurrent([0,0,0,0]); setHistory([]); setGameOver(false); setWon(false); setRevealed(false); };

  const ColorPeg = ({ colorIdx, size = 28, onClick, border }: { colorIdx: number; size?: number; onClick?: () => void; border?: string }) => (
    <button type="button" onClick={onClick} style={{ width: size, height: size, borderRadius: "50%", background: COLORS[colorIdx], border: border || "2px solid rgba(255,255,255,0.2)", cursor: onClick ? "pointer" : "default", padding: 0, boxShadow: `0 0 8px ${COLORS[colorIdx]}66` }} />
  );

  const HintPegs = ({ blacks, whites }: { blacks: number; whites: number }) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, width: 28 }}>
      {Array.from({length:4}, (_,i) => (
        <div key={`hint-${i}`} style={{ width: 10, height: 10, borderRadius: "50%", background: i < blacks ? "#ffffff" : i < blacks + whites ? "#888888" : "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }} />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="font-arcade text-[10px]" style={{ color: "#bf5fff" }}>
        {gameOver ? (won ? "🎉 CRACKED IT!" : "GAME OVER") : `GUESS ${history.length + 1}/${MAX_GUESSES}`}
      </div>

      {/* Secret code (revealed at end) */}
      <div style={{ display: "flex", gap: 6, padding: "6px 12px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(191,95,255,0.3)", borderRadius: 20 }}>
        {code.map((c, i) => (
          <div key={`code-${i}`} style={{ width: 28, height: 28, borderRadius: "50%", background: revealed ? COLORS[c] : "rgba(255,255,255,0.05)", border: "2px solid rgba(255,255,255,0.1)", boxShadow: revealed ? `0 0 10px ${COLORS[c]}` : "none" }} />
        ))}
        {!revealed && <span className="font-arcade text-[9px] self-center ml-2" style={{ color: "rgba(255,255,255,0.3)" }}>SECRET</span>}
      </div>

      {/* History */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 280, overflowY: "auto" }}>
        {history.map((row, ri) => (
          <div key={`row-${ri}`} style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 8px", background: "rgba(255,255,255,0.03)", borderRadius: 20, border: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="font-arcade text-[9px] w-6" style={{ color: "rgba(255,255,255,0.3)" }}>{ri+1}</span>
            {row.guess.map((c, ci) => <ColorPeg key={`g-${ri}-${ci}`} colorIdx={c} />)}
            <HintPegs blacks={row.blacks} whites={row.whites} />
            <span className="font-mono-tech text-[10px]" style={{ color: row.blacks === 4 ? "#39ff14" : "rgba(255,255,255,0.5)" }}>⚫{row.blacks} ⚪{row.whites}</span>
          </div>
        ))}
      </div>

      {/* Current guess input */}
      {!gameOver && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 16px", background: "rgba(191,95,255,0.08)", borderRadius: 24, border: "1px solid rgba(191,95,255,0.3)" }}>
          {current.map((c, i) => (
            <ColorPeg key={`cur-${i}`} colorIdx={c}
              onClick={() => setCurrent(prev => prev.map((v,idx) => idx===i ? (v+1)%COLORS.length : v))}
              border="3px solid rgba(255,255,255,0.5)" />
          ))}
          <button type="button" onClick={submit}
            className="font-arcade text-[9px] px-3 py-1 rounded-full"
            style={{ background: "rgba(191,95,255,0.3)", color: "#bf5fff", border: "1px solid #bf5fff", marginLeft: 4 }}>CHECK</button>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
        {COLORS.map((col, i) => <div key={`col-${i}`} style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: col }} />
          <span className="font-mono-tech" style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>{i}</span>
        </div>)}
      </div>

      <button type="button" onClick={reset} className="font-arcade text-[9px] px-3 py-1 rounded" style={{ background: "transparent", color: "#39ff14", border: "1px solid #39ff14" }}>NEW GAME</button>
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Click color pegs to change • ⚫=exact ⚪=wrong position</p>
    </div>
  );
}
