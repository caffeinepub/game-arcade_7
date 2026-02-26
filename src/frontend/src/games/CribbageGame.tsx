import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

type Suit = "♠" | "♥" | "♦" | "♣";
interface Card { rank: number; suit: Suit; }
const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RED: Suit[] = ["♥", "♦"];

function createDeck(): Card[] {
  return SUITS.flatMap(s => Array.from({ length: 13 }, (_, i) => ({ rank: i + 1, suit: s }))).sort(() => Math.random() - 0.5);
}

function rankLabel(r: number) {
  if (r === 1) return "A"; if (r === 11) return "J"; if (r === 12) return "Q"; if (r === 13) return "K"; return String(r);
}

function cardValue(r: number): number { return Math.min(r, 10); }

function countHand(hand: Card[], starter: Card): number {
  const all = [...hand, starter];
  let pts = 0;
  // Fifteens
  for (let i = 1; i < (1 << all.length); i++) {
    const subset = all.filter((_, bit) => (i >> bit) & 1);
    if (subset.reduce((s, c) => s + cardValue(c.rank), 0) === 15) pts += 2;
  }
  // Pairs
  for (let i = 0; i < all.length; i++) for (let j = i+1; j < all.length; j++) {
    if (all[i].rank === all[j].rank) pts += 2;
  }
  // Runs
  const ranks = all.map(c => c.rank).sort((a,b) => a-b);
  for (let len = 5; len >= 3; len--) {
    for (let start = 0; start <= all.length - len; start++) {
      const sub = ranks.slice(start, start+len);
      if (sub.every((v,i) => i === 0 || v === sub[i-1]+1) && new Set(sub).size === len) { pts += len; }
    }
  }
  // Flush (4+ same suit in hand, 5 if includes starter)
  const handSuits = hand.map(c => c.suit);
  if (handSuits.every(s => s === handSuits[0])) pts += handSuits.length === 4 && starter.suit === handSuits[0] ? 5 : 4;
  // His nobs
  if (hand.some(c => c.rank === 11 && c.suit === starter.suit)) pts += 1;
  return pts;
}

type Phase = "deal" | "discard" | "play" | "show" | "over";

export default function CribbageGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [deck, setDeck] = useState<Card[]>(() => createDeck());
  const [hand, setHand] = useState<Card[]>([]);
  const [crib, setCrib] = useState<Card[]>([]);
  const [aiHand, setAiHand] = useState<Card[]>([]);
  const [starter, setStarter] = useState<Card | null>(null);
  const [phase, setPhase] = useState<Phase>("deal");
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);
  const [discarded, setDiscarded] = useState<boolean[]>([false,false,false,false,false,false]);
  const [status, setStatus] = useState("Press DEAL to start");
  const [lastPoints, setLastPoints] = useState("");

  const deal = useCallback(() => {
    const d = createDeck();
    const ph = d.slice(0, 6);
    const ah = d.slice(6, 12);
    setDeck(d.slice(12)); setHand(ph); setAiHand(ah); setCrib([]); setStarter(null);
    setDiscarded([false,false,false,false,false,false]);
    setPhase("discard"); setStatus("DISCARD 2 cards to the crib");
  }, []);

  const toggleDiscard = (i: number) => {
    if (phase !== "discard" || !isActive) return;
    const count = discarded.filter(Boolean).length;
    if (!discarded[i] && count >= 2) return;
    setDiscarded(prev => prev.map((v,idx) => idx===i ? !v : v));
  };

  const submitDiscard = useCallback(() => {
    if (phase !== "discard" || discarded.filter(Boolean).length !== 2) return;
    const keptHand = hand.filter((_, i) => !discarded[i]);
    const playerCrib = hand.filter((_, i) => discarded[i]);
    // AI discards 2
    const aiCrib = aiHand.slice(0, 2);
    const keptAiHand = aiHand.slice(2);
    const newCrib = [...playerCrib, ...aiCrib];
    // Cut starter
    const newStarter = deck[0];
    setCrib(newCrib); setHand(keptHand); setAiHand(keptAiHand); setStarter(newStarter);
    setPhase("show"); setStatus("Counting hands...");
    setTimeout(() => {
      const playerPts = countHand(keptHand, newStarter);
      const aiPts = countHand(keptAiHand, newStarter);
      const cribPts = countHand(newCrib, newStarter);
      const newPS = playerScore + playerPts;
      const newAS = aiScore + aiPts + cribPts;
      setPlayerScore(newPS); setAiScore(newAS); onScoreUpdate(newPS);
      setLastPoints(`You: +${playerPts} AI: +${aiPts} Crib: +${cribPts}`);
      setStatus(`Scores — You: ${newPS} AI: ${newAS}`);
      setPhase("over");
      if (newPS >= 121) { onGameOver(newPS); }
      else if (newAS >= 121) { onGameOver(newPS); }
    }, 500);
  }, [phase, hand, aiHand, deck, crib, discarded, playerScore, aiScore, onGameOver, onScoreUpdate]);

  const CardView = ({ card, selected, onClick }: { card: Card; selected?: boolean; onClick?: () => void }) => (
    <button type="button" onClick={onClick}
      style={{ width: 48, height: 68, borderRadius: 6, padding: 0, cursor: onClick ? "pointer" : "default",
        background: selected ? "rgba(255,242,0,0.2)" : "rgba(15,15,25,0.95)",
        border: `2px solid ${selected ? "#fff200" : "rgba(255,255,255,0.15)"}`,
        boxShadow: selected ? "0 0 10px rgba(255,242,0,0.4)" : "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: "bold", color: RED.includes(card.suit) ? "#ff4444" : "#fff" }}>
      {rankLabel(card.rank)}{card.suit}
    </button>
  );

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="flex gap-6">
        <span className="font-arcade text-[10px]" style={{ color: "#39ff14" }}>YOU: {playerScore}/121</span>
        <span className="font-arcade text-[10px]" style={{ color: "#ff4444" }}>AI: {aiScore}/121</span>
      </div>
      <div className="font-arcade text-[10px]" style={{ color: "#fff200", textAlign: "center" }}>{status}</div>
      {lastPoints && <div className="font-mono-tech text-xs" style={{ color: "#00f5ff" }}>{lastPoints}</div>}

      {starter && (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Starter:</span>
          <CardView card={starter} />
        </div>
      )}

      <div>
        <div className="font-arcade text-[9px] mb-2" style={{ color: "#39ff14" }}>YOUR HAND</div>
        <div style={{ display: "flex", gap: 4 }}>
          {hand.map((c, i) => <CardView key={`ph-${i}`} card={c} selected={phase==="discard" && discarded[i]} onClick={phase==="discard" ? () => toggleDiscard(i) : undefined} />)}
        </div>
      </div>

      {phase === "show" || phase === "over" ? (
        <div>
          <div className="font-arcade text-[9px] mb-2" style={{ color: "#ff4444" }}>AI HAND</div>
          <div style={{ display: "flex", gap: 4 }}>
            {aiHand.map((c, i) => <CardView key={`ai-${i}`} card={c} />)}
          </div>
        </div>
      ) : null}

      <div className="flex gap-3 mt-1">
        {phase === "deal" && <button type="button" onClick={deal} className="font-arcade text-[10px] px-4 py-2 rounded" style={{ background: "rgba(57,255,20,0.15)", color: "#39ff14", border: "1px solid #39ff14" }}>DEAL</button>}
        {phase === "discard" && discarded.filter(Boolean).length === 2 && (
          <button type="button" onClick={submitDiscard} className="font-arcade text-[10px] px-4 py-2 rounded" style={{ background: "rgba(255,68,68,0.15)", color: "#ff4444", border: "1px solid #ff4444" }}>DISCARD TO CRIB</button>
        )}
        {phase === "over" && (
          <button type="button" onClick={() => { setPhase("deal"); setHand([]); setAiHand([]); setLastPoints(""); }} className="font-arcade text-[10px] px-4 py-2 rounded" style={{ background: "rgba(0,245,255,0.15)", color: "#00f5ff", border: "1px solid #00f5ff" }}>NEXT HAND</button>
        )}
      </div>
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>First to 121 points wins</p>
    </div>
  );
}
