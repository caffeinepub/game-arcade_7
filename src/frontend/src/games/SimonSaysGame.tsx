import { useState, useCallback, useRef, useEffect } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const BUTTONS = [
  { id: "tl", color: "#39ff14", activeColor: "#ccff99", label: "↖", pos: { top: 0, left: 0 } },
  { id: "tr", color: "#ff2d8e", activeColor: "#ffaacc", label: "↗", pos: { top: 0, right: 0 } },
  { id: "bl", color: "#00f5ff", activeColor: "#99eeff", label: "↙", pos: { bottom: 0, left: 0 } },
  { id: "br", color: "#fff200", activeColor: "#ffffaa", label: "↘", pos: { bottom: 0, right: 0 } },
];

export default function SimonSaysGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [sequence, setSequence] = useState<string[]>([]);
  const [playerSeq, setPlayerSeq] = useState<string[]>([]);
  const [phase, setPhase] = useState<"idle" | "showing" | "input" | "fail">("idle");
  const [activeBtn, setActiveBtn] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const gameOverFired = useRef(false);

  const flashButton = useCallback((id: string, ms = 400): Promise<void> => {
    return new Promise((res) => {
      setActiveBtn(id);
      setTimeout(() => { setActiveBtn(null); setTimeout(res, 100); }, ms);
    });
  }, []);

  const showSequence = useCallback(async (seq: string[]) => {
    setPhase("showing");
    await new Promise((r) => setTimeout(r, 500));
    for (const id of seq) {
      await flashButton(id, 450);
    }
    setPhase("input");
    setPlayerSeq([]);
  }, [flashButton]);

  const startNextRound = useCallback((currentSeq: string[]) => {
    const newSeq = [...currentSeq, BUTTONS[Math.floor(Math.random() * 4)].id];
    setSequence(newSeq);
    setRound(newSeq.length);
    onScoreUpdate(newSeq.length - 1);
    showSequence(newSeq);
  }, [showSequence, onScoreUpdate]);

  const handleStart = useCallback(() => {
    if (!isActive) return;
    gameOverFired.current = false;
    setRound(0);
    setSequence([]);
    setPlayerSeq([]);
    startNextRound([]);
  }, [isActive, startNextRound]);

  const handleButtonClick = useCallback((id: string) => {
    if (phase !== "input" || !isActive) return;

    flashButton(id, 200);
    const newPlayerSeq = [...playerSeq, id];
    const idx = newPlayerSeq.length - 1;

    if (newPlayerSeq[idx] !== sequence[idx]) {
      setPhase("fail");
      if (!gameOverFired.current) {
        gameOverFired.current = true;
        setTimeout(() => onGameOver(sequence.length - 1), 800);
      }
      return;
    }

    if (newPlayerSeq.length === sequence.length) {
      setPlayerSeq([]);
      setTimeout(() => startNextRound(sequence), 600);
    } else {
      setPlayerSeq(newPlayerSeq);
    }
  }, [phase, isActive, playerSeq, sequence, flashButton, startNextRound, onGameOver]);

  const SIZE = 280;
  const BTN_SIZE = 130;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="font-arcade text-xs text-center" style={{ color: "#fff200" }}>
        {phase === "idle" ? "PRESS START" : phase === "fail" ? "WRONG! GAME OVER" : `ROUND ${round}`}
      </div>

      <div
        className="relative rounded-full overflow-hidden"
        style={{ width: SIZE, height: SIZE, background: "#0a0a0f", border: "3px solid rgba(255,255,255,0.1)" }}
      >
        {/* Center circle */}
        <div
          className="absolute rounded-full"
          style={{ width: 70, height: 70, top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#111", zIndex: 10, border: "2px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <button
            type="button"
            className="font-arcade text-[8px]"
            style={{ color: "#00f5ff", background: "none", border: "none", cursor: "pointer" }}
            onClick={handleStart}
            disabled={phase === "showing"}
          >
            {phase === "idle" || phase === "fail" ? "START" : round.toString().padStart(2, "0")}
          </button>
        </div>

        {BUTTONS.map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={() => handleButtonClick(btn.id)}
            disabled={phase !== "input"}
            style={{
              position: "absolute",
              width: BTN_SIZE,
              height: BTN_SIZE,
              background: activeBtn === btn.id ? btn.activeColor : btn.color,
              opacity: activeBtn === btn.id ? 1 : phase === "input" ? 0.75 : 0.4,
              boxShadow: activeBtn === btn.id ? `0 0 30px ${btn.color}` : "none",
              border: "none",
              cursor: phase === "input" ? "pointer" : "default",
              transition: "background 0.1s, opacity 0.1s",
              ...btn.pos,
            }}
          />
        ))}
      </div>

      <div className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
        {phase === "showing" && "Watch the sequence..."}
        {phase === "input" && `Repeat: ${playerSeq.length}/${sequence.length}`}
        {phase === "idle" && "Hit START to begin the memory challenge"}
      </div>
    </div>
  );
}
