import { useState, useCallback, useEffect, useRef } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const EMOJIS = ["🔥","⚡","💎","🚀","🎮","🌟","🐉","🦋","🎯","🌈","🎸","🏆","🦄","🎪","🌺","🎲","🦊","🔮","🎭","🌙"];

interface Card { id: number; emoji: string; flipped: boolean; matched: boolean; }

function createCards(): Card[] {
  const pairs = [...EMOJIS, ...EMOJIS].sort(() => Math.random() - 0.5);
  return pairs.map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
}

export default function ConcentrationGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [cards, setCards] = useState<Card[]>(() => createCards());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [started, setStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [flash, setFlash] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGame = useCallback(() => {
    setCards(createCards()); setFlipped([]); setLocked(false); setScore(0);
    setCombo(0); setMatchCount(0); setTimeLeft(120); setStarted(true); setGameOver(false);
  }, []);

  useEffect(() => {
    if (!started || gameOver) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { setGameOver(true); clearInterval(timerRef.current!); onGameOver(score); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [started, gameOver, score, onGameOver]);

  const handleClick = useCallback((id: number) => {
    if (!started || locked || !isActive || gameOver) return;
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;
    if (flipped.length === 1 && flipped[0] === id) return;

    const newFlipped = [...flipped, id];
    setCards(prev => prev.map(c => c.id === id ? { ...c, flipped: true } : c));
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setLocked(true);
      const [id1, id2] = newFlipped;
      const c1 = cards.find(c => c.id === id1)!;
      const c2 = cards.find(c => c.id === id2) ?? { ...c1, id: id2 }; // fallback
      const match = c1.emoji === cards.find(c => c.id === id2)?.emoji;

      if (match) {
        const newCombo = combo + 1;
        const pts = 10 * newCombo; // combo multiplier
        const newScore = score + pts;
        const newMatch = matchCount + 1;
        setCombo(newCombo); setScore(newScore); setMatchCount(newMatch);
        setFlash(`+${pts} × COMBO ${newCombo}!`); setTimeout(() => setFlash(""), 800);
        onScoreUpdate(newScore);
        setTimeout(() => {
          setCards(prev => prev.map(c => c.id === id1 || c.id === id2 ? { ...c, matched: true, flipped: true } : c));
          setFlipped([]); setLocked(false);
          if (newMatch === EMOJIS.length) {
            setGameOver(true);
            if (timerRef.current) clearInterval(timerRef.current);
            onGameOver(newScore);
          }
        }, 500);
      } else {
        setCombo(0);
        setTimeout(() => {
          setCards(prev => prev.map(c => c.id === id1 || c.id === id2 ? { ...c, flipped: false } : c));
          setFlipped([]); setLocked(false);
        }, 900);
      }
    }
  }, [started, locked, isActive, gameOver, cards, flipped, combo, score, matchCount, onGameOver, onScoreUpdate]);

  const CARD_SIZE = 52;
  const timeColor = timeLeft > 60 ? "#39ff14" : timeLeft > 30 ? "#fff200" : "#ff4444";

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {started && (
        <div className="flex gap-6 items-center">
          <span className="font-arcade text-sm" style={{ color: timeColor, textShadow: `0 0 10px ${timeColor}` }}>⏱ {timeLeft}s</span>
          <span className="font-arcade text-xs" style={{ color: "#ff2d8e" }}>Score: {score}</span>
          <span className="font-arcade text-[10px]" style={{ color: "#fff200", minWidth: 120 }}>{flash || (combo > 1 ? `× ${combo} COMBO!` : "")}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: `repeat(8, ${CARD_SIZE}px)`, gap: 6 }}>
        {cards.map(card => (
          <button type="button" key={`conc-${card.id}`} onClick={() => handleClick(card.id)}
            style={{
              width: CARD_SIZE, height: CARD_SIZE, cursor: card.matched || card.flipped ? "default" : "pointer",
              background: card.matched ? "rgba(57,255,20,0.15)" : card.flipped ? "rgba(255,45,142,0.25)" : "rgba(20,5,35,0.8)",
              border: `2px solid ${card.matched ? "#39ff14" : card.flipped ? "#ff2d8e" : "rgba(255,45,142,0.2)"}`,
              borderRadius: 8,
              fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: card.matched ? "0 0 12px rgba(57,255,20,0.4)" : card.flipped ? "0 0 10px rgba(255,45,142,0.5)" : "none",
              transition: "all 0.2s",
            }}>
            {(card.flipped || card.matched) ? card.emoji : "?"}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        {!started && <button type="button" onClick={startGame} className="font-arcade text-[10px] px-5 py-2.5 rounded" style={{ background: "rgba(255,45,142,0.15)", color: "#ff2d8e", border: "1px solid #ff2d8e" }}>START</button>}
        {started && <button type="button" onClick={startGame} className="font-arcade text-[9px] px-3 py-1 rounded" style={{ background: "transparent", color: "#00f5ff", border: "1px solid #00f5ff" }}>RESTART</button>}
      </div>
      {gameOver && <div className="font-arcade text-sm" style={{ color: matchCount === EMOJIS.length ? "#39ff14" : "#ff4444" }}>{matchCount === EMOJIS.length ? "ALL MATCHED! 🎉" : "TIME'S UP!"} Score: {score}</div>}
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Match all 20 pairs • Consecutive matches build combo multiplier</p>
    </div>
  );
}
