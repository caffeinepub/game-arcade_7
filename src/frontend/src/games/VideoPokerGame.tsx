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

function handRank(hand: Card[]): { rank: string; payout: number } {
  const ranks = hand.map(c => c.rank).sort((a, b) => a - b);
  const suits = hand.map(c => c.suit);
  const counts: Record<number, number> = {};
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
  const vals = Object.values(counts).sort((a, b) => b - a);
  const isFlush = suits.every(s => s === suits[0]);
  const isStraight = (ranks[4] - ranks[0] === 4 && vals[0] === 1) || (JSON.stringify(ranks) === JSON.stringify([1,10,11,12,13]));
  const isRoyal = isStraight && isFlush && ranks[0] === 1 && ranks[1] === 10;

  if (isRoyal) return { rank: "ROYAL FLUSH", payout: 800 };
  if (isStraight && isFlush) return { rank: "STRAIGHT FLUSH", payout: 50 };
  if (vals[0] === 4) return { rank: "FOUR OF A KIND", payout: 25 };
  if (vals[0] === 3 && vals[1] === 2) return { rank: "FULL HOUSE", payout: 9 };
  if (isFlush) return { rank: "FLUSH", payout: 6 };
  if (isStraight) return { rank: "STRAIGHT", payout: 4 };
  if (vals[0] === 3) return { rank: "THREE OF A KIND", payout: 3 };
  if (vals[0] === 2 && vals[1] === 2) return { rank: "TWO PAIR", payout: 2 };
  if (vals[0] === 2) {
    const pair = parseInt(Object.entries(counts).find(([, v]) => v === 2)![0]);
    if (pair === 1 || pair >= 11) return { rank: "JACKS OR BETTER", payout: 1 };
  }
  return { rank: "", payout: 0 };
}

type Phase = "deal" | "hold" | "result";

export default function VideoPokerGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [deck, setDeck] = useState<Card[]>(() => createDeck());
  const [hand, setHand] = useState<Card[]>([]);
  const [held, setHeld] = useState<boolean[]>([false,false,false,false,false]);
  const [phase, setPhase] = useState<Phase>("deal");
  const [credits, setCredits] = useState(100);
  const [bet] = useState(5);
  const [result, setResult] = useState("");
  const [totalWon, setTotalWon] = useState(0);

  const dealHand = useCallback(() => {
    if (!isActive || credits < bet) return;
    let d = deck.length < 10 ? createDeck() : [...deck];
    const h: Card[] = [];
    for (let i = 0; i < 5; i++) { h.push(d[0]); d = d.slice(1); }
    setDeck(d); setHand(h); setHeld([false,false,false,false,false]);
    setPhase("hold"); setResult(""); setCredits(c => c - bet);
  }, [deck, credits, bet, isActive]);

  const draw = useCallback(() => {
    if (phase !== "hold" || !isActive) return;
    let d = [...deck];
    const nh = hand.map((c, i) => {
      if (held[i]) return c;
      const nc = d[0]; d = d.slice(1); return nc;
    });
    setDeck(d); setHand(nh); setPhase("result");
    const { rank, payout } = handRank(nh);
    const won = payout * bet;
    const newCredits = credits + won;
    setCredits(newCredits);
    const newTotal = totalWon + won;
    setTotalWon(newTotal);
    setResult(rank ? `${rank}! +${won}` : "No win");
    onScoreUpdate(newTotal);
    if (newCredits <= 0) setTimeout(() => onGameOver(newTotal), 500);
  }, [phase, deck, hand, held, credits, bet, totalWon, isActive, onGameOver, onScoreUpdate]);

  const PAYOUTS = [
    ["Royal Flush", "800"], ["Straight Flush", "50"], ["Four of a Kind", "25"],
    ["Full House", "9"], ["Flush", "6"], ["Straight", "4"],
    ["Three of a Kind", "3"], ["Two Pair", "2"], ["Jacks or Better", "1"],
  ];

  const CardView = ({ card, isHeld, onClick }: { card: Card; isHeld: boolean; onClick: () => void }) => (
    <button type="button" onClick={onClick}
      style={{
        width: 60, height: 86, borderRadius: 6, padding: 0, cursor: phase === "hold" ? "pointer" : "default",
        background: isHeld ? "rgba(57,255,20,0.15)" : "rgba(15,15,25,0.95)",
        border: `2px solid ${isHeld ? "#39ff14" : "rgba(255,255,255,0.15)"}`,
        boxShadow: isHeld ? "0 0 12px rgba(57,255,20,0.4)" : "none",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
      }}>
      <span style={{ fontSize: 16, fontWeight: "bold", color: RED.includes(card.suit) ? "#ff4444" : "#fff" }}>
        {rankLabel(card.rank)}{card.suit}
      </span>
      {isHeld && <span className="font-arcade" style={{ fontSize: 7, color: "#39ff14" }}>HELD</span>}
    </button>
  );

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="flex gap-4">
        <span className="font-arcade text-[10px]" style={{ color: "#39ff14" }}>💰 {credits}</span>
        <span className="font-arcade text-[10px]" style={{ color: "#fff200" }}>BET: {bet}</span>
        <span className="font-arcade text-[10px]" style={{ color: "#bf5fff" }}>WON: {totalWon}</span>
      </div>

      {/* Payout table */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "2px 16px", padding: "6px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 4, border: "1px solid rgba(255,255,255,0.06)" }}>
        {PAYOUTS.map(([name, val]) => (
          <>
            <span key={`${name}-n`} className="font-mono-tech text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>{name}</span>
            <span key={`${name}-v`} className="font-arcade text-[10px]" style={{ color: "#fff200" }}>{val}</span>
          </>
        ))}
      </div>

      {/* Hand */}
      <div style={{ display: "flex", gap: 8 }}>
        {hand.map((c, i) => (
          <CardView key={`vp-${i}`} card={c} isHeld={held[i]} onClick={() => phase === "hold" && setHeld(h => h.map((v, idx) => idx === i ? !v : v))} />
        ))}
        {hand.length === 0 && Array.from({length:5}).map((_,i) => (
          <div key={`emp-${i}`} style={{ width: 60, height: 86, borderRadius: 6, border: "2px dashed rgba(255,255,255,0.1)" }} />
        ))}
      </div>

      <div className="font-arcade text-[10px]" style={{ color: result.includes("No") ? "#ff4444" : "#39ff14", minHeight: 20 }}>{result}</div>

      <div className="flex gap-3">
        {phase === "deal" && (
          <button type="button" onClick={dealHand} disabled={credits < bet} className="font-arcade text-[10px] px-4 py-2 rounded" style={{ background: "rgba(57,255,20,0.15)", color: "#39ff14", border: "1px solid #39ff14" }}>DEAL</button>
        )}
        {phase === "hold" && (
          <button type="button" onClick={draw} className="font-arcade text-[10px] px-4 py-2 rounded" style={{ background: "rgba(191,95,255,0.15)", color: "#bf5fff", border: "1px solid #bf5fff" }}>DRAW</button>
        )}
        {phase === "result" && (
          <button type="button" onClick={() => setPhase("deal")} className="font-arcade text-[10px] px-4 py-2 rounded" style={{ background: "rgba(0,245,255,0.15)", color: "#00f5ff", border: "1px solid #00f5ff" }}>NEXT HAND</button>
        )}
      </div>
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Click cards to hold • Jacks or Better pays</p>
    </div>
  );
}
