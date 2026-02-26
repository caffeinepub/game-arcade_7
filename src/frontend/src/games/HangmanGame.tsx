import { useState, useCallback, useEffect } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const WORDS = [
  "JAVASCRIPT","TYPESCRIPT","REACT","ARCADE","ALGORITHM","DATABASE","FRAMEWORK",
  "INTERFACE","COMPONENT","FUNCTION","VARIABLE","KEYBOARD","MONITOR","NETWORK",
  "BROWSER","INTERNET","SOFTWARE","HARDWARE","COMPILER","DEBUGGER"
];

function HangmanSVG({ wrong }: { wrong: number }) {
  return (
    <svg width="120" height="130" viewBox="0 0 120 130">
      {/* Gallows */}
      <line x1="10" y1="120" x2="110" y2="120" stroke="#00f5ff" strokeWidth="3"/>
      <line x1="30" y1="120" x2="30" y2="10" stroke="#00f5ff" strokeWidth="3"/>
      <line x1="30" y1="10" x2="70" y2="10" stroke="#00f5ff" strokeWidth="3"/>
      <line x1="70" y1="10" x2="70" y2="25" stroke="#00f5ff" strokeWidth="2"/>
      {/* Head */}
      {wrong >= 1 && <circle cx="70" cy="35" r="10" stroke="#ff2d8e" strokeWidth="2" fill="none"/>}
      {/* Body */}
      {wrong >= 2 && <line x1="70" y1="45" x2="70" y2="80" stroke="#ff2d8e" strokeWidth="2"/>}
      {/* Left arm */}
      {wrong >= 3 && <line x1="70" y1="55" x2="50" y2="70" stroke="#ff2d8e" strokeWidth="2"/>}
      {/* Right arm */}
      {wrong >= 4 && <line x1="70" y1="55" x2="90" y2="70" stroke="#ff2d8e" strokeWidth="2"/>}
      {/* Left leg */}
      {wrong >= 5 && <line x1="70" y1="80" x2="50" y2="105" stroke="#ff2d8e" strokeWidth="2"/>}
      {/* Right leg */}
      {wrong >= 6 && <line x1="70" y1="80" x2="90" y2="105" stroke="#ff2d8e" strokeWidth="2"/>}
    </svg>
  );
}

export default function HangmanGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [word, setWord] = useState(() => WORDS[Math.floor(Math.random() * WORDS.length)]);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState(0);
  const [score, setScore] = useState(0);
  const [wordsWon, setWordsWon] = useState(0);
  const [phase, setPhase] = useState<"play"|"won"|"lost">("play");

  const correct = word.split("").filter(l => guessed.has(l)).length;
  const allCorrect = word.split("").every(l => guessed.has(l));

  useEffect(() => {
    if (allCorrect && phase === "play") {
      const newWords = wordsWon + 1;
      const ns = newWords * 100;
      setPhase("won"); setWordsWon(newWords); setScore(ns); onScoreUpdate(ns);
      setTimeout(() => onGameOver(ns), 1500);
    }
  }, [allCorrect, phase, wordsWon, onGameOver, onScoreUpdate]);

  const guess = useCallback((letter: string) => {
    if (!isActive || guessed.has(letter) || phase !== "play") return;
    const ng = new Set(guessed); ng.add(letter);
    setGuessed(ng);
    if (!word.includes(letter)) {
      const nw = wrong + 1;
      setWrong(nw);
      if (nw >= 6) { setPhase("lost"); setTimeout(() => onGameOver(score), 1000); }
    }
  }, [guessed, word, wrong, phase, score, isActive, onGameOver]);

  const nextWord = () => {
    setWord(WORDS[Math.floor(Math.random() * WORDS.length)]);
    setGuessed(new Set()); setWrong(0); setPhase("play");
  };

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      <div className="flex gap-6">
        <span className="font-mono-tech text-xs" style={{ color: "#39ff14" }}>Score: {score}</span>
        <span className="font-arcade text-[10px]" style={{ color: "#ff2d8e" }}>Wrong: {wrong}/6</span>
        <span className="font-arcade text-[10px]" style={{ color: "#fff200" }}>Words: {wordsWon}</span>
      </div>

      <HangmanSVG wrong={wrong} />

      {/* Word display */}
      <div style={{ display: "flex", gap: 6 }}>
        {word.split("").map((l, i) => (
          <div key={`l-${i}`} style={{ width: 26, borderBottom: "2px solid #00f5ff", textAlign: "center", paddingBottom: 2 }}>
            <span className="font-arcade text-sm" style={{ color: guessed.has(l) ? "#39ff14" : "transparent", textShadow: guessed.has(l) ? "0 0 8px #39ff14" : "none" }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Keyboard */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 350, justifyContent: "center" }}>
        {ALPHABET.map(l => (
          <button type="button" key={`key-${l}`} onClick={() => guess(l)} disabled={guessed.has(l) || phase !== "play"}
            style={{
              width: 32, height: 32, fontSize: 12, fontWeight: "bold",
              background: guessed.has(l) ? (word.includes(l) ? "rgba(57,255,20,0.2)" : "rgba(255,68,68,0.2)") : "rgba(0,245,255,0.08)",
              border: `1px solid ${guessed.has(l) ? (word.includes(l) ? "#39ff14" : "#ff4444") : "rgba(0,245,255,0.3)"}`,
              borderRadius: 4, cursor: guessed.has(l) || phase !== "play" ? "default" : "pointer",
              color: guessed.has(l) ? (word.includes(l) ? "#39ff14" : "#ff4444") : "#00f5ff",
              fontFamily: "'Orbitron', sans-serif",
            }}>
            {l}
          </button>
        ))}
      </div>

      {phase === "won" && <div className="font-arcade text-sm" style={{ color: "#39ff14" }}>YOU GOT IT! 🎉</div>}
      {phase === "lost" && <div className="font-arcade text-sm" style={{ color: "#ff4444" }}>THE WORD WAS: {word}</div>}
      {(phase === "won" || phase === "lost") && (
        <button type="button" onClick={nextWord} className="font-arcade text-[10px] px-4 py-2 rounded" style={{ background: "transparent", color: "#00f5ff", border: "1px solid #00f5ff" }}>NEXT WORD</button>
      )}
    </div>
  );
}
