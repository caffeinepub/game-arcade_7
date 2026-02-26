import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

type Suit = "♠" | "♥" | "♦" | "♣";
interface Card { rank: number; suit: Suit; hidden?: boolean; }

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RED_SUITS: Suit[] = ["♥", "♦"];

function createDeck(): Card[] {
  return SUITS.flatMap(suit => Array.from({ length: 13 }, (_, i) => ({ rank: i + 1, suit }))).sort(() => Math.random() - 0.5);
}

function rankLabel(r: number) {
  if (r === 1) return "A"; if (r === 11) return "J"; if (r === 12) return "Q"; if (r === 13) return "K"; return String(r);
}

function handValue(hand: Card[]): number {
  let sum = 0, aces = 0;
  for (const c of hand) {
    if (c.hidden) continue;
    const v = c.rank >= 10 ? 10 : c.rank;
    if (c.rank === 1) aces++;
    sum += v;
  }
  while (aces > 0 && sum + 10 <= 21) { sum += 10; aces--; }
  return sum;
}

type Phase = "bet" | "play" | "over";

export default function BlackjackGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [deck, setDeck] = useState<Card[]>(() => createDeck());
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [phase, setPhase] = useState<Phase>("bet");
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [status, setStatus] = useState("Press DEAL to start!");
  const [credits, setCredits] = useState(100);
  const [bet, setBet] = useState(10);

  const drawCard = useCallback((d: Card[], hidden = false): [Card, Card[]] => {
    const newDeck = d.length < 10 ? createDeck() : [...d];
    const card = { ...newDeck[0], hidden };
    return [card, newDeck.slice(1)];
  }, []);

  const deal = useCallback(() => {
    if (!isActive || credits < bet) return;
    let d = [...deck];
    let p: Card[] = [], dealer: Card[] = [];
    let c: Card;
    [c, d] = drawCard(d); p.push(c);
    [c, d] = drawCard(d); dealer.push(c);
    [c, d] = drawCard(d); p.push(c);
    [c, d] = drawCard(d, true); dealer.push(c);
    setDeck(d); setPlayerHand(p); setDealerHand(dealer);
    setPhase("play"); setCredits(prev => prev - bet);
    const pv = handValue(p);
    if (pv === 21) {
      revealAndResolve(p, dealer, d, true);
      return;
    }
    setStatus("HIT or STAND?");
  }, [deck, drawCard, credits, bet, isActive]);

  const revealAndResolve = useCallback((ph: Card[], dh: Card[], d: Card[], playerBJ = false) => {
    let curD = [...d];
    let dHand = dh.map(c => ({ ...c, hidden: false as boolean }));
    let dv = handValue(dHand);
    while (dv < 17) {
      const c: Card = curD[0]; curD = curD.slice(1);
      dHand = [...dHand, { ...c, hidden: false as boolean }];
      dv = handValue(dHand);
    }
    const pv = handValue(ph);
    setDeck(curD); setDealerHand(dHand); setPhase("over");
    let msg = "";
    let won = false;
    if (playerBJ && dv !== 21) { msg = "BLACKJACK! 🎉"; won = true; setCredits(c => c + bet * 2.5); }
    else if (pv > 21) { msg = "BUST! You lose."; }
    else if (dv > 21) { msg = "Dealer BUST! You win!"; won = true; setCredits(c => c + bet * 2); }
    else if (pv > dv) { msg = "YOU WIN! 🎉"; won = true; setCredits(c => c + bet * 2); }
    else if (dv > pv) { msg = "DEALER WINS"; }
    else { msg = "PUSH — Tie!"; setCredits(c => c + bet); }
    if (won) setWins(w => { const nw = w + 1; onScoreUpdate(nw * 100); return nw; });
    else if (!msg.includes("PUSH")) setLosses(l => l + 1);
    setStatus(msg);
    setCredits(prev => {
      if (prev <= 0) { setTimeout(() => onGameOver(wins * 100), 500); }
      return prev;
    });
  }, [bet, wins, onGameOver, onScoreUpdate]);

  const hit = useCallback(() => {
    if (phase !== "play" || !isActive) return;
    let [card, newDeck] = drawCard(deck);
    const np = [...playerHand, card];
    setDeck(newDeck); setPlayerHand(np);
    const pv = handValue(np);
    if (pv >= 21) { revealAndResolve(np, dealerHand, newDeck); }
    else setStatus("HIT or STAND?");
  }, [phase, deck, playerHand, dealerHand, drawCard, revealAndResolve, isActive]);

  const stand = useCallback(() => {
    if (phase !== "play" || !isActive) return;
    revealAndResolve(playerHand, dealerHand, deck);
  }, [phase, playerHand, dealerHand, deck, revealAndResolve, isActive]);

  const double = useCallback(() => {
    if (phase !== "play" || !isActive || credits < bet) return;
    setCredits(c => c - bet);
    setBet(b => b * 2);
    let [card, newDeck] = drawCard(deck);
    const np = [...playerHand, card];
    setDeck(newDeck); setPlayerHand(np);
    revealAndResolve(np, dealerHand, newDeck);
  }, [phase, deck, playerHand, dealerHand, drawCard, revealAndResolve, credits, bet, isActive]);

  const CardView = ({ card }: { card: Card }) => (
    <div style={{
      width: 52, height: 72, borderRadius: 6,
      background: card.hidden ? "repeating-linear-gradient(45deg, rgba(0,100,180,0.3) 0px, rgba(0,100,180,0.3) 2px, rgba(0,50,100,0.2) 2px, rgba(0,50,100,0.2) 4px)" : "rgba(15,15,25,0.95)",
      border: "1px solid rgba(255,255,255,0.15)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      {!card.hidden && (
        <span style={{ fontSize: 13, fontWeight: "bold", color: RED_SUITS.includes(card.suit) ? "#ff4444" : "#fff" }}>
          {rankLabel(card.rank)}{card.suit}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <div className="flex gap-6">
        <span className="font-arcade text-[10px]" style={{ color: "#39ff14" }}>💰 {credits}</span>
        <span className="font-arcade text-[10px]" style={{ color: "#fff200" }}>W:{wins} L:{losses}</span>
        <span className="font-mono-tech text-xs" style={{ color: "#00f5ff" }}>Bet: {bet}</span>
      </div>

      <div>
        <div className="font-arcade text-[9px] mb-2" style={{ color: "#ff4444" }}>DEALER — {phase !== "bet" ? handValue(dealerHand) : ""}</div>
        <div style={{ display: "flex", gap: 6 }}>
          {dealerHand.map((c, i) => <CardView key={`dc-${i}`} card={c} />)}
        </div>
      </div>

      <div className="font-arcade text-[10px]" style={{ color: "#fff200", minHeight: 20 }}>{status}</div>

      <div>
        <div className="font-arcade text-[9px] mb-2" style={{ color: "#39ff14" }}>YOU — {phase !== "bet" ? handValue(playerHand) : ""}</div>
        <div style={{ display: "flex", gap: 6 }}>
          {playerHand.map((c, i) => <CardView key={`pc-${i}`} card={c} />)}
        </div>
      </div>

      <div className="flex gap-3">
        {phase === "bet" && (
          <>
            <div style={{ display: "flex", gap: 2 }}>
              {[5,10,25,50].map(b => (
                <button type="button" key={`bet-${b}`} onClick={() => setBet(b)} className="font-arcade text-[9px] px-2 py-1 rounded"
                  style={{ background: bet===b?"rgba(255,242,0,0.2)":"transparent", color: "#fff200", border: `1px solid ${bet===b?"#fff200":"rgba(255,242,0,0.3)"}` }}>${b}</button>
              ))}
            </div>
            <button type="button" onClick={deal} className="font-arcade text-[10px] px-4 py-2 rounded"
              style={{ background: "rgba(57,255,20,0.15)", color: "#39ff14", border: "1px solid #39ff14" }}>DEAL</button>
          </>
        )}
        {phase === "play" && (
          <>
            <button type="button" onClick={hit} className="font-arcade text-[10px] px-3 py-2 rounded" style={{ background: "transparent", color: "#00f5ff", border: "1px solid #00f5ff" }}>HIT</button>
            <button type="button" onClick={stand} className="font-arcade text-[10px] px-3 py-2 rounded" style={{ background: "transparent", color: "#ff4444", border: "1px solid #ff4444" }}>STAND</button>
            {playerHand.length === 2 && credits >= bet && (
              <button type="button" onClick={double} className="font-arcade text-[10px] px-3 py-2 rounded" style={{ background: "transparent", color: "#fff200", border: "1px solid #fff200" }}>DOUBLE</button>
            )}
          </>
        )}
        {phase === "over" && (
          <button type="button" onClick={() => { setBet(b => Math.min(b, credits)); setPhase("bet"); setPlayerHand([]); setDealerHand([]); setStatus("Press DEAL to start!"); }}
            className="font-arcade text-[10px] px-4 py-2 rounded"
            style={{ background: "rgba(57,255,20,0.15)", color: "#39ff14", border: "1px solid #39ff14" }}>NEXT HAND</button>
        )}
      </div>
    </div>
  );
}
