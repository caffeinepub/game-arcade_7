import { useEffect, useRef, useCallback, useState } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const W = 480;
const H = 560;
const R = 22; // bubble radius
const COLS = 10;
const ROWS_INIT = 8;
const COLORS = ["#00f5ff", "#39ff14", "#ff2d8e", "#bf5fff", "#fff200"];

type Bubble = { color: string; x: number; y: number; active: boolean };

function gridX(col: number, row: number) {
  return R + col * (R * 2) + (row % 2 === 0 ? 0 : R);
}
function gridY(row: number) {
  return R + row * (R * 1.75);
}

function initGrid(): Bubble[] {
  const bubbles: Bubble[] = [];
  for (let row = 0; row < ROWS_INIT; row++) {
    const cols = row % 2 === 0 ? COLS : COLS - 1;
    for (let col = 0; col < cols; col++) {
      bubbles.push({ color: COLORS[Math.floor(Math.random() * COLORS.length)], x: gridX(col, row), y: gridY(row), active: true });
    }
  }
  return bubbles;
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

export default function BubbleShooterGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [started, setStarted] = useState(false);

  const state = useRef({
    grid: initGrid(),
    shooter: { x: W / 2, y: H - 40, angle: -Math.PI / 2 },
    bullet: null as { x: number; y: number; vx: number; vy: number; color: string } | null,
    nextColor: COLORS[Math.floor(Math.random() * COLORS.length)],
    score: 0,
    gameOver: false,
    aimX: W / 2,
    aimY: 0,
  });

  const gameOverFired = useRef(false);

  const getAngle = useCallback((mx: number, my: number) => {
    const s = state.current;
    const dx = mx - s.shooter.x;
    const dy = my - s.shooter.y;
    return Math.atan2(dy, dx);
  }, []);

  const popGroup = useCallback((startIdx: number) => {
    const s = state.current;
    const color = s.grid[startIdx]?.color;
    if (!color) return 0;
    const visited = new Set<number>();
    const queue = [startIdx];
    while (queue.length) {
      const idx = queue.shift()!;
      if (visited.has(idx)) continue;
      visited.add(idx);
      const b = s.grid[idx];
      if (!b || !b.active || b.color !== color) continue;
      // Find neighbors
      s.grid.forEach((nb, ni) => {
        if (!visited.has(ni) && nb.active && nb.color === color && dist(b.x, b.y, nb.x, nb.y) < R * 2.2) {
          queue.push(ni);
        }
      });
    }
    if (visited.size >= 3) {
      visited.forEach((idx) => { s.grid[idx].active = false; });
      return visited.size;
    }
    return 0;
  }, []);

  const shoot = useCallback(() => {
    const s = state.current;
    if (s.bullet || s.gameOver) return;
    const speed = 10;
    s.bullet = {
      x: s.shooter.x, y: s.shooter.y,
      vx: Math.cos(s.shooter.angle) * speed,
      vy: Math.sin(s.shooter.angle) * speed,
      color: s.nextColor,
    };
    s.nextColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = state.current;

    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, W, H);

    // Grid bubbles
    s.grid.forEach((b) => {
      if (!b.active) return;
      ctx.beginPath();
      ctx.arc(b.x, b.y, R - 1, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Aim line
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(s.shooter.x, s.shooter.y);
    let ax = s.shooter.x + Math.cos(s.shooter.angle) * 150;
    let ay = s.shooter.y + Math.sin(s.shooter.angle) * 150;
    ctx.lineTo(ax, ay);
    ctx.stroke();
    ctx.setLineDash([]);

    // Shooter base
    ctx.beginPath();
    ctx.arc(s.shooter.x, s.shooter.y, R + 2, 0, Math.PI * 2);
    ctx.fillStyle = s.nextColor;
    ctx.shadowColor = s.nextColor;
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Bullet in flight
    if (s.bullet) {
      ctx.beginPath();
      ctx.arc(s.bullet.x, s.bullet.y, R - 1, 0, Math.PI * 2);
      ctx.fillStyle = s.bullet.color;
      ctx.shadowColor = s.bullet.color;
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Score
    ctx.font = "12px 'Press Start 2P', cursive";
    ctx.fillStyle = "#00f5ff";
    ctx.textAlign = "left";
    ctx.fillText(`SCORE: ${s.score}`, 8, H - 8);

    if (s.gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff2d8e";
      ctx.font = "20px 'Press Start 2P', cursive";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", W / 2, H / 2);
    }
  }, []);

  const update = useCallback(() => {
    const s = state.current;
    if (!s.bullet || s.gameOver) return;

    s.bullet.x += s.bullet.vx;
    s.bullet.y += s.bullet.vy;

    // Bounce off walls
    if (s.bullet.x - R < 0) { s.bullet.x = R; s.bullet.vx = Math.abs(s.bullet.vx); }
    if (s.bullet.x + R > W) { s.bullet.x = W - R; s.bullet.vx = -Math.abs(s.bullet.vx); }

    // Hit top
    if (s.bullet.y - R <= 0) {
      // Snap to nearest grid position
      const nearestRow = Math.round((s.bullet.y - R) / (R * 1.75));
      const row = Math.max(0, nearestRow);
      const cols = row % 2 === 0 ? COLS : COLS - 1;
      const col = Math.round((s.bullet.x - R - (row % 2 === 0 ? 0 : R)) / (R * 2));
      const clampedCol = Math.max(0, Math.min(cols - 1, col));
      s.grid.push({ color: s.bullet.color, x: gridX(clampedCol, row), y: gridY(row), active: true });
      const popped = popGroup(s.grid.length - 1);
      if (popped > 0) {
        s.score += popped * 10;
        onScoreUpdate(s.score);
      }
      s.bullet = null;
      // Check if bubbles reached bottom
      const lowest = s.grid.filter(b => b.active).reduce((m, b) => Math.max(m, b.y), 0);
      if (lowest > H - 100) {
        s.gameOver = true;
        if (!gameOverFired.current) { gameOverFired.current = true; onGameOver(s.score); }
      }
      return;
    }

    // Collision with grid bubbles
    for (let i = 0; i < s.grid.length; i++) {
      const b = s.grid[i];
      if (!b.active) continue;
      if (dist(s.bullet.x, s.bullet.y, b.x, b.y) < R * 2) {
        // Snap to neighboring spot
        const angle = Math.atan2(s.bullet.y - b.y, s.bullet.x - b.x);
        const nx = b.x + Math.cos(angle) * R * 2;
        const ny = b.y + Math.sin(angle) * R * 2;
        s.grid.push({ color: s.bullet.color, x: nx, y: ny, active: true });
        const popped = popGroup(s.grid.length - 1);
        if (popped > 0) {
          s.score += popped * 10;
          onScoreUpdate(s.score);
        }
        s.bullet = null;
        break;
      }
    }
  }, [popGroup, onGameOver, onScoreUpdate]);

  const loop = useCallback(() => {
    update();
    draw();
    animRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    if (!isActive || !started) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (W / rect.width);
      const my = (e.clientY - rect.top) * (H / rect.height);
      const s = state.current;
      const ang = Math.atan2(my - s.shooter.y, mx - s.shooter.x);
      state.current.shooter.angle = Math.max(-Math.PI + 0.1, Math.min(-0.1, ang));
    };

    const onClick = () => shoot();

    const onTouch = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = (e.touches[0].clientX - rect.left) * (W / rect.width);
      const my = (e.touches[0].clientY - rect.top) * (H / rect.height);
      const ang = getAngle(mx, my);
      state.current.shooter.angle = Math.max(-Math.PI + 0.1, Math.min(-0.1, ang));
      shoot();
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("touchstart", onTouch, { passive: false });

    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("touchstart", onTouch);
    };
  }, [isActive, started, loop, shoot, getAngle]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded"
        style={{ border: "1px solid rgba(191,95,255,0.3)", maxWidth: "100%", cursor: started ? "crosshair" : "default" }}
      />
      {!started && (
        <button
          type="button"
          className="font-arcade text-xs px-6 py-3 rounded"
          style={{ background: "transparent", color: "#bf5fff", border: "1px solid #bf5fff", boxShadow: "0 0 10px rgba(191,95,255,0.4)" }}
          onClick={() => setStarted(true)}
        >
          LAUNCH BUBBLES
        </button>
      )}
      <p className="font-mono-tech text-xs" style={{ color: "rgba(191,95,255,0.5)" }}>
        Move mouse to aim · Click to shoot · Pop 3+ same color
      </p>
    </div>
  );
}
