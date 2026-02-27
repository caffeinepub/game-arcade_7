import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

type Suit = "♠" | "♥" | "♦" | "♣";
type Card = { suit: Suit; rank: number; id: string };

const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
const RED_SUITS: Suit[] = ["♥", "♦"];

function isRed(suit: Suit) { return RED_SUITS.includes(suit); }
function rankLabel(r: number) {
  if (r === 1) return "A";
  if (r === 11) return "J";
  if (r === 12) return "Q";
  if (r === 13) return "K";
  return String(r);
}

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let r = 1; r <= 13; r++) {
      deck.push({ suit, rank: r, id: `${suit}${r}` });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

interface GameState {
  tableau: (Card | null)[][];
  freeCells: (Card | null)[];
  foundations: Card[][];
}

function initGame(): GameState {
  const deck = createDeck();
  const tableau: (Card | null)[][] = Array(8).fill(null).map(() => []);
  for (let i = 0; i < deck.length; i++) {
    tableau[i % 8].push(deck[i]);
  }
  return { tableau, freeCells: [null, null, null, null], foundations: [[], [], [], []] };
}

function getTopCard(col: (Card | null)[]): Card | null {
  for (let i = col.length - 1; i >= 0; i--) {
    if (col[i] !== null) return col[i];
  }
  return null;
}

function canPlaceOnFoundation(card: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) return card.rank === 1;
  const top = foundation[foundation.length - 1];
  return top.suit === card.suit && card.rank === top.rank + 1;
}

function canPlaceOnTableau(card: Card, col: (Card | null)[]): boolean {
  const nonNull = col.filter(Boolean) as Card[];
  if (nonNull.length === 0) return true;
  const top = nonNull[nonNull.length - 1];
  return isRed(card.suit) !== isRed(top.suit) && card.rank === top.rank - 1;
}

function getFoundationIdx(suit: Suit): number {
  return SUITS.indexOf(suit);
}

function autoFoundation(st: GameState): GameState {
  let changed = true;
  let s = st;
  while (changed) {
    changed = false;
    for (let col = 0; col < 8; col++) {
      const top = getTopCard(s.tableau[col]);
      if (!top) continue;
      const fi = getFoundationIdx(top.suit);
      if (canPlaceOnFoundation(top, s.foundations[fi])) {
        const newTab = s.tableau.map((c, i) => i === col ? [...c.slice(0, -1)] : c);
        const newFound = s.foundations.map((f, i) => i === fi ? [...f, top] : f);
        s = { ...s, tableau: newTab, foundations: newFound };
        changed = true;
      }
    }
    for (let fc = 0; fc < 4; fc++) {
      const card = s.freeCells[fc];
      if (!card) continue;
      const fi = getFoundationIdx(card.suit);
      if (canPlaceOnFoundation(card, s.foundations[fi])) {
        const newFC = [...s.freeCells];
        newFC[fc] = null;
        const newFound = s.foundations.map((f, i) => i === fi ? [...f, card] : f);
        s = { ...s, freeCells: newFC, foundations: newFound };
        changed = true;
      }
    }
  }
  return s;
}

type Source = { type: "tableau"; col: number } | { type: "freecell"; idx: number };

export default function FreeCellGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [state, setState] = useState<GameState>(initGame);
  const [selected, setSelected] = useState<Source | null>(null);
  const [score, setScore] = useState(0);
  const [won, setWon] = useState(false);

  const getSelectedCard = useCallback((): Card | null => {
    if (!selected) return null;
    if (selected.type === "tableau") return getTopCard(state.tableau[selected.col]);
    return state.freeCells[selected.idx];
  }, [selected, state]);

  const applyMove = useCallback((targetType: "tableau" | "foundation" | "freecell", targetIdx: number) => {
    const card = getSelectedCard();
    if (!card || !selected) { setSelected(null); return; }

    let newState = { ...state, tableau: state.tableau.map(c => [...c]), freeCells: [...state.freeCells], foundations: state.foundations.map(f => [...f]) };

    // Remove card from source
    if (selected.type === "tableau") {
      newState.tableau[selected.col] = newState.tableau[selected.col].filter(x => x?.id !== card.id);
    } else {
      newState.freeCells[selected.idx] = null;
    }

    // Place card at target
    if (targetType === "tableau") {
      if (!canPlaceOnTableau(card, newState.tableau[targetIdx])) { setSelected(null); return; }
      newState.tableau[targetIdx] = [...newState.tableau[targetIdx], card];
    } else if (targetType === "foundation") {
      if (!canPlaceOnFoundation(card, newState.foundations[targetIdx])) { setSelected(null); return; }
      newState.foundations[targetIdx] = [...newState.foundations[targetIdx], card];
    } else {
      if (newState.freeCells[targetIdx] !== null) { setSelected(null); return; }
      newState.freeCells[targetIdx] = card;
    }

    newState = autoFoundation(newState);
    const newScore = newState.foundations.reduce((a, f) => a + f.length * 10, 0);
    setScore(newScore);
    onScoreUpdate(newScore);
    setState(newState);
    setSelected(null);

    if (newState.foundations.every(f => f.length === 13)) {
      setWon(true);
      setTimeout(() => onGameOver(newScore), 800);
    }
  }, [getSelectedCard, selected, state, onScoreUpdate, onGameOver]);

  const handleTableauClick = useCallback((col: number) => {
    if (!isActive || won) return;
    if (selected === null) {
      if (getTopCard(state.tableau[col])) setSelected({ type: "tableau", col });
      return;
    }
    if (selected.type === "tableau" && selected.col === col) { setSelected(null); return; }
    applyMove("tableau", col);
  }, [isActive, won, selected, state, applyMove]);

  const handleFreeCellClick = useCallback((idx: number) => {
    if (!isActive || won) return;
    if (selected === null) {
      if (state.freeCells[idx]) setSelected({ type: "freecell", idx });
      return;
    }
    if (selected.type === "freecell" && selected.idx === idx) { setSelected(null); return; }
    applyMove("freecell", idx);
  }, [isActive, won, selected, state, applyMove]);

  const handleFoundationClick = useCallback((fi: number) => {
    if (!isActive || won || selected === null) return;
    applyMove("foundation", fi);
  }, [isActive, won, selected, applyMove]);

  const isSelectedCol = (col: number) => selected?.type === "tableau" && selected.col === col;
  const isSelectedFC = (idx: number) => selected?.type === "freecell" && selected.idx === idx;

  return (
    <div className="flex flex-col gap-3 p-3 w-full max-w-3xl" style={{ minHeight: 560 }}>
      <div className="flex justify-between font-arcade text-[9px]">
        <span style={{ color: "#39ff14" }}>FREECELL SOLITAIRE</span>
        <span style={{ color: "#00f5ff" }}>SCORE: {score}/520</span>
        {won && <span style={{ color: "#fff200" }}>YOU WIN!</span>}
      </div>

      {/* Free cells + foundations */}
      <div className="flex justify-between gap-2">
        <div className="flex gap-1.5">
          {state.freeCells.map((card, i) => (
            <button
              key={`fc-${SUITS[i] || i}`}
              type="button"
              onClick={() => handleFreeCellClick(i)}
              className="rounded transition-all"
              style={{
                width: 42,
                height: 58,
                background: card ? "#1a1a2e" : "rgba(255,255,255,0.04)",
                border: `1px solid ${isSelectedFC(i) ? "#00f5ff" : "rgba(255,255,255,0.12)"}`,
                boxShadow: isSelectedFC(i) ? "0 0 10px #00f5ff66" : "none",
                cursor: "pointer",
                color: card && isRed(card.suit) ? "#ff4444" : "#e8e8e8",
                fontFamily: "monospace",
                fontSize: 11,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {card ? <>{rankLabel(card.rank)}<span style={{ fontSize: 13 }}>{card.suit}</span></> : <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 9 }}>FC</span>}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {state.foundations.map((found, i) => (
            <button
              key={`found-${SUITS[i]}`}
              type="button"
              onClick={() => handleFoundationClick(i)}
              className="rounded flex items-center justify-center transition-all"
              style={{
                width: 42,
                height: 58,
                background: "rgba(57,255,20,0.05)",
                border: "1px solid rgba(57,255,20,0.2)",
                cursor: "pointer",
              }}
            >
              {found.length > 0 ? (
                <div style={{ color: isRed(found[found.length-1].suit) ? "#ff4444" : "#e8e8e8", fontFamily: "monospace", fontSize: 11, textAlign: "center" }}>
                  {rankLabel(found[found.length-1].rank)}<br/><span style={{ fontSize: 13 }}>{found[found.length-1].suit}</span>
                </div>
              ) : (
                <span style={{ color: "rgba(57,255,20,0.4)", fontSize: 16 }}>{SUITS[i]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="flex gap-1.5 flex-1 overflow-x-auto">
        {state.tableau.map((col, ci) => {
          const cards = col.filter(Boolean) as Card[];
          return (
            <button
              key={`tcol-${ci}`}
              type="button"
              className="flex-1 relative rounded"
              style={{
                minHeight: 200,
                minWidth: 42,
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${isSelectedCol(ci) ? "rgba(0,245,255,0.3)" : "rgba(255,255,255,0.06)"}`,
                cursor: "pointer",
              }}
              onClick={() => handleTableauClick(ci)}
            >
              {cards.map((card, si) => (
                <div
                  key={`fcard-${card.id}`}
                  className="absolute rounded"
                  style={{
                    top: si * 22,
                    left: 2,
                    right: 2,
                    height: 58,
                    background: "#1a1a2e",
                    border: `1px solid ${isSelectedCol(ci) && si === cards.length - 1 ? "#00f5ff" : "rgba(255,255,255,0.12)"}`,
                    boxShadow: isSelectedCol(ci) && si === cards.length - 1 ? "0 0 8px #00f5ff88" : "none",
                    color: isRed(card.suit) ? "#ff4444" : "#e8e8e8",
                    padding: "2px 4px",
                    fontSize: 11,
                    fontFamily: "monospace",
                    zIndex: si + 1,
                  }}
                >
                  {rankLabel(card.rank)}{card.suit}
                </div>
              ))}
              {cards.length === 0 && (
                <div className="w-full flex items-center justify-center pt-4" style={{ color: "rgba(255,255,255,0.08)", fontSize: 10 }}>
                  empty
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="font-mono-tech text-xs text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
        Click card to select, click target to move. Build A→K on foundations by suit.
      </p>
    </div>
  );
}
