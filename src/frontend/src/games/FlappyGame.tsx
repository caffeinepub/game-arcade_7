import { useEffect, useRef, useCallback, useState } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const W = 400;
const H = 500;
const BIRD_X = 80;
const BIRD_R = 16;
const GRAVITY = 0.4;
const FLAP_VEL = -8;
const PIPE_WIDTH = 52;
const PIPE_GAP = 140;
const PIPE_SPEED = 2.5;
const PIPE_INTERVAL = 1600;

interface Pipe {
  x: number;
  topH: number;
  passed: boolean;
}

type GameState = {
  birdY: number;
  birdVel: number;
  pipes: Pipe[];
  score: number;
  running: boolean;
  frameId: number;
  lastPipeTime: number;
  frames: number;
};

export default function FlappyGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [started, setStarted] = useState(false);

  const stateRef = useRef<GameState>({
    birdY: H / 2,
    birdVel: 0,
    pipes: [],
    score: 0,
    running: false,
    frameId: 0,
    lastPipeTime: 0,
    frames: 0,
  });

  const doFlap = useCallback(() => {
    const state = stateRef.current;
    if (!state.running) return;
    state.birdVel = FLAP_VEL;
  }, []);

  const drawScene = useCallback((ctx: CanvasRenderingContext2D, state: GameState) => {
    // Background
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    for (let i = 0; i < 30; i++) {
      const sx = ((i * 137 + state.frames * 0.3) % W);
      const sy = (i * 53) % H;
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Ground
    ctx.fillStyle = "#1a3a1a";
    ctx.shadowColor = "#39ff14";
    ctx.shadowBlur = 10;
    ctx.fillRect(0, H - 20, W, 20);
    ctx.shadowBlur = 0;

    // Pipes
    state.pipes.forEach((p) => {
      ctx.fillStyle = "#0d5c0d";
      ctx.shadowColor = "#39ff14";
      ctx.shadowBlur = 8;
      ctx.fillRect(p.x, 0, PIPE_WIDTH, p.topH);
      ctx.fillStyle = "#0a8a0a";
      ctx.fillRect(p.x - 4, p.topH - 24, PIPE_WIDTH + 8, 24);
      const botY = p.topH + PIPE_GAP;
      ctx.fillStyle = "#0d5c0d";
      ctx.fillRect(p.x, botY, PIPE_WIDTH, H - botY - 20);
      ctx.fillStyle = "#0a8a0a";
      ctx.fillRect(p.x - 4, botY, PIPE_WIDTH + 8, 24);
      ctx.shadowBlur = 0;
    });

    // Bird
    const angle = Math.max(-0.4, Math.min(0.8, state.birdVel * 0.06));
    ctx.save();
    ctx.translate(BIRD_X, state.birdY);
    ctx.rotate(angle);
    ctx.fillStyle = "#fff200";
    ctx.shadowColor = "#fff200";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_R, BIRD_R - 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(6, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(7, -5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e6d600";
    ctx.shadowColor = "#fff200";
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.ellipse(-4, 4, 8, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Score
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "#fff200";
    ctx.shadowBlur = 15;
    ctx.fillText(String(state.score), W / 2, 50);
    ctx.shadowBlur = 0;
  }, []);

  const loop = useCallback((timestamp: number) => {
    const state = stateRef.current;
    if (!state.running) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    state.frames++;

    // Spawn pipes
    if (timestamp - state.lastPipeTime > PIPE_INTERVAL) {
      const topH = 60 + Math.random() * (H - PIPE_GAP - 120);
      state.pipes.push({ x: W, topH, passed: false });
      state.lastPipeTime = timestamp;
    }

    // Update bird
    state.birdVel += GRAVITY;
    state.birdY += state.birdVel;

    // Update pipes
    state.pipes.forEach((p) => { p.x -= PIPE_SPEED; });
    state.pipes = state.pipes.filter((p) => p.x > -PIPE_WIDTH);

    // Score
    state.pipes.forEach((p) => {
      if (!p.passed && p.x + PIPE_WIDTH < BIRD_X) {
        p.passed = true;
        state.score++;
        onScoreUpdate(state.score);
      }
    });

    // Collision
    const birdTop = state.birdY - BIRD_R;
    const birdBot = state.birdY + BIRD_R;
    const birdRight = BIRD_X + BIRD_R;
    const birdLeft = BIRD_X - BIRD_R;

    if (birdBot >= H - 20 || birdTop <= 0) {
      state.running = false;
      drawScene(ctx, state);
      onGameOver(state.score);
      return;
    }

    for (const p of state.pipes) {
      if (birdRight > p.x && birdLeft < p.x + PIPE_WIDTH) {
        if (birdTop < p.topH || birdBot > p.topH + PIPE_GAP) {
          state.running = false;
          drawScene(ctx, state);
          onGameOver(state.score);
          return;
        }
      }
    }

    drawScene(ctx, state);
    state.frameId = requestAnimationFrame(loop);
  }, [onGameOver, onScoreUpdate, drawScene]);

  const startGame = useCallback(() => {
    const state = stateRef.current;
    if (state.frameId) cancelAnimationFrame(state.frameId);
    state.birdY = H / 2;
    state.birdVel = 0;
    state.pipes = [];
    state.score = 0;
    state.running = true;
    state.lastPipeTime = 0;
    state.frames = 0;
    setStarted(true);
    onScoreUpdate(0);
    state.frameId = requestAnimationFrame(loop);
  }, [loop, onScoreUpdate]);

  useEffect(() => {
    if (!isActive) {
      stateRef.current.running = false;
      cancelAnimationFrame(stateRef.current.frameId);
    }
  }, [isActive]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp") {
        doFlap();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [doFlap]);

  // Draw initial frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawScene(ctx, stateRef.current);
    return () => {
      cancelAnimationFrame(stateRef.current.frameId);
    };
  }, [drawScene]);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="border border-secondary cursor-pointer"
        style={{
          boxShadow: "0 0 20px rgba(57,255,20,0.3)",
          maxWidth: "100%",
        }}
        onClick={started ? doFlap : startGame}
      />
      {!started && (
        <button
          type="button"
          onClick={startGame}
          className="font-arcade text-xs text-secondary border border-secondary px-6 py-3 hover:bg-secondary hover:text-black transition-all"
          style={{ boxShadow: "0 0 10px rgba(57,255,20,0.4)" }}
        >
          START GAME
        </button>
      )}
    </div>
  );
}
