import { useEffect, useRef, useCallback, useState } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const W = 600;
const H = 400;
const PADDLE_H = 80;
const PADDLE_W = 12;
const BALL_SIZE = 10;
const PADDLE_SPEED = 5;
const CPU_SPEED = 3.5;

export default function PongGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [started, setStarted] = useState(false);

  const state = useRef({
    playerY: H / 2 - PADDLE_H / 2,
    cpuY: H / 2 - PADDLE_H / 2,
    ballX: W / 2,
    ballY: H / 2,
    ballVX: 4,
    ballVY: 3,
    playerScore: 0,
    cpuScore: 0,
    rallies: 0,
    gameOver: false,
    keys: { up: false, down: false },
    mouseY: H / 2,
    touchY: -1,
  });

  const gameOverFired = useRef(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = state.current;

    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, W, H);

    // Center line
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = "rgba(0,245,255,0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // Player paddle
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#00f5ff";
    ctx.fillStyle = "#00f5ff";
    ctx.fillRect(10, s.playerY, PADDLE_W, PADDLE_H);

    // CPU paddle
    ctx.shadowColor = "#ff2d8e";
    ctx.fillStyle = "#ff2d8e";
    ctx.fillRect(W - 10 - PADDLE_W, s.cpuY, PADDLE_W, PADDLE_H);

    // Ball
    ctx.shadowColor = "#fff200";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#fff200";
    ctx.fillRect(s.ballX - BALL_SIZE / 2, s.ballY - BALL_SIZE / 2, BALL_SIZE, BALL_SIZE);

    ctx.shadowBlur = 0;

    // Scores
    ctx.font = "bold 32px 'Press Start 2P', cursive";
    ctx.fillStyle = "rgba(0,245,255,0.4)";
    ctx.textAlign = "center";
    ctx.fillText(String(s.playerScore), W / 2 - 80, 50);
    ctx.fillStyle = "rgba(255,45,142,0.4)";
    ctx.fillText(String(s.cpuScore), W / 2 + 80, 50);

    // Rallies label
    ctx.font = "10px 'Press Start 2P', cursive";
    ctx.fillStyle = "rgba(255,242,0,0.6)";
    ctx.fillText(`RALLIES: ${s.rallies}`, W / 2, H - 12);
  }, []);

  const update = useCallback(() => {
    const s = state.current;
    if (s.gameOver) return;

    // Player paddle movement
    if (s.touchY >= 0) {
      const target = s.touchY - PADDLE_H / 2;
      const dy = target - s.playerY;
      s.playerY += Math.sign(dy) * Math.min(Math.abs(dy), PADDLE_SPEED * 2);
    } else if (s.keys.up) {
      s.playerY -= PADDLE_SPEED;
    } else if (s.keys.down) {
      s.playerY += PADDLE_SPEED;
    } else {
      // Mouse tracking
      const target = s.mouseY - PADDLE_H / 2;
      const dy = target - s.playerY;
      s.playerY += Math.sign(dy) * Math.min(Math.abs(dy), PADDLE_SPEED * 2);
    }
    s.playerY = Math.max(0, Math.min(H - PADDLE_H, s.playerY));

    // CPU AI
    const cpuCenter = s.cpuY + PADDLE_H / 2;
    if (s.ballX > W / 2) {
      if (cpuCenter < s.ballY - 5) s.cpuY += CPU_SPEED;
      else if (cpuCenter > s.ballY + 5) s.cpuY -= CPU_SPEED;
    }
    s.cpuY = Math.max(0, Math.min(H - PADDLE_H, s.cpuY));

    // Ball movement
    s.ballX += s.ballVX;
    s.ballY += s.ballVY;

    // Wall bounce top/bottom
    if (s.ballY - BALL_SIZE / 2 <= 0) { s.ballY = BALL_SIZE / 2; s.ballVY = Math.abs(s.ballVY); }
    if (s.ballY + BALL_SIZE / 2 >= H) { s.ballY = H - BALL_SIZE / 2; s.ballVY = -Math.abs(s.ballVY); }

    // Player paddle collision
    if (
      s.ballX - BALL_SIZE / 2 <= 10 + PADDLE_W &&
      s.ballX - BALL_SIZE / 2 >= 10 &&
      s.ballY >= s.playerY &&
      s.ballY <= s.playerY + PADDLE_H
    ) {
      s.ballX = 10 + PADDLE_W + BALL_SIZE / 2;
      s.ballVX = Math.abs(s.ballVX) * 1.05;
      const hitPos = (s.ballY - s.playerY) / PADDLE_H - 0.5;
      s.ballVY = hitPos * 8;
      s.rallies++;
      onScoreUpdate(s.rallies);
    }

    // CPU paddle collision
    if (
      s.ballX + BALL_SIZE / 2 >= W - 10 - PADDLE_W &&
      s.ballX + BALL_SIZE / 2 <= W - 10 &&
      s.ballY >= s.cpuY &&
      s.ballY <= s.cpuY + PADDLE_H
    ) {
      s.ballX = W - 10 - PADDLE_W - BALL_SIZE / 2;
      s.ballVX = -Math.abs(s.ballVX) * 1.05;
      const hitPos = (s.ballY - s.cpuY) / PADDLE_H - 0.5;
      s.ballVY = hitPos * 8;
    }

    // Speed cap
    const speed = Math.sqrt(s.ballVX ** 2 + s.ballVY ** 2);
    if (speed > 12) {
      s.ballVX = (s.ballVX / speed) * 12;
      s.ballVY = (s.ballVY / speed) * 12;
    }

    // Scoring
    if (s.ballX < 0) {
      s.cpuScore++;
      if (s.cpuScore >= 7) {
        s.gameOver = true;
        if (!gameOverFired.current) { gameOverFired.current = true; onGameOver(s.rallies); }
        return;
      }
      s.ballX = W / 2; s.ballY = H / 2;
      s.ballVX = 4; s.ballVY = (Math.random() - 0.5) * 6;
    }
    if (s.ballX > W) {
      s.playerScore++;
      if (s.playerScore >= 7) {
        s.gameOver = true;
        if (!gameOverFired.current) { gameOverFired.current = true; onGameOver(s.rallies + 10); }
        return;
      }
      s.ballX = W / 2; s.ballY = H / 2;
      s.ballVX = -4; s.ballVY = (Math.random() - 0.5) * 6;
    }
  }, [onGameOver, onScoreUpdate]);

  const loop = useCallback(() => {
    update();
    draw();
    animRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    if (!isActive || !started) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const onKey = (e: KeyboardEvent) => {
      const s = state.current;
      if (e.key === "ArrowUp" || e.key === "w") s.keys.up = e.type === "keydown";
      if (e.key === "ArrowDown" || e.key === "s") s.keys.down = e.type === "keydown";
      if (["ArrowUp","ArrowDown"].includes(e.key)) e.preventDefault();
    };
    const onMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      state.current.mouseY = (e.clientY - rect.top) * (H / rect.height);
    };
    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      state.current.touchY = (e.touches[0].clientY - rect.top) * (H / rect.height);
    };
    const onTouchEnd = () => { state.current.touchY = -1; };

    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    canvas.addEventListener("mousemove", onMouse);
    canvas.addEventListener("touchmove", onTouch, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd);

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      canvas.removeEventListener("mousemove", onMouse);
      canvas.removeEventListener("touchmove", onTouch);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [isActive, started, loop]);

  // Draw initial state
  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded border"
        style={{
          border: "1px solid rgba(0,245,255,0.3)",
          maxWidth: "100%",
          cursor: started ? "none" : "default",
        }}
      />
      {!started && (
        <button
          className="font-arcade text-xs px-6 py-3 rounded"
          style={{ background: "transparent", color: "#00f5ff", border: "1px solid #00f5ff", boxShadow: "0 0 10px rgba(0,245,255,0.4)" }}
          onClick={() => setStarted(true)}
          type="button"
        >
          PLAY — FIRST TO 7 WINS
        </button>
      )}
      <p className="font-mono-tech text-xs" style={{ color: "rgba(0,245,255,0.5)" }}>
        Move mouse / Arrow keys / Touch to control player paddle (left)
      </p>
    </div>
  );
}
