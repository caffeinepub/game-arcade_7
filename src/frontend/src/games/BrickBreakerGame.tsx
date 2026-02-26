import { useEffect, useRef, useCallback, useState } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const W = 480;
const H = 540;
const PADDLE_W = 80;
const PADDLE_H = 12;
const BALL_R = 8;
const BRICK_ROWS = 6;
const BRICK_COLS = 10;
const BRICK_W = W / BRICK_COLS - 2;
const BRICK_H = 18;
const BRICK_PAD = 2;

type PowerUpType = "wide" | "multiball" | "laser";

type Ball = { x: number; y: number; vx: number; vy: number };
type Brick = { x: number; y: number; hp: number; color: string };
type PowerUp = { x: number; y: number; type: PowerUpType };

const BRICK_COLORS = ["#ff2d8e", "#ff2d8e", "#bf5fff", "#bf5fff", "#00f5ff", "#39ff14"];

export default function BrickBreakerGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [started, setStarted] = useState(false);

    const makeBricks = useCallback((): Brick[] => {
    const bricks: Brick[] = [];
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        bricks.push({
          x: c * (BRICK_W + BRICK_PAD) + BRICK_PAD,
          y: 40 + r * (BRICK_H + BRICK_PAD),
          hp: r < 2 ? 2 : 1,
          color: BRICK_COLORS[r] ?? "#00f5ff",
        });
      }
    }
    return bricks;
  }, []);

  const state = useRef({
    paddleX: W / 2 - PADDLE_W / 2,
    balls: [{ x: W / 2, y: H - 60, vx: 3, vy: -4 }] as Ball[],
    bricks: makeBricks(),
    powerUps: [] as PowerUp[],
    score: 0,
    lives: 3,
    paddleW: PADDLE_W,
    laser: false,
    gameOver: false,
    mouseX: W / 2,
    touchX: -1,
  });

  const gameOverFired = useRef(false);

  const spawnPowerUp = useCallback((x: number, y: number) => {
    if (Math.random() > 0.25) return;
    const types: PowerUpType[] = ["wide", "multiball", "laser"];
    state.current.powerUps.push({ x, y, type: types[Math.floor(Math.random() * 3)] });
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = state.current;

    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, W, H);

    // Bricks
    s.bricks.forEach((b) => {
      ctx.shadowColor = b.color;
      ctx.shadowBlur = b.hp > 1 ? 12 : 6;
      ctx.fillStyle = b.hp > 1 ? "#ffffff" : b.color;
      ctx.fillRect(b.x, b.y, BRICK_W, BRICK_H);
      ctx.shadowBlur = 0;
    });

    // Power-ups
    s.powerUps.forEach((p) => {
      ctx.shadowColor = "#fff200";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#fff200";
      ctx.font = "14px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.type === "wide" ? "⬅➡" : p.type === "multiball" ? "●●" : "⚡", p.x, p.y);
      ctx.shadowBlur = 0;
    });

    // Paddle
    ctx.shadowColor = "#00f5ff";
    ctx.shadowBlur = 15;
    ctx.fillStyle = "#00f5ff";
    ctx.fillRect(s.paddleX, H - 30, s.paddleW, PADDLE_H);
    ctx.shadowBlur = 0;

    // Balls
    s.balls.forEach((ball) => {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = "#fff200";
      ctx.shadowColor = "#fff200";
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // HUD
    ctx.font = "11px 'Press Start 2P', cursive";
    ctx.fillStyle = "#00f5ff";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`SCORE:${s.score}  ❤️×${s.lives}`, 8, 10);
  }, []);

  const update = useCallback(() => {
    const s = state.current;
    if (s.gameOver || s.balls.length === 0) return;

    // Move paddle
    if (s.touchX >= 0) {
      s.paddleX = Math.max(0, Math.min(W - s.paddleW, s.touchX - s.paddleW / 2));
    } else {
      s.paddleX = Math.max(0, Math.min(W - s.paddleW, s.mouseX - s.paddleW / 2));
    }

    // Move power-ups
    s.powerUps = s.powerUps.filter((p) => {
      p.y += 2;
      if (p.y > H) return false;
      // Collect
      if (p.y + 10 >= H - 30 && p.x >= s.paddleX && p.x <= s.paddleX + s.paddleW) {
        if (p.type === "wide") s.paddleW = Math.min(W * 0.7, s.paddleW + 40);
        if (p.type === "multiball") {
          const orig = s.balls[0];
          if (orig) {
            s.balls.push({ x: orig.x, y: orig.y, vx: -orig.vx, vy: orig.vy });
            s.balls.push({ x: orig.x, y: orig.y, vx: orig.vx * 0.5, vy: orig.vy });
          }
        }
        if (p.type === "laser") s.laser = true;
        return false;
      }
      return true;
    });

    // Move balls
    s.balls = s.balls.filter((ball) => {
      ball.x += ball.vx;
      ball.y += ball.vy;

      if (ball.x - BALL_R <= 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); }
      if (ball.x + BALL_R >= W) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx); }
      if (ball.y - BALL_R <= 0) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }

      // Paddle bounce
      if (
        ball.y + BALL_R >= H - 30 && ball.y + BALL_R <= H - 30 + PADDLE_H &&
        ball.x >= s.paddleX && ball.x <= s.paddleX + s.paddleW
      ) {
        ball.vy = -Math.abs(ball.vy);
        const rel = (ball.x - s.paddleX) / s.paddleW - 0.5;
        ball.vx = rel * 8;
        ball.y = H - 30 - BALL_R;
      }

      // Brick collisions
      s.bricks = s.bricks.filter((brick) => {
        if (
          ball.x + BALL_R > brick.x && ball.x - BALL_R < brick.x + BRICK_W &&
          ball.y + BALL_R > brick.y && ball.y - BALL_R < brick.y + BRICK_H
        ) {
          brick.hp--;
          ball.vy *= -1;
          if (brick.hp <= 0) {
            s.score += 10;
            onScoreUpdate(s.score);
            spawnPowerUp(brick.x + BRICK_W / 2, brick.y + BRICK_H / 2);
            return false;
          }
        }
        return true;
      });

      // Ball fell off bottom
      if (ball.y - BALL_R > H) return false;
      return true;
    });

    // All balls lost
    if (s.balls.length === 0) {
      s.lives--;
      if (s.lives <= 0) {
        s.gameOver = true;
        if (!gameOverFired.current) { gameOverFired.current = true; onGameOver(s.score); }
        return;
      }
      s.balls = [{ x: W / 2, y: H - 60, vx: 3, vy: -4 }];
    }

    // All bricks cleared
    if (s.bricks.length === 0) {
      s.score += 100;
      onScoreUpdate(s.score);
      s.bricks = makeBricks();
    }
  }, [onGameOver, onScoreUpdate, spawnPowerUp, makeBricks]);

  const loop = useCallback(() => {
    update();
    draw();
    animRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    if (!isActive || !started) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      state.current.mouseX = (e.clientX - rect.left) * (W / rect.width);
    };
    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      state.current.touchX = (e.touches[0].clientX - rect.left) * (W / rect.width);
    };
    const onTouchEnd = () => { state.current.touchX = -1; };

    canvas.addEventListener("mousemove", onMouse);
    canvas.addEventListener("touchmove", onTouch, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("mousemove", onMouse);
      canvas.removeEventListener("touchmove", onTouch);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [isActive, started, loop]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded"
        style={{ border: "1px solid rgba(0,245,255,0.3)", maxWidth: "100%", cursor: "none" }}
      />
      {!started && (
        <button
          type="button"
          className="font-arcade text-xs px-6 py-3 rounded"
          style={{ background: "transparent", color: "#00f5ff", border: "1px solid #00f5ff", boxShadow: "0 0 10px rgba(0,245,255,0.4)" }}
          onClick={() => setStarted(true)}
        >
          BREAK BRICKS
        </button>
      )}
      <p className="font-mono-tech text-xs" style={{ color: "rgba(0,245,255,0.5)" }}>
        Mouse / touch to move paddle · Catch power-ups for bonuses
      </p>
    </div>
  );
}
