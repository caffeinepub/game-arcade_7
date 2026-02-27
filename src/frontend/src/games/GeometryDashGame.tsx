import { useEffect, useRef, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const W = 600;
const H = 300;
const GROUND_Y = 240;
const PLAYER_SIZE = 30;
const GRAVITY = 0.65;
const JUMP_V = -13;
const SPEED = 5;

interface Obstacle { x: number; w: number; h: number; type: "spike" | "block"; }

function generateObstacles(count: number, startX: number): Obstacle[] {
  const obs: Obstacle[] = [];
  let x = startX;
  for (let i = 0; i < count; i++) {
    x += 200 + Math.random() * 300;
    const type = Math.random() > 0.5 ? "spike" : "block";
    const h = type === "spike" ? 40 : 30 + Math.random() * 40;
    obs.push({ x, w: type === "spike" ? 30 : 35, h, type });
  }
  return obs;
}

export default function GeometryDashGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    playerY: GROUND_Y - PLAYER_SIZE,
    playerVY: 0,
    onGround: true,
    rotation: 0,
    cameraX: 0,
    obstacles: generateObstacles(30, 300),
    score: 0,
    dead: false,
    distanceTraveled: 0,
  });
  const jumpRef = useRef(false);
  const rafRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;

    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#05050f");
    grad.addColorStop(1, "#0f0520");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Grid lines (rhythm effect)
    const gridOff = (s.cameraX * 0.3) % 60;
    ctx.strokeStyle = "rgba(191,95,255,0.12)";
    ctx.lineWidth = 1;
    for (let x = -gridOff; x < W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Ground
    ctx.fillStyle = "#bf5fff";
    ctx.shadowColor = "#bf5fff";
    ctx.shadowBlur = 8;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.shadowBlur = 0;

    // Obstacles
    s.obstacles.forEach(obs => {
      const sx = obs.x - s.cameraX;
      if (sx > W + 50 || sx < -50) return;
      ctx.fillStyle = obs.type === "spike" ? "#ff4444" : "#ff2d8e";
      ctx.shadowColor = obs.type === "spike" ? "#ff4444" : "#ff2d8e";
      ctx.shadowBlur = 8;
      if (obs.type === "spike") {
        ctx.beginPath();
        ctx.moveTo(sx, GROUND_Y);
        ctx.lineTo(sx + obs.w / 2, GROUND_Y - obs.h);
        ctx.lineTo(sx + obs.w, GROUND_Y);
        ctx.fill();
      } else {
        ctx.fillRect(sx, GROUND_Y - obs.h, obs.w, obs.h);
      }
      ctx.shadowBlur = 0;
    });

    // Player cube
    const px = 80;
    const py = s.playerY;
    ctx.save();
    ctx.translate(px + PLAYER_SIZE / 2, py + PLAYER_SIZE / 2);
    ctx.rotate(s.rotation * Math.PI / 180);
    ctx.fillStyle = "#00f5ff";
    ctx.shadowColor = "#00f5ff";
    ctx.shadowBlur = 12;
    ctx.fillRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
    // Inner detail
    ctx.fillStyle = "#0a0a0f";
    ctx.shadowBlur = 0;
    ctx.fillRect(-PLAYER_SIZE / 2 + 6, -PLAYER_SIZE / 2 + 6, PLAYER_SIZE - 12, PLAYER_SIZE - 12);
    ctx.restore();

    // Score
    ctx.fillStyle = "#fff200";
    ctx.font = "bold 14px monospace";
    ctx.fillText(`${s.score}`, 10, 25);

    // Progress bar
    const progress = Math.min(s.distanceTraveled / 3000, 1);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(W - 160, 10, 150, 8);
    ctx.fillStyle = "#00f5ff";
    ctx.fillRect(W - 160, 10, 150 * progress, 8);
  }, []);

  const update = useCallback(() => {
    const s = stateRef.current;
    if (s.dead) return;

    // Move camera
    s.cameraX += SPEED;
    s.distanceTraveled += SPEED;
    s.score = Math.floor(s.distanceTraveled / 10);
    onScoreUpdate(s.score);

    // Player physics
    if (!s.onGround) s.playerVY += GRAVITY;
    s.playerY += s.playerVY;

    if (jumpRef.current && s.onGround) {
      s.playerVY = JUMP_V;
      s.onGround = false;
    }

    // Ground
    if (s.playerY >= GROUND_Y - PLAYER_SIZE) {
      s.playerY = GROUND_Y - PLAYER_SIZE;
      s.playerVY = 0;
      s.onGround = true;
    }

    // Rotation
    if (!s.onGround) s.rotation += 8;
    else s.rotation = Math.round(s.rotation / 90) * 90;

    // Collision with obstacles
    const px = 80;
    const playerRect = { x: px + 3, y: s.playerY + 3, w: PLAYER_SIZE - 6, h: PLAYER_SIZE - 6 };

    for (const obs of s.obstacles) {
      const sx = obs.x - s.cameraX;
      let obsRect = { x: sx, y: GROUND_Y - obs.h, w: obs.w, h: obs.h };
      if (obs.type === "spike") obsRect = { x: sx + 4, y: GROUND_Y - obs.h + 10, w: obs.w - 8, h: obs.h - 10 };

      if (
        playerRect.x < obsRect.x + obsRect.w &&
        playerRect.x + playerRect.w > obsRect.x &&
        playerRect.y < obsRect.y + obsRect.h &&
        playerRect.y + playerRect.h > obsRect.y
      ) {
        s.dead = true;
        onGameOver(s.score);
        return;
      }
    }

    // Generate more obstacles
    const lastObs = s.obstacles[s.obstacles.length - 1];
    if (lastObs && lastObs.x - s.cameraX < W + 200) {
      const newObs = generateObstacles(5, lastObs.x + 200);
      s.obstacles.push(...newObs);
    }

    // Win condition: 3000 units
    if (s.distanceTraveled >= 3000) {
      onGameOver(s.score + 500);
    }
  }, [onGameOver, onScoreUpdate]);

  useEffect(() => {
    if (!isActive) return;
    let running = true;
    const loop = () => {
      if (!running) return;
      update();
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [isActive, update, draw]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w") { e.preventDefault(); jumpRef.current = true; }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp" || e.key === "w") jumpRef.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded"
        style={{ border: "1px solid rgba(191,95,255,0.25)", maxWidth: "100%", height: "auto" }}
        onPointerDown={() => { jumpRef.current = true; }}
        onPointerUp={() => { jumpRef.current = false; }}
      />
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
        SPACE / Click / Tap to jump over spikes and blocks!
      </p>
    </div>
  );
}
