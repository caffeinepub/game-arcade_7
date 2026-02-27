import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

type Card = { rank: number; suit: string; id: string };

const SUITS = ["♠","♥","♦","♣"];
function rankLabel(r: number) {
  if (r === 1) return "A"; if (r === 10) return "10"; if (r === 11) return "J"; if (r === 12) return "Q"; if (r === 13) return "K";
  return String(r);
}
function isRed(s: string) { return s === "♥" || s === "♦"; }
function cardValue(r: number) { return r === 1 ? 1 : Math.min(r, 10); }

function createDeck(): Card[] {
  const d: Card[] = [];
  for (const s of SUITS) for (let r = 1; r <= 13; r++) d.push({ rank: r, suit: s, id: `${s}${r}` });
  return d.sort(() => Math.random() - 0.5);
}

// Pyramid has 7 rows: row i has (i+1) cards
// Card at [r][c] is covered by [r+1][c] and [r+1][c+1]
function isUncovered(pyramid: (Card | null)[][], r: number, c: number): boolean {
  if (pyramid[r][c] === null) return false;
  if (r === 6) return true;
  return pyramid[r+1][c] === null && pyramid[r+1][c+1] === null;
}

export default function PyramidSolitaireGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [deck] = useState(createDeck);
  const [pyramid, setPyramid] = useState<(Card | null)[][]>(() => {
    const pyr: (Card | null)[][] = [];
    let idx = 0;
    for (let r = 0; r < 7; r++) {
      pyr.push([]);
      for (let c = 0; c <= r; c++) {
        pyr[r].push(deck[idx++]);
      }
    }
    return pyr;
  });
  const [stockIdx, setStockIdx] = useState(28); // pyramid uses 28 cards
  const [stockCards] = useState(() => deck.slice(28));
  const [wasteCard, setWasteCard] = useState<Card | null>(null);
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [score, setScore] = useState(0);
  const [removed, setRemoved] = useState(0);

  const removeCards = useCallback((cards: Card[], newPyr: (Card | null)[][]) => {
    const result = newPyr.map(row => [...row]);
    for (const card of cards) {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < result[r].length; c++) {
          if (result[r][c]?.id === card.id) result[r][c] = null;
        }
      }
    }
    return result;
  }, []);

  const tryPair = useCallback((card1: Card, card2: Card | null) => {
    if (!card2) {
      if (cardValue(card1.rank) + (card1.rank === 1 ? 12 : 0) === 13 || card1.rank === 13) {
        // King alone
        if (card1.rank === 13) return true;
      }
      return false;
    }
    return cardValue(card1.rank) + cardValue(card2.rank) === 13 ||
      (card1.rank + card2.rank === 13);
  }, []);

  const handlePyramidClick = useCallback((r: number, c: number) => {
    if (!isActive) return;
    const card = pyramid[r][c];
    if (!card) return;
    if (!isUncovered(pyramid, r, c)) return;

    // King alone
    if (card.rank === 13) {
      const newPyr = removeCards([card], pyramid);
      const newScore = score + 130;
      const newRemoved = removed + 1;
      setPyramid(newPyr);
      setScore(newScore);
      setRemoved(newRemoved);
      onScoreUpdate(newScore);
      if (newRemoved === 28) setTimeout(() => onGameOver(newScore + 500), 500);
      return;
    }

    if (selected) {
      const selCard = pyramid[selected.r][selected.c];
      if (selCard && selCard.rank + card.rank === 13) {
        const newPyr = removeCards([selCard, card], pyramid);
        const newScore = score + (selCard.rank + card.rank) * 5;
        const newRemoved = removed + 2;
        setPyramid(newPyr);
        setScore(newScore);
        setRemoved(newRemoved);
        setSelected(null);
        onScoreUpdate(newScore);
        if (newRemoved === 28) setTimeout(() => onGameOver(newScore + 500), 500);
        return;
      }
    }

    setSelected({ r, c });
  }, [isActive, pyramid, selected, score, removed, removeCards, onScoreUpdate, onGameOver]);

  const handleWasteClick = useCallback(() => {
    if (!isActive || !wasteCard) return;

    if (wasteCard.rank === 13) {
      setWasteCard(null);
      const newScore = score + 130;
      setScore(newScore);
      onScoreUpdate(newScore);
      return;
    }

    if (selected) {
      const selCard = pyramid[selected.r][selected.c];
      if (selCard && selCard.rank + wasteCard.rank === 13) {
        const newPyr = removeCards([selCard], pyramid);
        const newScore = score + (selCard.rank + wasteCard.rank) * 5;
        const newRemoved = removed + 2;
        setPyramid(newPyr);
        setWasteCard(null);
        setScore(newScore);
        setRemoved(newRemoved);
        setSelected(null);
        onScoreUpdate(newScore);
        if (newRemoved === 28) setTimeout(() => onGameOver(newScore + 500), 500);
        return;
      }
    }

    setSelected(null);
    // Select waste card for future matching
  }, [isActive, wasteCard, selected, pyramid, score, removed, removeCards, onScoreUpdate, onGameOver]);

  const drawStock = useCallback(() => {
    if (!isActive) return;
    if (stockIdx >= stockCards.length) {
      onGameOver(score);
      return;
    }
    setWasteCard(stockCards[stockIdx]);
    setStockIdx(i => i + 1);
    setSelected(null);
  }, [isActive, stockIdx, stockCards, score, onGameOver]);

  const CELL = 38;

  return (
    <div className="flex flex-col items-center gap-3 p-3" style={{ minHeight: 500 }}>
      <div className="flex gap-5 font-arcade text-xs">
        <span style={{ color: "#ff2d8e" }}>PYRAMID</span>
        <span style={{ color: "#39ff14" }}>CLEARED: {removed}/28</span>
        <span style={{ color: "#00f5ff" }}>SCORE: {score}</span>
      </div>

      {/* Pyramid */}
      <div className="flex flex-col items-center gap-1">
        {pyramid.map((row, r) => (
          <div key={`pyr-row-${r}`} className="flex gap-1">
            {row.map((card, c) => {
              if (!card) {
                return <div key={`pyr-empty-${r}-${c}`} style={{ width: CELL, height: CELL + 10 }} />;
              }
              const uncov = isUncovered(pyramid, r, c);
              const isSel = selected?.r === r && selected?.c === c;
              const red = isRed(card.suit);
              return (
                <button
                  key={`pyr-${card.id}`}
                  type="button"
                  onClick={() => handlePyramidClick(r, c)}
                  className="rounded flex flex-col items-center justify-center transition-all"
                  style={{
                    width: CELL,
                    height: CELL + 10,
                    background: isSel ? "rgba(0,245,255,0.2)" : uncov ? "#1a1a2e" : "#0f0f1a",
                    border: `1px solid ${isSel ? "#00f5ff" : uncov ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}`,
                    boxShadow: isSel ? "0 0 10px #00f5ff66" : "none",
                    color: red ? "#ff4444" : "#e8e8e8",
                    fontSize: 9,
                    fontFamily: "monospace",
                    opacity: uncov ? 1 : 0.5,
                    cursor: uncov ? "pointer" : "not-allowed",
                  }}
                >
                  <span style={{ lineHeight: 1 }}>{rankLabel(card.rank)}</span>
                  <span style={{ fontSize: 12 }}>{card.suit}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Stock + waste */}
      <div className="flex gap-4 items-center mt-2">
        <button
          type="button"
          onClick={drawStock}
          className="rounded flex items-center justify-center"
          style={{
            width: CELL + 4,
            height: CELL + 14,
            background: stockIdx < stockCards.length ? "#0d0d1a" : "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          {stockIdx < stockCards.length ? "⊞" : "✕"}
        </button>

        {wasteCard ? (
          <button
            type="button"
            onClick={handleWasteClick}
            className="rounded flex flex-col items-center justify-center"
            style={{
              width: CELL + 4,
              height: CELL + 14,
              background: "#1a1a2e",
              border: "1px solid rgba(255,255,255,0.25)",
              color: isRed(wasteCard.suit) ? "#ff4444" : "#e8e8e8",
              fontSize: 10,
              fontFamily: "monospace",
              cursor: "pointer",
            }}
          >
            <span>{rankLabel(wasteCard.rank)}</span>
            <span style={{ fontSize: 14 }}>{wasteCard.suit}</span>
          </button>
        ) : <div style={{ width: CELL + 4, height: CELL + 14 }} />}
      </div>

      <p className="font-mono-tech text-xs text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
        Click pairs of cards summing to 13 (A=1, J=11, Q=12, K=13 alone). Kings score solo!
      </p>
    </div>
  );
}
