import { useState, useEffect, useCallback, useRef } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const TOTAL_HOLES = 9;
const GAME_DURATION = 30;
const MOLE_SHOW_TIME_BASE = 900;
const MOLE_SHOW_TIME_MIN = 400;

export default function WhackMoleGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [activeMoles, setActiveMoles] = useState<Set<number>>(new Set());
  const [whackedMoles, setWhackedMoles] = useState<Set<number>>(new Set());

  const gameRef = useRef({
    running: false,
    score: 0,
  });

  const moleTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const gameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = useCallback(() => {
    for (const t of moleTimers.current.values()) clearTimeout(t);
    moleTimers.current.clear();
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
  }, []);

  const spawnMole = useCallback(() => {
    if (!gameRef.current.running) return;

    const hole = Math.floor(Math.random() * TOTAL_HOLES);
    const elapsed = GAME_DURATION - (gameRef.current.running ? 0 : GAME_DURATION);
    const showTime = Math.max(
      MOLE_SHOW_TIME_MIN,
      MOLE_SHOW_TIME_BASE - (GAME_DURATION - elapsed) * 15
    );

    setActiveMoles((prev) => {
      const next = new Set(prev);
      next.add(hole);
      return next;
    });

    const hideTimer = setTimeout(() => {
      setActiveMoles((prev) => {
        const next = new Set(prev);
        next.delete(hole);
        return next;
      });
      moleTimers.current.delete(hole);
    }, showTime);

    moleTimers.current.set(hole, hideTimer);

    // Schedule next spawn
    const nextDelay = 300 + Math.random() * 600;
    spawnTimerRef.current = setTimeout(spawnMole, nextDelay);
  }, []);

  const startGame = useCallback(() => {
    clearAllTimers();
    gameRef.current.running = true;
    gameRef.current.score = 0;
    setStarted(true);
    setTimeLeft(GAME_DURATION);
    setScore(0);
    setActiveMoles(new Set());
    setWhackedMoles(new Set());
    onScoreUpdate(0);

    // Countdown timer
    gameTimerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearAllTimers();
          gameRef.current.running = false;
          setActiveMoles(new Set());
          onGameOver(gameRef.current.score);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Start spawning
    spawnTimerRef.current = setTimeout(spawnMole, 500);
  }, [clearAllTimers, spawnMole, onGameOver, onScoreUpdate]);

  const whackMole = useCallback((hole: number) => {
    if (!gameRef.current.running) return;
    if (!activeMoles.has(hole)) return;

    // Clear the existing mole timer
    const timer = moleTimers.current.get(hole);
    if (timer) {
      clearTimeout(timer);
      moleTimers.current.delete(hole);
    }

    setActiveMoles((prev) => {
      const next = new Set(prev);
      next.delete(hole);
      return next;
    });

    setWhackedMoles((prev) => {
      const next = new Set(prev);
      next.add(hole);
      setTimeout(() => {
        setWhackedMoles((p) => {
          const n = new Set(p);
          n.delete(hole);
          return n;
        });
      }, 300);
      return next;
    });

    gameRef.current.score++;
    setScore(gameRef.current.score);
    onScoreUpdate(gameRef.current.score);
  }, [activeMoles, onScoreUpdate]);

  useEffect(() => {
    if (!isActive) {
      clearAllTimers();
      gameRef.current.running = false;
    }
  }, [isActive, clearAllTimers]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const timerPercent = (timeLeft / GAME_DURATION) * 100;
  const timerColor = timeLeft > 10 ? "#00f5ff" : "#ff2d8e";

  return (
    <div className="flex flex-col items-center gap-6">
      {started && (
        <div className="flex items-center gap-6 font-mono-tech text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">TIME:</span>
            <span style={{ color: timerColor, textShadow: `0 0 10px ${timerColor}` }}>
              {timeLeft}s
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ width: 120, background: "rgba(255,255,255,0.1)" }}
          >
            <div
              style={{
                height: "100%",
                width: `${timerPercent}%`,
                background: timerColor,
                boxShadow: `0 0 8px ${timerColor}`,
                transition: "width 1s linear, background 0.3s",
              }}
            />
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          padding: 20,
          background: "rgba(255,242,0,0.05)",
          border: "1px solid rgba(255,242,0,0.2)",
          borderRadius: 4,
        }}
      >
        {[0,1,2,3,4,5,6,7,8].map((holeId) => {
          const isActive = activeMoles.has(holeId);
          const isWhacked = whackedMoles.has(holeId);
          return (
            <button
              key={`hole-${holeId}`}
              type="button"
              onClick={() => whackMole(holeId)}
              className="flex items-center justify-center transition-all duration-150 rounded-full select-none"
              style={{
                width: 90,
                height: 90,
                fontSize: 44,
                background: isWhacked
                  ? "rgba(255,45,142,0.3)"
                  : isActive
                  ? "rgba(255,242,0,0.15)"
                  : "rgba(0,0,0,0.5)",
                border: isActive
                  ? "2px solid #fff200"
                  : "2px solid rgba(255,255,255,0.1)",
                boxShadow: isActive
                  ? "0 0 20px rgba(255,242,0,0.5), inset 0 0 15px rgba(255,242,0,0.1)"
                  : "none",
                transform: isWhacked ? "scale(0.85)" : isActive ? "scale(1.05)" : "scale(1)",
                cursor: isActive ? "pointer" : "default",
              }}
            >
              {isWhacked ? "💥" : isActive ? "🦔" : "⬤"}
            </button>
          );
        })}
      </div>

      {!started && (
        <button
          type="button"
          onClick={startGame}
          className="font-arcade text-xs px-6 py-3 transition-all"
          style={{
            color: "#fff200",
            border: "1px solid #fff200",
            boxShadow: "0 0 10px rgba(255,242,0,0.4)",
          }}
        >
          START GAME
        </button>
      )}

      {started && timeLeft === 0 && (
        <button
          type="button"
          onClick={startGame}
          className="font-arcade text-xs px-6 py-3 transition-all"
          style={{
            color: "#fff200",
            border: "1px solid #fff200",
            boxShadow: "0 0 10px rgba(255,242,0,0.4)",
          }}
        >
          PLAY AGAIN
        </button>
      )}
    </div>
  );
}
