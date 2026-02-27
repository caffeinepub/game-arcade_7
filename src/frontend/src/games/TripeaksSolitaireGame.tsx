import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

type Card = { rank: number; suit: string; id: string; faceUp: boolean };

const SUITS = ["♠","♥","♦","♣"];

function rankLabel(r: number) {
  if (r === 1) return "A"; if (r === 11) return "J"; if (r === 12) return "Q"; if (r === 13) return "K";
  return String(r);
}

function isRed(suit: string) { return suit === "♥" || suit === "♦"; }

function createDeck(): Card[] {
  const d: Card[] = [];
  for (const s of SUITS) for (let r = 1; r <= 13; r++) d.push({ rank: r, suit: s, id: `${s}${r}`, faceUp: false });
  return d.sort(() => Math.random() - 0.5);
}

function canPlay(card: Card, topCard: Card | null): boolean {
  if (!topCard) return false;
  const diff = Math.abs(card.rank - topCard.rank);
  return diff === 1 || (card.rank === 1 && topCard.rank === 13) || (card.rank === 13 && topCard.rank === 1);
}

// TriPeaks layout: 3 peaks, each 4 rows
// Row positions: row0=[0,4,8], row1=[1,2,5,6,9,10], row2=[1,2,3,5,6,7,9,10,11], row3=all 10 base
const LAYOUT = [
  // [col, row, coverBy indices in layout]
  { r: 0, c: 0 },  // 0: peak 1
  { r: 0, c: 4 },  // 1: peak 2
  { r: 0, c: 8 },  // 2: peak 3

  { r: 1, c: -1 }, // 3: under peak1 left
  { r: 1, c: 1 },  // 4: under peak1 right
  { r: 1, c: 3 },  // 5: under peak2 left
  { r: 1, c: 5 },  // 6: under peak2 right
  { r: 1, c: 7 },  // 7: under peak3 left
  { r: 1, c: 9 },  // 8: under peak3 right

  { r: 2, c: -2 }, // 9
  { r: 2, c: 0 },  // 10
  { r: 2, c: 2 },  // 11
  { r: 2, c: 4 },  // 12
  { r: 2, c: 6 },  // 13
  { r: 2, c: 8 },  // 14
  { r: 2, c: 10 }, // 15

  // Row 3: base 10 cards
  { r: 3, c: 0 }, { r: 3, c: 1 }, { r: 3, c: 2 }, { r: 3, c: 3 },
  { r: 3, c: 4 }, { r: 3, c: 5 }, { r: 3, c: 6 }, { r: 3, c: 7 },
  { r: 3, c: 8 }, { r: 3, c: 9 },
];

// Which cards cover a given card (simplified: cards in layout[i] cover layout[i-x])
function isUncovered(idx: number, removed: Set<number>): boolean {
  // A card is uncovered if neither of the cards that cover it is present
  // Simple approach: row 3 always uncovered, others depend on row below
  const layout = LAYOUT[idx];
  if (layout.r === 3) return true;

  // Find cards in the row below that overlap
  const coversIdx: number[] = [];
  for (let j = 0; j < LAYOUT.length; j++) {
    if (j === idx) continue;
    const other = LAYOUT[j];
    if (other.r === layout.r + 1 && Math.abs(other.c - layout.c) <= 1) {
      coversIdx.push(j);
    }
  }
  return coversIdx.every(j => removed.has(j));
}

export default function TripeaksSolitaireGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [deck] = useState<Card[]>(createDeck);
  const [pyramidCards] = useState<Card[]>(() => deck.slice(0, 26).map((c, i) => ({ ...c, faceUp: true, id: `${c.suit}${c.rank}-tri` + i })));
  const [stockCards] = useState<Card[]>(() => deck.slice(26).map(c => ({ ...c, faceUp: false })));
  const [stockIdx, setStockIdx] = useState(0);
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const topCard = stockIdx > 0 ? { ...stockCards[stockIdx - 1], faceUp: true } : null;

  const handleCardClick = useCallback((idx: number) => {
    if (!isActive || gameOver || removed.has(idx)) return;
    if (!isUncovered(idx, removed)) return;

    const card = pyramidCards[idx];
    if (!canPlay(card, topCard)) return;

    const newRemoved = new Set(removed);
    newRemoved.add(idx);
    const newStreak = streak + 1;
    const pts = 100 * newStreak;
    const newScore = score + pts;

    setRemoved(newRemoved);
    setStreak(newStreak);
    setScore(newScore);
    onScoreUpdate(newScore);

    if (newRemoved.size === pyramidCards.length) {
      setGameOver(true);
      setTimeout(() => onGameOver(newScore + 1000), 600);
    }
  }, [isActive, gameOver, removed, pyramidCards, topCard, streak, score, onScoreUpdate, onGameOver]);

  const drawFromStock = useCallback(() => {
    if (!isActive || gameOver) return;
    if (stockIdx >= stockCards.length) {
      setGameOver(true);
      onGameOver(score);
      return;
    }
    setStockIdx(i => i + 1);
    setStreak(0);
  }, [isActive, gameOver, stockIdx, stockCards.length, score, onGameOver]);

  const CARD_W = 46;
  const CARD_H = 62;
  const COL_W = 28;

  const renderCard = (card: Card | null, key: string, onClick?: () => void, dim?: boolean) => {
    if (!card) return null;
    const red = isRed(card.suit);
    return (
      <button
        key={key}
        type="button"
        onClick={onClick}
        className="rounded flex flex-col items-center justify-center transition-all"
        style={{
          width: CARD_W,
          height: CARD_H,
          background: card.faceUp ? "#1a1a2e" : "#0d0d1a",
          border: `1px solid ${dim ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.2)"}`,
          color: red ? "#ff4444" : "#e8e8e8",
          fontSize: 11,
          fontFamily: "monospace",
          cursor: onClick ? "pointer" : "default",
          opacity: dim ? 0.4 : 1,
          flexShrink: 0,
        }}
      >
        {card.faceUp ? (
          <><span style={{ lineHeight: 1 }}>{rankLabel(card.rank)}</span><span style={{ fontSize: 14 }}>{card.suit}</span></>
        ) : (
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 18 }}>⊞</span>
        )}
      </button>
    );
  };

  const totalCards = pyramidCards.length;
  const removedCount = removed.size;

  return (
    <div className="flex flex-col items-center gap-4 p-4" style={{ minHeight: 480 }}>
      <div className="flex gap-6 font-arcade text-xs">
        <span style={{ color: "#fff200" }}>TRIPEAKS</span>
        <span style={{ color: "#39ff14" }}>CLEARED: {removedCount}/{totalCards}</span>
        <span style={{ color: "#00f5ff" }}>SCORE: {score}</span>
        {streak > 1 && <span style={{ color: "#ff2d8e" }}>×{streak} STREAK</span>}
      </div>

      {/* Pyramid - simplified visualization */}
      <div className="relative" style={{ width: LAYOUT.length > 0 ? 10 * COL_W + CARD_W : 400, height: 4 * 70 + CARD_H }}>
        {pyramidCards.map((card, idx) => {
          if (idx >= LAYOUT.length) return null;
          const pos = LAYOUT[idx];
          const isGone = removed.has(idx);
          const isAvail = !isGone && isUncovered(idx, removed) && canPlay(card, topCard);

          return renderCard(
            isGone ? null : card,
            `tri-${card.id}`,
            isAvail && !isGone ? () => handleCardClick(idx) : undefined,
            !isAvail && !isGone,
          );
        }).map((el, idx) => {
          if (!el || idx >= LAYOUT.length) return null;
          const pos = LAYOUT[idx];
          return (
            <div
              key={`tri-pos-${idx}`}
              style={{
                position: "absolute",
                left: pos.c * COL_W + (pos.r * 0),
                top: pos.r * 70,
              }}
            >
              {el}
            </div>
          );
        })}
      </div>

      {/* Stock + waste */}
      <div className="flex gap-4 items-center">
        <button
          type="button"
          onClick={drawFromStock}
          className="rounded flex items-center justify-center"
          style={{
            width: CARD_W,
            height: CARD_H,
            background: stockIdx < stockCards.length ? "#0d0d1a" : "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            fontSize: 20,
            cursor: "pointer",
          }}
        >
          {stockIdx < stockCards.length ? "⊞" : "✕"}
        </button>

        {topCard && (
          <div style={{ position: "relative" }}>
            {renderCard(topCard, "tri-top", undefined, false)}
          </div>
        )}

        <div className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          {stockCards.length - stockIdx} left
        </div>
      </div>

      <p className="font-mono-tech text-xs text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
        Click cards ±1 from the top card to remove them. Clear all 3 peaks!
      </p>
    </div>
  );
}
