import { useState, useCallback, useEffect } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const EMOJIS = ["🐉", "🦄", "🔥", "⚡", "🌟", "💎", "🎮", "🚀"];

interface Card {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

function createCards(): Card[] {
  const pairs = [...EMOJIS, ...EMOJIS];
  const shuffled = pairs.sort(() => Math.random() - 0.5);
  return shuffled.map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
}

export default function MemoryGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [cards, setCards] = useState<Card[]>(() => createCards());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [started, setStarted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [matchedCount, setMatchedCount] = useState(0);

  const startGame = useCallback(() => {
    setCards(createCards());
    setFlipped([]);
    setMoves(0);
    setStarted(true);
    setLocked(false);
    setMatchedCount(0);
    onScoreUpdate(0);
  }, [onScoreUpdate]);

  const handleCardClick = useCallback((id: number) => {
    if (!started || locked) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.flipped || card.matched) return;
    if (flipped.length === 1 && flipped[0] === id) return;

    const newFlipped = [...flipped, id];
    setCards((prev) => prev.map((c) => c.id === id ? { ...c, flipped: true } : c));
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => {
        const newMoves = m + 1;
        const score = Math.max(0, 1000 - newMoves * 10);
        onScoreUpdate(score);
        return newMoves;
      });
      setLocked(true);

      const [id1, id2] = newFlipped;
      const card1 = cards.find((c) => c.id === id1);
      const card2 = cards.find((c) => c.id === id2);

      if (card1?.emoji === card2?.emoji) {
        // Match
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === id1 || c.id === id2 ? { ...c, matched: true, flipped: true } : c
            )
          );
          setFlipped([]);
          setLocked(false);
          setMatchedCount((mc) => {
            const newMc = mc + 1;
            if (newMc === EMOJIS.length) {
              setMoves((finalMoves) => {
                const finalScore = Math.max(0, 1000 - finalMoves * 10);
                onGameOver(finalScore);
                return finalMoves;
              });
            }
            return newMc;
          });
        }, 600);
      } else {
        // No match
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) =>
              c.id === id1 || c.id === id2 ? { ...c, flipped: false } : c
            )
          );
          setFlipped([]);
          setLocked(false);
        }, 1000);
      }
    }
  }, [started, locked, flipped, cards, onScoreUpdate, onGameOver]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          padding: 16,
          background: "rgba(191,95,255,0.05)",
          border: "1px solid rgba(191,95,255,0.3)",
          borderRadius: 4,
        }}
      >
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => handleCardClick(card.id)}
            className="flex items-center justify-center rounded transition-all duration-300"
            style={{
              width: 68,
              height: 68,
              fontSize: 28,
              cursor: card.matched || card.flipped ? "default" : "pointer",
              background: card.matched
                ? "rgba(57,255,20,0.2)"
                : card.flipped
                ? "rgba(191,95,255,0.3)"
                : "rgba(191,95,255,0.08)",
              border: card.matched
                ? "2px solid #39ff14"
                : card.flipped
                ? "2px solid #bf5fff"
                : "2px solid rgba(191,95,255,0.25)",
              boxShadow: card.matched
                ? "0 0 15px rgba(57,255,20,0.4)"
                : card.flipped
                ? "0 0 12px rgba(191,95,255,0.5)"
                : "none",
              transform: card.flipped || card.matched ? "rotateY(0deg)" : "rotateY(180deg)",
            }}
          >
            {card.flipped || card.matched ? card.emoji : "?"}
          </button>
        ))}
      </div>

      <p className="font-mono-tech text-sm text-muted-foreground">
        Moves: <span style={{ color: "#bf5fff" }}>{moves}</span>
        {started && (
          <span className="ml-4">
            Score: <span style={{ color: "#00f5ff" }}>{Math.max(0, 1000 - moves * 10)}</span>
          </span>
        )}
      </p>

      {!started && (
        <button
          type="button"
          onClick={startGame}
          className="font-arcade text-xs px-6 py-3 transition-all"
          style={{
            color: "#bf5fff",
            border: "1px solid #bf5fff",
            boxShadow: "0 0 10px rgba(191,95,255,0.4)",
          }}
        >
          START GAME
        </button>
      )}
    </div>
  );
}
