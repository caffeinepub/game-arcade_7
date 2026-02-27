import { useState, useEffect, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const WORDS = [
  "CRANE","SLATE","BRICK","FLAME","GHOST","PLANT","STORM","TRACK","BREAD","CHESS",
  "BLAZE","CLIMB","CRISP","DANCE","EAGER","FAINT","GIANT","HAPPY","INDIE","JOLLY",
  "KNEEL","LEARN","MAGIC","NORTH","OCEAN","PILOT","QUEEN","RIDGE","SOLAR","TASTE",
  "ULTRA","VIVID","WAVES","XENON","YACHT","ZONAL","ADMIT","BENCH","CLASH","DRAFT",
  "EXERT","FLUTE","GRIND","HASTE","INNER","JOUST","KNACK","LEGAL","MANOR","NERVE",
  "OXIDE","PAINT","QUEST","RAISE","SNEAK","THICK","UNIFY","VAULT","WRATH","YOUNG",
  "ASSET","BIRTH","COVER","DECOY","ELBOW","FORCE","GREET","HONEY","IMAGE","JUICE",
  "KNIFE","LEAVE","MATCH","NICHE","OUTDO","PHASE","QUILL","REIGN","SHOUT","TRUTH",
  "UNITY","VOTER","WATCH","EXTRA","YIELD","ZILCH","ADORE","BLEND","COMET","DELTA",
];

function pickWord(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

type LetterState = "correct" | "present" | "absent" | "empty" | "tbd";

interface GuessRow {
  letters: string[];
  states: LetterState[];
  submitted: boolean;
}

const KEYBOARD_ROWS = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["ENTER","Z","X","C","V","B","N","M","⌫"],
];

const STATE_COLORS: Record<LetterState, string> = {
  correct: "#39ff14",
  present: "#fff200",
  absent: "#333344",
  empty: "transparent",
  tbd: "rgba(255,255,255,0.1)",
};

const STATE_TEXT: Record<LetterState, string> = {
  correct: "#0a0a0f",
  present: "#0a0a0f",
  absent: "rgba(255,255,255,0.4)",
  empty: "rgba(255,255,255,0.2)",
  tbd: "rgba(255,255,255,0.9)",
};

export default function WordleGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [target] = useState(pickWord);
  const [guesses, setGuesses] = useState<GuessRow[]>(() =>
    Array(6).fill(null).map(() => ({ letters: [], states: [], submitted: false }))
  );
  const [currentRow, setCurrentRow] = useState(0);
  const [currentInput, setCurrentInput] = useState<string[]>([]);
  const [keyStates, setKeyStates] = useState<Record<string, LetterState>>({});
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [message, setMessage] = useState("");

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 2000);
  }, []);

  const evaluateGuess = useCallback((guess: string[]): LetterState[] => {
    const result: LetterState[] = Array(5).fill("absent");
    const targetArr = target.split("");
    const remaining = [...targetArr];
    for (let i = 0; i < 5; i++) {
      if (guess[i] === targetArr[i]) {
        result[i] = "correct";
        remaining[i] = "";
      }
    }
    for (let i = 0; i < 5; i++) {
      if (result[i] === "correct") continue;
      const idx = remaining.indexOf(guess[i]);
      if (idx !== -1) {
        result[i] = "present";
        remaining[idx] = "";
      }
    }
    return result;
  }, [target]);

  const submitGuess = useCallback(() => {
    if (currentInput.length !== 5 || gameOver) return;
    const states = evaluateGuess(currentInput);

    setGuesses(prev => {
      const newGuesses = [...prev];
      newGuesses[currentRow] = { letters: currentInput, states, submitted: true };
      return newGuesses;
    });

    setKeyStates(prev => {
      const next = { ...prev };
      const priority: LetterState[] = ["correct", "present", "absent"];
      currentInput.forEach((letter, i) => {
        const existing = next[letter];
        if (!existing || priority.indexOf(states[i]) < priority.indexOf(existing)) {
          next[letter] = states[i];
        }
      });
      return next;
    });

    const isWin = states.every(s => s === "correct");
    if (isWin) {
      setWon(true);
      setGameOver(true);
      const score = (6 - currentRow) * 100 + 50;
      onScoreUpdate(score);
      showMessage("BRILLIANT!");
      setTimeout(() => onGameOver(score), 1800);
    } else if (currentRow === 5) {
      setGameOver(true);
      showMessage(`WORD WAS: ${target}`);
      setTimeout(() => onGameOver(0), 2500);
    } else {
      setCurrentRow(r => r + 1);
      setCurrentInput([]);
    }
  }, [currentInput, currentRow, gameOver, target, evaluateGuess, showMessage, onGameOver, onScoreUpdate]);

  const handleKey = useCallback((key: string) => {
    if (gameOver || !isActive) return;
    if (key === "ENTER") {
      if (currentInput.length < 5) { showMessage("Not enough letters"); return; }
      submitGuess();
    } else if (key === "⌫" || key === "BACKSPACE") {
      setCurrentInput(prev => prev.slice(0, -1));
    } else if (/^[A-Z]$/.test(key) && currentInput.length < 5) {
      setCurrentInput(prev => [...prev, key]);
    }
  }, [gameOver, isActive, currentInput, submitGuess, showMessage]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => handleKey(e.key.toUpperCase());
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKey]);

  const getRowLetters = (rowIdx: number): { letter: string; state: LetterState }[] => {
    if (rowIdx < currentRow) {
      return guesses[rowIdx].letters.map((l, i) => ({ letter: l, state: guesses[rowIdx].states[i] }));
    }
    if (rowIdx === currentRow) {
      return Array(5).fill(null).map((_, i) => ({
        letter: currentInput[i] || "",
        state: currentInput[i] ? "tbd" : "empty",
      }));
    }
    return Array(5).fill(null).map(() => ({ letter: "", state: "empty" as LetterState }));
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-[500px] p-4" style={{ color: "#fff" }}>
      {/* Message */}
      <div
        className="font-arcade text-sm h-8 flex items-center justify-center transition-all"
        style={{
          color: won ? "#39ff14" : "#fff200",
          textShadow: won ? "0 0 15px #39ff14" : "0 0 10px #fff200",
          opacity: message ? 1 : 0,
        }}
      >
        {message}
      </div>

      {/* Grid */}
      <div className="flex flex-col gap-1.5">
        {Array(6).fill(null).map((_, rowIdx) => {
          const cells = getRowLetters(rowIdx);
          return (
            <div key={`row-${rowIdx}`} className="flex gap-1.5">
              {cells.map((cell, colIdx) => (
                <div
                  key={`cell-${rowIdx}-${colIdx}`}
                  className="w-14 h-14 flex items-center justify-center font-arcade text-xl border-2 transition-all duration-300"
                  style={{
                    background: STATE_COLORS[cell.state],
                    borderColor: cell.state === "empty"
                      ? "rgba(255,255,255,0.15)"
                      : cell.state === "tbd"
                      ? "rgba(255,255,255,0.5)"
                      : STATE_COLORS[cell.state],
                    color: STATE_TEXT[cell.state],
                    transform: cell.state === "tbd" && cell.letter ? "scale(1.05)" : "scale(1)",
                    boxShadow: cell.state !== "empty" && cell.state !== "tbd"
                      ? `0 0 8px ${STATE_COLORS[cell.state]}88`
                      : "none",
                  }}
                >
                  {cell.letter}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Keyboard */}
      <div className="flex flex-col gap-1.5 mt-2">
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={`krow-${ri}`} className="flex gap-1.5 justify-center">
            {row.map(key => {
              const state = keyStates[key];
              const isWide = key === "ENTER" || key === "⌫";
              return (
                <button
                  key={`key-${key}`}
                  type="button"
                  onClick={() => handleKey(key)}
                  className="font-arcade text-[9px] rounded flex items-center justify-center transition-all duration-200 cursor-pointer select-none"
                  style={{
                    width: isWide ? 56 : 34,
                    height: 46,
                    background: state ? STATE_COLORS[state] : "rgba(255,255,255,0.1)",
                    color: state ? STATE_TEXT[state] : "rgba(255,255,255,0.85)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: state && state !== "absent" ? `0 0 6px ${STATE_COLORS[state]}66` : "none",
                  }}
                >
                  {key}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
