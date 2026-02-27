import { useEffect, useRef, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const W = 320;
const H = 500;
const PLAT_W = 60;
const PLAT_H = 10;
const PLAYER_W = 24;
const PLAYER_H = 24;
const GRAVITY = 0.4;
const JUMP_FORCE = -12;
const NUM_PLATFORMS = 10;

interface Platform { x: number; y: number; }
interface Player { x: number; y: number; vy: number; vx: number; }

function initPlatforms(): Platform[] {
  const plats: Platform[] = [{ x: W / 2 - PLAT_W / 2, y: H - 40 }];
  for (let i = 1; i < NUM_PLATFORMS; i++) {
    plats.push({
      x: Math.random() * (W - PLAT_W),
      y: H - 40 - i * (H / NUM_PLATFORMS),
    });
  }
  return plats;
}

export default function DoodleJumpGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    player: { x: W / 2 - PLAYER_W / 2, y: H - 80, vy: JUMP_FORCE, vx: 0 } as Player,
    platforms: initPlatforms(),
    score: 0,
    cameraY: 0,
    maxHeight: 0,
    dead: false,
  });
  const keysRef = useRef({ left: false, right: false });
  const rafRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;
    const cam = s.cameraY;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#050510");
    grad.addColorStop(1, "#0a0a1f");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    for (let i = 0; i < 30; i++) {
      const sx = ((i * 137 + cam * 0.1) % W + W) % W;
      const sy = ((i * 97) % H + H) % H;
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Platforms
    s.platforms.forEach(p => {
      const screenY = p.y - cam;
      if (screenY < -PLAT_H || screenY > H + PLAT_H) return;
      ctx.fillStyle = "#39ff14";
      ctx.shadowColor = "#39ff14";
      ctx.shadowBlur = 6;
      ctx.fillRect(p.x, screenY, PLAT_W, PLAT_H);
      ctx.shadowBlur = 0;
    });

    // Player (doodle character)
    const px = s.player.x;
    const py = s.player.y - cam;
    ctx.fillStyle = "#00f5ff";
    ctx.shadowColor = "#00f5ff";
    ctx.shadowBlur = 10;
    ctx.fillRect(px, py, PLAYER_W, PLAYER_H);
    // Eyes
    ctx.fillStyle = "#0a0a0f";
    ctx.shadowBlur = 0;
    ctx.fillRect(px + 4, py + 6, 5, 5);
    ctx.fillRect(px + 15, py + 6, 5, 5);
    // Feet
    ctx.fillStyle = "#00f5ff";
    ctx.fillRect(px + 2, py + PLAYER_H, 6, 4);
    ctx.fillRect(px + PLAYER_W - 8, py + PLAYER_H, 6, 4);

    // Score
    ctx.fillStyle = "#fff200";
    ctx.font = "bold 14px monospace";
    ctx.fillText(`${s.score}`, 10, 25);
  }, []);

  const update = useCallback(() => {
    const s = stateRef.current;
    if (s.dead) return;

    // Horizontal input
    if (keysRef.current.left) s.player.vx = -4;
    else if (keysRef.current.right) s.player.vx = 4;
    else s.player.vx *= 0.85;

    s.player.vy += GRAVITY;
    s.player.x += s.player.vx;
    s.player.y += s.player.vy;

    // Wrap horizontal
    if (s.player.x < -PLAYER_W) s.player.x = W;
    if (s.player.x > W) s.player.x = -PLAYER_W;

    // Camera: keep player in upper half
    if (s.player.y - s.cameraY < H / 2) {
      const delta = H / 2 - (s.player.y - s.cameraY);
      s.cameraY -= delta;
      s.maxHeight = Math.max(s.maxHeight, -s.cameraY);
      s.score = Math.floor(s.maxHeight / 10);
      onScoreUpdate(s.score);
    }

    // Platform collisions (only falling down)
    if (s.player.vy > 0) {
      for (const p of s.platforms) {
        const screenPY = p.y;
        const py = s.player.y + PLAYER_H;
        if (
          py >= screenPY && py <= screenPY + PLAT_H + s.player.vy + 2 &&
          s.player.x + PLAYER_W > p.x + 5 &&
          s.player.x < p.x + PLAT_W - 5
        ) {
          s.player.vy = JUMP_FORCE;
          s.player.y = screenPY - PLAYER_H;
          break;
        }
      }
    }

    // Generate new platforms as we go up
    const topPlat = Math.min(...s.platforms.map(p => p.y));
    while (s.platforms.length < NUM_PLATFORMS + 5) {
      const highestY = Math.min(...s.platforms.map(p => p.y));
      s.platforms.push({
        x: Math.random() * (W - PLAT_W),
        y: highestY - 50 - Math.random() * 40,
      });
    }

    // Remove off-screen platforms
    const bottomCutoff = s.cameraY + H + 100;
    s.platforms = s.platforms.filter(p => p.y < bottomCutoff);

    void topPlat;

    // Death: fell off screen
    if (s.player.y - s.cameraY > H + 50) {
      s.dead = true;
      onGameOver(s.score);
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

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, update, draw]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") keysRef.current.left = true;
      if (e.key === "ArrowRight" || e.key === "d") keysRef.current.right = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") keysRef.current.left = false;
      if (e.key === "ArrowRight" || e.key === "d") keysRef.current.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded"
        style={{ border: "1px solid rgba(57,255,20,0.25)", maxHeight: "70vh", width: "auto" }}
      />
      <div className="flex gap-3">
        <button
          type="button"
          className="font-arcade text-[10px] px-6 py-3 rounded select-none"
          style={{ background: "rgba(57,255,20,0.1)", color: "#39ff14", border: "1px solid rgba(57,255,20,0.3)" }}
          onPointerDown={() => { keysRef.current.left = true; }}
          onPointerUp={() => { keysRef.current.left = false; }}
          onPointerLeave={() => { keysRef.current.left = false; }}
        >
          ← LEFT
        </button>
        <button
          type="button"
          className="font-arcade text-[10px] px-6 py-3 rounded select-none"
          style={{ background: "rgba(57,255,20,0.1)", color: "#39ff14", border: "1px solid rgba(57,255,20,0.3)" }}
          onPointerDown={() => { keysRef.current.right = true; }}
          onPointerUp={() => { keysRef.current.right = false; }}
          onPointerLeave={() => { keysRef.current.right = false; }}
        >
          RIGHT →
        </button>
      </div>
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
        Arrow keys or A/D to move. Land on platforms to bounce higher!
      </p>
    </div>
  );
}
