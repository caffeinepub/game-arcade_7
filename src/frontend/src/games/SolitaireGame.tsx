import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

type Suit = "♠" | "♥" | "♦" | "♣";
type CardObj = { suit: Suit; rank: number; faceUp: boolean };

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RED: Suit[] = ["♥", "♦"];

function createDeck(): CardObj[] {
  const d: CardObj[] = [];
  for (const suit of SUITS) for (let r = 1; r <= 13; r++) d.push({ suit, rank: r, faceUp: false });
  return d.sort(() => Math.random() - 0.5);
}

function rankLabel(r: number) {
  if (r === 1) return "A"; if (r === 11) return "J"; if (r === 12) return "Q"; if (r === 13) return "K";
  return String(r);
}

function isRed(suit: Suit) { return RED.includes(suit); }

function initGame() {
  const deck = createDeck();
  const tableau: CardObj[][] = Array(7).fill(null).map(() => []);
  let idx = 0;
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      tableau[col].push({ ...deck[idx++], faceUp: row === col });
    }
  }
  const stock = deck.slice(idx).map(c => ({ ...c, faceUp: false }));
  const waste: CardObj[] = [];
  const foundations: CardObj[][] = [[], [], [], []];
  return { tableau, stock, waste, foundations };
}

type GameState = ReturnType<typeof initGame>;
type Source = { type: "tableau"; col: number; idx: number } | { type: "waste" };

export default function SolitaireGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [state, setState] = useState<GameState>(() => initGame());
  const [selected, setSelected] = useState<Source | null>(null);
  const [score, setScore] = useState(0);
  const [won, setWon] = useState(false);

  const calcScore = useCallback((s: GameState) => s.foundations.reduce((a, f) => a + f.length * 10, 0), []);

  const canPlaceOnFoundation = (card: CardObj, foundation: CardObj[]): boolean => {
    if (foundation.length === 0) return card.rank === 1;
    const top = foundation[foundation.length - 1];
    return card.suit === top.suit && card.rank === top.rank + 1;
  };

  const canPlaceOnTableau = (card: CardObj, col: CardObj[]): boolean => {
    if (col.length === 0) return card.rank === 13;
    const top = col[col.length - 1];
    if (!top.faceUp) return false;
    return isRed(card.suit) !== isRed(top.suit) && card.rank === top.rank - 1;
  };

  const handleStock = useCallback(() => {
    setState(prev => {
      const s = { ...prev, tableau: prev.tableau.map(c => [...c]), foundations: prev.foundations.map(f => [...f]), waste: [...prev.waste], stock: [...prev.stock] };
      if (s.stock.length === 0) {
        s.stock = s.waste.reverse().map(c => ({ ...c, faceUp: false }));
        s.waste = [];
      } else {
        const c = { ...s.stock.pop()!, faceUp: true };
        s.waste.push(c);
      }
      return s;
    });
  }, []);

  const getCards = useCallback((src: Source, s: GameState): CardObj[] => {
    if (src.type === "waste") return s.waste.length > 0 ? [s.waste[s.waste.length - 1]] : [];
    const col = s.tableau[src.col];
    return col.slice(src.idx);
  }, []);

  const handleSelect = useCallback((src: Source) => {
    if (!isActive || won) return;
    if (!selected) {
      const cards = getCards(src, state);
      if (cards.length === 0) return;
      if (!cards[0].faceUp) return;
      setSelected(src);
      return;
    }
    // Try to place
    const cards = getCards(selected, state);
    if (cards.length === 0) { setSelected(null); return; }

    setState(prev => {
      const s = { ...prev, tableau: prev.tableau.map(c => [...c]), foundations: prev.foundations.map(f => [...f]), waste: [...prev.waste], stock: [...prev.stock] };
      const movingCards = getCards(selected, s);

      if (src.type === "tableau") {
        if (!canPlaceOnTableau(movingCards[0], s.tableau[src.col])) return prev;
        // Remove from source
        if (selected.type === "waste") s.waste.pop();
        else { s.tableau[selected.col] = s.tableau[selected.col].slice(0, selected.idx); }
        // Flip top of source
        if (selected.type === "tableau" && s.tableau[selected.col].length > 0) {
          const top = s.tableau[selected.col][s.tableau[selected.col].length - 1];
          if (!top.faceUp) s.tableau[selected.col][s.tableau[selected.col].length - 1] = { ...top, faceUp: true };
        }
        s.tableau[src.col].push(...movingCards);
      }
      return s;
    });

    setSelected(null);
    setScore(calcScore(state));
    onScoreUpdate(calcScore(state));
  }, [selected, state, isActive, won, getCards, calcScore, onScoreUpdate]);

  const moveToFoundation = useCallback((src: Source) => {
    if (!isActive || won) return;
    const cards = getCards(src, state);
    if (cards.length !== 1) return;
    const card = cards[0];

    setState(prev => {
      const s = { ...prev, tableau: prev.tableau.map(c => [...c]), foundations: prev.foundations.map(f => [...f]), waste: [...prev.waste], stock: [...prev.stock] };
      for (let fi = 0; fi < 4; fi++) {
        if (canPlaceOnFoundation(card, s.foundations[fi])) {
          if (src.type === "waste") s.waste.pop();
          else { s.tableau[src.col] = s.tableau[src.col].slice(0, src.idx); if (s.tableau[src.col].length > 0) { const t = s.tableau[src.col][s.tableau[src.col].length-1]; if (!t.faceUp) s.tableau[src.col][s.tableau[src.col].length-1] = { ...t, faceUp: true }; } }
          s.foundations[fi].push(card);
          const ns = s.foundations.reduce((a, f) => a + f.length * 10, 0);
          const isWon = s.foundations.every(f => f.length === 13);
          if (isWon) setTimeout(() => { setWon(true); onGameOver(ns); }, 100);
          else { onScoreUpdate(ns); }
          setScore(ns);
          return s;
        }
      }
      return prev;
    });
    setSelected(null);
  }, [state, isActive, won, getCards, onGameOver, onScoreUpdate]);

  const CWIDTH = 60, CHEIGHT = 80;

  const CardView = ({ card, small = false }: { card: CardObj; small?: boolean }) => (
    <div style={{
      width: small ? 36 : CWIDTH, height: small ? 50 : CHEIGHT,
      borderRadius: 4,
      background: card.faceUp ? "rgba(20,20,30,0.95)" : "repeating-linear-gradient(45deg, rgba(0,100,150,0.3) 0px, rgba(0,100,150,0.3) 2px, rgba(0,50,100,0.2) 2px, rgba(0,50,100,0.2) 4px)",
      border: `1px solid ${card.faceUp ? "rgba(255,255,255,0.2)" : "rgba(0,150,200,0.3)"}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: small ? 10 : 13, fontWeight: "bold",
      color: card.faceUp ? (isRed(card.suit) ? "#ff4444" : "#ffffff") : "transparent",
      flexShrink: 0,
    }}>
      {card.faceUp && `${rankLabel(card.rank)}${card.suit}`}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-3 select-none" style={{ maxWidth: 520 }}>
      {/* Top row */}
      <div className="flex gap-2 items-start justify-between w-full px-2">
        {/* Stock + Waste */}
        <div className="flex gap-2">
          <button type="button" onClick={handleStock} style={{ background: "none", border: "1px solid rgba(0,245,255,0.3)", borderRadius: 4, width: CWIDTH, height: CHEIGHT, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#00f5ff", fontSize: 22 }}>
            {state.stock.length > 0 ? "🂠" : "↩"}
          </button>
          <button type="button"
            onClick={() => state.waste.length > 0 && (selected?.type === "waste" ? setSelected(null) : handleSelect({ type: "waste" }))}
            onDoubleClick={() => state.waste.length > 0 && moveToFoundation({ type: "waste" })}
            style={{ background: selected?.type === "waste" ? "rgba(255,242,0,0.2)" : "none", border: selected?.type === "waste" ? "1px solid #fff200" : "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: 0, cursor: "pointer" }}>
            {state.waste.length > 0 ? <CardView card={state.waste[state.waste.length - 1]} /> : <div style={{ width: CWIDTH, height: CHEIGHT, border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 4 }} />}
          </button>
        </div>
        {/* Foundations */}
        <div className="flex gap-2">
          {state.foundations.map((f, fi) => (
            <button type="button" key={`f${fi}`} style={{ background: "none", border: "1px dashed rgba(57,255,20,0.3)", borderRadius: 4, padding: 0, cursor: "pointer", width: CWIDTH, height: CHEIGHT, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {f.length > 0 ? <CardView card={f[f.length - 1]} /> : <span style={{ color: "rgba(57,255,20,0.3)", fontSize: 12 }}>A</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="flex gap-2 items-start px-2">
        {state.tableau.map((col, ci) => (
          <div key={`tcol-${ci}`} style={{ width: CWIDTH, minHeight: CHEIGHT, position: "relative" }}>
            {col.length === 0 ? (
              <button type="button" onClick={() => handleSelect({ type: "tableau", col: ci, idx: 0 })} style={{ width: CWIDTH, height: CHEIGHT, border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 4, background: "none", cursor: "pointer" }} />
            ) : (
              col.map((card, i) => (
                <button type="button" key={`card-${ci}-${i}`}
                  onClick={() => card.faceUp && (selected ? handleSelect({ type: "tableau", col: ci, idx: i }) : handleSelect({ type: "tableau", col: ci, idx: i }))}
                  onDoubleClick={() => i === col.length - 1 && moveToFoundation({ type: "tableau", col: ci, idx: i })}
                  style={{
                    position: "absolute", top: i * 20, left: 0, zIndex: i,
                    background: selected?.type === "tableau" && selected.col === ci && selected.idx <= i && card.faceUp ? "rgba(255,242,0,0.15)" : "none",
                    border: "none", padding: 0, cursor: card.faceUp ? "pointer" : "default"
                  }}>
                  <CardView card={card} />
                </button>
              ))
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-4 mt-1">
        <span className="font-mono-tech text-xs" style={{ color: "#39ff14" }}>Score: {score}</span>
        <button type="button" onClick={() => { setState(initGame()); setScore(0); setWon(false); setSelected(null); }}
          className="font-arcade text-[9px] px-3 py-1 rounded"
          style={{ background: "transparent", color: "#00f5ff", border: "1px solid #00f5ff" }}>NEW</button>
      </div>
      {won && <div className="font-arcade text-sm" style={{ color: "#fff200" }}>YOU WIN! 🎉</div>}
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Click to select • Double-click to auto-move to foundation</p>
    </div>
  );
}
