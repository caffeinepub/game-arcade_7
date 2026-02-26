import { useEffect, useRef, useCallback, useState } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const W = 480;
const H = 500;
const PADDLE_W = 80;
const PADDLE_H = 12;
const PADDLE_Y = H - 40;
const BALL_R = 8;
const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_W = 52;
const BRICK_H = 18;
const BRICK_PAD = 4;
const BRICK_OFFSET_X = (W - (BRICK_COLS * (BRICK_W + BRICK_PAD) - BRICK_PAD)) / 2;
const BRICK_OFFSET_Y = 50;

const ROW_COLORS = [
  "#ff2d8e", "#ff2d8e",
  "#bf5fff", "#bf5fff",
  "#00f5ff",
];

interface Brick {
  x: number;
  y: number;
  alive: boolean;
  color: string;
}

type GameState = {
  paddleX: number;
  ballX: number;
  ballY: number;
  ballVX: number;
  ballVY: number;
  bricks: Brick[];
  score: number;
  running: boolean;
  frameId: number;
  lives: number;
};

function createBricks(): Brick[] {
  const bricks: Brick[] = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks.push({
        x: BRICK_OFFSET_X + c * (BRICK_W + BRICK_PAD),
        y: BRICK_OFFSET_Y + r * (BRICK_H + BRICK_PAD),
        alive: true,
        color: ROW_COLORS[r],
      });
    }
  }
  return bricks;
}

export default function BreakoutGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [started, setStarted] = useState(false);

  const stateRef = useRef<GameState>({
    paddleX: W / 2 - PADDLE_W / 2,
    ballX: W / 2,
    ballY: H - 80,
    ballVX: 3,
    ballVY: -4,
    bricks: createBricks(),
    score: 0,
    running: false,
    frameId: 0,
    lives: 3,
  });

  const drawScene = useCallback((ctx: CanvasRenderingContext2D, state: GameState) => {
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, W, H);

    // Bricks
    state.bricks.forEach((brick) => {
      if (!brick.alive) return;
      ctx.fillStyle = brick.color;
      ctx.shadowColor = brick.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(brick.x, brick.y, BRICK_W, BRICK_H);
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(brick.x, brick.y, BRICK_W, 3);
      ctx.shadowBlur = 0;
    });

    // Paddle
    ctx.fillStyle = "#00f5ff";
    ctx.shadowColor = "#00f5ff";
    ctx.shadowBlur = 15;
    ctx.fillRect(state.paddleX, PADDLE_Y, PADDLE_W, PADDLE_H);
    ctx.shadowBlur = 0;

    // Ball
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#00f5ff";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(state.ballX, state.ballY, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Lives
    ctx.fillStyle = "#ff2d8e";
    ctx.font = "12px 'Orbitron', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`LIVES: ${state.lives}`, 10, 30);
  }, []);

  const loop = useCallback(() => {
    const state = stateRef.current;
    if (!state.running) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Move ball
    state.ballX += state.ballVX;
    state.ballY += state.ballVY;

    // Wall bounces
    if (state.ballX - BALL_R < 0) { state.ballX = BALL_R; state.ballVX = Math.abs(state.ballVX); }
    if (state.ballX + BALL_R > W) { state.ballX = W - BALL_R; state.ballVX = -Math.abs(state.ballVX); }
    if (state.ballY - BALL_R < 0) { state.ballY = BALL_R; state.ballVY = Math.abs(state.ballVY); }

    // Paddle hit
    if (
      state.ballY + BALL_R >= PADDLE_Y &&
      state.ballY + BALL_R <= PADDLE_Y + PADDLE_H &&
      state.ballX >= state.paddleX - BALL_R &&
      state.ballX <= state.paddleX + PADDLE_W + BALL_R
    ) {
      state.ballVY = -Math.abs(state.ballVY);
      const hitPos = (state.ballX - state.paddleX) / PADDLE_W;
      state.ballVX = (hitPos - 0.5) * 8;
      state.ballY = PADDLE_Y - BALL_R;
    }

    // Ball lost
    if (state.ballY - BALL_R > H) {
      state.lives--;
      if (state.lives <= 0) {
        state.running = false;
        drawScene(ctx, state);
        onGameOver(state.score);
        return;
      } else {
        state.ballX = W / 2;
        state.ballY = H - 80;
        state.ballVX = 3;
        state.ballVY = -4;
      }
    }

    // Brick collisions
    for (const brick of state.bricks) {
      if (!brick.alive) continue;
      if (
        state.ballX + BALL_R > brick.x &&
        state.ballX - BALL_R < brick.x + BRICK_W &&
        state.ballY + BALL_R > brick.y &&
        state.ballY - BALL_R < brick.y + BRICK_H
      ) {
        brick.alive = false;
        state.score++;
        onScoreUpdate(state.score);
        state.ballVY = -state.ballVY;
        break;
      }
    }

    // Win check
    if (state.bricks.every((b) => !b.alive)) {
      state.running = false;
      drawScene(ctx, state);
      onGameOver(state.score);
      return;
    }

    drawScene(ctx, state);
    state.frameId = requestAnimationFrame(loop);
  }, [drawScene, onGameOver, onScoreUpdate]);

  const startGame = useCallback(() => {
    const state = stateRef.current;
    if (state.frameId) cancelAnimationFrame(state.frameId);
    state.paddleX = W / 2 - PADDLE_W / 2;
    state.ballX = W / 2;
    state.ballY = H - 80;
    state.ballVX = 3;
    state.ballVY = -4;
    state.bricks = createBricks();
    state.score = 0;
    state.lives = 3;
    state.running = true;
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
    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || !stateRef.current.running) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const mouseX = (e.clientX - rect.left) * scaleX;
      stateRef.current.paddleX = Math.max(0, Math.min(W - PADDLE_W, mouseX - PADDLE_W / 2));
    };

    const handleTouchMove = (e: TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || !stateRef.current.running) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const touchX = (e.touches[0].clientX - rect.left) * scaleX;
      stateRef.current.paddleX = Math.max(0, Math.min(W - PADDLE_W, touchX - PADDLE_W / 2));
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

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
        className="border border-primary"
        style={{
          boxShadow: "0 0 20px rgba(0,245,255,0.3)",
          maxWidth: "100%",
          cursor: "none",
        }}
      />
      {!started && (
        <button
          type="button"
          onClick={startGame}
          className="font-arcade text-xs text-primary border border-primary px-6 py-3 hover:bg-primary hover:text-black transition-all"
          style={{ boxShadow: "0 0 10px rgba(0,245,255,0.4)" }}
        >
          START GAME
        </button>
      )}
    </div>
  );
}
