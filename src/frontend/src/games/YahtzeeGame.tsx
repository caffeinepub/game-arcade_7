import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const CATEGORIES = [
  { id: "ones", label: "Ones", section: "upper" },
  { id: "twos", label: "Twos", section: "upper" },
  { id: "threes", label: "Threes", section: "upper" },
  { id: "fours", label: "Fours", section: "upper" },
  { id: "fives", label: "Fives", section: "upper" },
  { id: "sixes", label: "Sixes", section: "upper" },
  { id: "threeofkind", label: "3 of a Kind", section: "lower" },
  { id: "fourofkind", label: "4 of a Kind", section: "lower" },
  { id: "fullhouse", label: "Full House", section: "lower" },
  { id: "smstraight", label: "Sm. Straight", section: "lower" },
  { id: "lgstraight", label: "Lg. Straight", section: "lower" },
  { id: "yahtzee", label: "YAHTZEE!", section: "lower" },
  { id: "chance", label: "Chance", section: "lower" },
];

function calcScore(category: string, dice: number[]): number {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dice) counts[d]++;
  const sum = dice.reduce((a, b) => a + b, 0);
  switch (category) {
    case "ones": return counts[1] * 1;
    case "twos": return counts[2] * 2;
    case "threes": return counts[3] * 3;
    case "fours": return counts[4] * 4;
    case "fives": return counts[5] * 5;
    case "sixes": return counts[6] * 6;
    case "threeofkind": return counts.some(c => c >= 3) ? sum : 0;
    case "fourofkind": return counts.some(c => c >= 4) ? sum : 0;
    case "fullhouse": {
      const hasThree = counts.some(c => c === 3);
      const hasTwo = counts.some(c => c === 2);
      return hasThree && hasTwo ? 25 : 0;
    }
    case "smstraight": {
      const s = new Set(dice);
      const seqs = [[1,2,3,4],[2,3,4,5],[3,4,5,6]];
      return seqs.some(seq => seq.every(n => s.has(n))) ? 30 : 0;
    }
    case "lgstraight": {
      const s = new Set(dice);
      return (([1,2,3,4,5].every(n=>s.has(n)) || [2,3,4,5,6].every(n=>s.has(n)))) ? 40 : 0;
    }
    case "yahtzee": return counts.some(c => c === 5) ? 50 : 0;
    case "chance": return sum;
    default: return 0;
  }
}

export default function YahtzeeGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [dice, setDice] = useState<number[]>([1,1,1,1,1]);
  const [held, setHeld] = useState<boolean[]>([false,false,false,false,false]);
  const [rollsLeft, setRollsLeft] = useState(3);
  const [scores, setScores] = useState<Record<string, number | null>>(() => Object.fromEntries(CATEGORIES.map(c => [c.id, null])));
  const [totalScore, setTotalScore] = useState(0);
  const [gamesLeft, setGamesLeft] = useState(13);
  const [gameOver, setGameOver] = useState(false);

  const rollDice = useCallback(() => {
    if (rollsLeft <= 0 || !isActive || gameOver) return;
    setDice(prev => prev.map((d, i) => held[i] ? d : Math.ceil(Math.random() * 6)));
    setRollsLeft(r => r - 1);
  }, [rollsLeft, held, isActive, gameOver]);

  const toggleHold = useCallback((i: number) => {
    if (rollsLeft === 3 || !isActive) return;
    setHeld(prev => prev.map((h, idx) => idx === i ? !h : h));
  }, [rollsLeft, isActive]);

  const scoreCategory = useCallback((catId: string) => {
    if (scores[catId] !== null || rollsLeft === 3 || !isActive || gameOver) return;
    const s = calcScore(catId, dice);
    const newScores = { ...scores, [catId]: s };
    let upper = 0;
    for (const c of CATEGORIES) {
      if (c.section === "upper" && newScores[c.id] !== null) upper += newScores[c.id]!;
    }
    const bonus = upper >= 63 ? 35 : 0;
    const total = (Object.values(newScores) as (number | null)[]).reduce((a: number, v) => a + (v || 0), 0) + bonus;
    setScores(newScores);
    setTotalScore(total);
    onScoreUpdate(total);
    const remaining = gamesLeft - 1;
    setGamesLeft(remaining);
    if (remaining === 0) {
      setGameOver(true);
      onGameOver(total);
    } else {
      setDice([1,1,1,1,1]);
      setHeld([false,false,false,false,false]);
      setRollsLeft(3);
    }
  }, [scores, dice, rollsLeft, gamesLeft, isActive, gameOver, onGameOver, onScoreUpdate]);

  const DICE_FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="flex items-center gap-4">
        <span className="font-arcade text-xs" style={{ color: "#bf5fff" }}>Turns: {gamesLeft}</span>
        <span className="font-arcade text-xs" style={{ color: "#fff200" }}>Score: {totalScore}</span>
        <span className="font-mono-tech text-xs" style={{ color: rollsLeft > 0 ? "#39ff14" : "#ff4444" }}>Rolls left: {rollsLeft}</span>
      </div>

      {/* Dice */}
      <div className="flex gap-3">
        {dice.map((d, i) => (
          <button type="button" key={`die-${i}`} onClick={() => toggleHold(i)}
            style={{
              width: 60, height: 60, fontSize: 40, lineHeight: 1,
              background: held[i] ? "rgba(255,242,0,0.2)" : "rgba(30,30,50,0.8)",
              border: `2px solid ${held[i] ? "#fff200" : "rgba(191,95,255,0.4)"}`,
              borderRadius: 8, cursor: rollsLeft < 3 ? "pointer" : "default",
              boxShadow: held[i] ? "0 0 12px rgba(255,242,0,0.4)" : "none",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            {DICE_FACES[d]}
          </button>
        ))}
      </div>

      <button type="button" onClick={rollDice} disabled={rollsLeft === 0 || gameOver}
        className="font-arcade text-[10px] px-5 py-2 rounded"
        style={{ background: rollsLeft > 0 && !gameOver ? "rgba(191,95,255,0.15)" : "transparent", color: rollsLeft > 0 ? "#bf5fff" : "#666", border: `1px solid ${rollsLeft > 0 ? "#bf5fff" : "#333"}` }}>
        🎲 ROLL ({rollsLeft})
      </button>

      {/* Scorecard */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, width: "100%", maxWidth: 400 }}>
        {CATEGORIES.map(cat => {
          const scored = scores[cat.id] !== null;
          const preview = !scored && rollsLeft < 3 ? calcScore(cat.id, dice) : null;
          return (
            <button type="button" key={`cat-${cat.id}`} onClick={() => scoreCategory(cat.id)}
              disabled={scored || rollsLeft === 3}
              style={{
                background: scored ? "rgba(57,255,20,0.1)" : preview !== null ? "rgba(191,95,255,0.08)" : "rgba(0,0,0,0.2)",
                border: `1px solid ${scored ? "rgba(57,255,20,0.3)" : preview !== null ? "rgba(191,95,255,0.4)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 4, padding: "4px 8px", cursor: !scored && rollsLeft < 3 ? "pointer" : "default",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
              <span className="font-mono-tech text-xs" style={{ color: scored ? "#39ff14" : "rgba(255,255,255,0.6)" }}>{cat.label}</span>
              <span className="font-arcade text-[10px]" style={{ color: scored ? "#39ff14" : preview !== null ? "#bf5fff" : "#666" }}>
                {scored ? scores[cat.id] : preview !== null ? `+${preview}` : "--"}
              </span>
            </button>
          );
        })}
      </div>
      {gameOver && <div className="font-arcade text-sm" style={{ color: "#fff200" }}>GAME OVER! Final: {totalScore}</div>}
    </div>
  );
}
