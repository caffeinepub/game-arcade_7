import { useEffect, useRef, useCallback, useState } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const W = 500;
const H = 500;
const MAX_BULLETS = 5;
const BULLET_LIFE = 1500;
const INVINCIBLE_TIME = 2000;
const THRUST_DECAY = 0.97;

type Vec2 = { x: number; y: number };

interface Asteroid {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  size: 0 | 1 | 2; // 0=large, 1=med, 2=small
  angle: number;
  rotSpeed: number;
  vertices: Vec2[];
  alive: boolean;
}

interface Bullet {
  x: number; y: number;
  vx: number; vy: number;
  born: number;
  alive: boolean;
}

interface Player {
  x: number; y: number;
  vx: number; vy: number;
  angle: number;
  alive: boolean;
}

const ASTEROID_RADII = [36, 20, 10];
const ASTEROID_POINTS = [3, 5, 10];
const ASTEROID_SPEED_MULT = [1, 1.6, 2.4];

function randomVertices(r: number): Vec2[] {
  const count = 10 + Math.floor(Math.random() * 5);
  const verts: Vec2[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const jitter = r * (0.7 + Math.random() * 0.6);
    verts.push({ x: Math.cos(angle) * jitter, y: Math.sin(angle) * jitter });
  }
  return verts;
}

function spawnAsteroid(size: 0 | 1 | 2, x?: number, y?: number): Asteroid {
  const edge = Math.floor(Math.random() * 4);
  let ax: number, ay: number;
  if (x !== undefined && y !== undefined) {
    ax = x; ay = y;
  } else {
    if (edge === 0) { ax = Math.random() * W; ay = 0; }
    else if (edge === 1) { ax = W; ay = Math.random() * H; }
    else if (edge === 2) { ax = Math.random() * W; ay = H; }
    else { ax = 0; ay = Math.random() * H; }
  }
  const speed = (0.5 + Math.random() * 1.2) * ASTEROID_SPEED_MULT[size];
  const angle = Math.random() * Math.PI * 2;
  const r = ASTEROID_RADII[size];
  return {
    x: ax, y: ay,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: r,
    size,
    angle: 0,
    rotSpeed: (Math.random() - 0.5) * 0.04,
    vertices: randomVertices(r),
    alive: true,
  };
}

function wrapPos(v: Vec2): Vec2 {
  return { x: ((v.x % W) + W) % W, y: ((v.y % H) + H) % H };
}

function circlesOverlap(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy < (ar + br) * (ar + br);
}

export default function AsteroidsGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [started, setStarted] = useState(false);

  const gameRef = useRef({
    player: { x: W/2, y: H/2, vx: 0, vy: 0, angle: -Math.PI/2, alive: true } as Player,
    bullets: [] as Bullet[],
    asteroids: [] as Asteroid[],
    score: 0,
    lives: 3,
    running: false,
    wave: 1,
    invincibleUntil: 0,
    keys: { left: false, right: false, up: false, shoot: false },
    lastShot: 0,
    thrustFlame: 0,
  });

  const spawnWave = useCallback((wave: number) => {
    const g = gameRef.current;
    const count = 3 + wave;
    g.asteroids = [];
    for (let i = 0; i < count; i++) {
      let ax: number, ay: number;
      do {
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) { ax = Math.random() * W; ay = 0; }
        else if (edge === 1) { ax = W; ay = Math.random() * H; }
        else if (edge === 2) { ax = Math.random() * W; ay = H; }
        else { ax = 0; ay = Math.random() * H; }
      } while (circlesOverlap(ax, ay, 40, W/2, H/2, 100));
      g.asteroids.push(spawnAsteroid(0, ax, ay));
    }
  }, []);

  const drawPlayer = useCallback((ctx: CanvasRenderingContext2D, p: Player, invincible: boolean, timestamp: number) => {
    if (!p.alive) return;
    const g = gameRef.current;
    const size = 14;

    if (invincible && Math.floor(timestamp / 150) % 2 === 0) return;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    // Thrust flame
    if (g.keys.up) {
      const flameLen = 6 + Math.random() * 10;
      ctx.fillStyle = "#ff6600";
      ctx.shadowColor = "#ff9900";
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(-size * 0.4, size * 0.5);
      ctx.lineTo(0, size * 0.5 + flameLen);
      ctx.lineTo(size * 0.4, size * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Ship triangle
    ctx.fillStyle = "#00f5ff";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#00f5ff";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(-size * 0.6, size * 0.6);
    ctx.lineTo(-size * 0.25, size * 0.25);
    ctx.lineTo(size * 0.25, size * 0.25);
    ctx.lineTo(size * 0.6, size * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  }, []);

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current;

    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 60; i++) {
      const sx = (i * 137.5) % W;
      const sy = (i * 97.3) % H;
      const size = i % 3 === 0 ? 1.5 : 1;
      ctx.fillRect(sx, sy, size, size);
    }

    // Draw asteroids
    g.asteroids.forEach(ast => {
      if (!ast.alive) return;
      ctx.save();
      ctx.translate(ast.x, ast.y);
      ctx.rotate(ast.angle);
      const colors = ["#aaaaff", "#88aaff", "#ffffff"];
      ctx.strokeStyle = colors[ast.size];
      ctx.shadowColor = colors[ast.size];
      ctx.shadowBlur = 6;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ast.vertices.forEach((v, i) => {
        if (i === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      });
      ctx.closePath();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    });

    // Draw bullets
    g.bullets.forEach(b => {
      if (!b.alive) return;
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw player
    drawPlayer(ctx, g.player, timestamp < g.invincibleUntil, timestamp);

    // Draw lives
    for (let i = 0; i < g.lives; i++) {
      ctx.save();
      ctx.translate(20 + i * 22, H - 18);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = "#00f5ff";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.shadowColor = "#00f5ff";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(-5, 5);
      ctx.lineTo(0, 2);
      ctx.lineTo(5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Wave indicator
    ctx.fillStyle = "#fff200";
    ctx.font = "9px 'Courier New', monospace";
    ctx.fillText(`WAVE ${g.wave}`, W - 70, H - 12);
  }, [drawPlayer]);

  const tick = useCallback((timestamp: number) => {
    const g = gameRef.current;
    if (!g.running) return;

    const dt = Math.min(timestamp - lastTimeRef.current, 50);
    lastTimeRef.current = timestamp;

    // Rotate
    if (g.keys.left)  g.player.angle -= 0.05;
    if (g.keys.right) g.player.angle += 0.05;

    // Thrust
    if (g.keys.up) {
      g.player.vx += Math.cos(g.player.angle) * 0.25;
      g.player.vy += Math.sin(g.player.angle) * 0.25;
      const speed = Math.sqrt(g.player.vx**2 + g.player.vy**2);
      if (speed > 6) {
        g.player.vx = (g.player.vx / speed) * 6;
        g.player.vy = (g.player.vy / speed) * 6;
      }
    }

    // Decelerate
    g.player.vx *= THRUST_DECAY;
    g.player.vy *= THRUST_DECAY;

    // Move player
    g.player.x += g.player.vx;
    g.player.y += g.player.vy;
    const wp = wrapPos(g.player);
    g.player.x = wp.x; g.player.y = wp.y;

    // Shoot
    if (g.keys.shoot && timestamp - g.lastShot > 250) {
      const activeBullets = g.bullets.filter(b => b.alive).length;
      if (activeBullets < MAX_BULLETS) {
        const speed = 10;
        g.bullets.push({
          x: g.player.x + Math.cos(g.player.angle) * 16,
          y: g.player.y + Math.sin(g.player.angle) * 16,
          vx: Math.cos(g.player.angle) * speed + g.player.vx,
          vy: Math.sin(g.player.angle) * speed + g.player.vy,
          born: timestamp,
          alive: true,
        });
        g.lastShot = timestamp;
      }
    }

    // Move bullets
    g.bullets.forEach(b => {
      if (!b.alive) return;
      b.x += b.vx;
      b.y += b.vy;
      const wb = wrapPos(b);
      b.x = wb.x; b.y = wb.y;
      if (timestamp - b.born > BULLET_LIFE) b.alive = false;
    });

    // Move asteroids
    const newAsteroids: Asteroid[] = [];
    g.asteroids.forEach(ast => {
      if (!ast.alive) return;
      ast.x += ast.vx;
      ast.y += ast.vy;
      const wa = wrapPos(ast);
      ast.x = wa.x; ast.y = wa.y;
      ast.angle += ast.rotSpeed;

      // Bullet collision
      let hit = false;
      g.bullets.forEach(b => {
        if (!b.alive || hit) return;
        if (circlesOverlap(ast.x, ast.y, ast.radius, b.x, b.y, 3)) {
          b.alive = false;
          hit = true;
          ast.alive = false;
          g.score += ASTEROID_POINTS[ast.size];
          onScoreUpdate(g.score);

          if (ast.size < 2) {
            const nextSize = (ast.size + 1) as 1 | 2;
            for (let i = 0; i < 2; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = ASTEROID_SPEED_MULT[nextSize] * (0.8 + Math.random() * 0.8);
              const child: Asteroid = {
                ...spawnAsteroid(nextSize, ast.x, ast.y),
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
              };
              newAsteroids.push(child);
            }
          }
        }
      });
    });

    g.asteroids = [...g.asteroids.filter(a => a.alive), ...newAsteroids];
    g.bullets = g.bullets.filter(b => b.alive);

    // Player-asteroid collision
    const invincible = timestamp < g.invincibleUntil;
    if (!invincible) {
      for (const ast of g.asteroids) {
        if (!ast.alive) continue;
        if (circlesOverlap(g.player.x, g.player.y, 10, ast.x, ast.y, ast.radius * 0.7)) {
          g.lives--;
          if (g.lives <= 0) {
            g.running = false;
            onGameOver(g.score);
            return;
          }
          g.player.x = W/2; g.player.y = H/2;
          g.player.vx = 0; g.player.vy = 0;
          g.player.angle = -Math.PI/2;
          g.invincibleUntil = timestamp + INVINCIBLE_TIME;
          break;
        }
      }
    }

    // Next wave
    if (g.asteroids.length === 0) {
      g.wave++;
      spawnWave(g.wave);
    }

    draw(timestamp);
    rafRef.current = requestAnimationFrame(tick);
  }, [draw, onGameOver, onScoreUpdate, spawnWave]);

  const startGame = useCallback(() => {
    const g = gameRef.current;
    g.player = { x: W/2, y: H/2, vx: 0, vy: 0, angle: -Math.PI/2, alive: true };
    g.bullets = [];
    g.score = 0;
    g.lives = 3;
    g.running = true;
    g.wave = 1;
    g.invincibleUntil = performance.now() + INVINCIBLE_TIME;
    g.keys = { left: false, right: false, up: false, shoot: false };
    g.lastShot = 0;
    spawnWave(1);
    setStarted(true);
    onScoreUpdate(0);
    lastTimeRef.current = performance.now();
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick, spawnWave, onScoreUpdate]);

  useEffect(() => {
    if (!isActive) {
      gameRef.current.running = false;
      cancelAnimationFrame(rafRef.current);
    }
  }, [isActive]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const g = gameRef.current;
      const down = e.type === "keydown";
      if (e.key === "ArrowLeft"  || e.key === "a" || e.key === "A") { g.keys.left  = down; e.preventDefault(); }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { g.keys.right = down; e.preventDefault(); }
      if (e.key === "ArrowUp"    || e.key === "w" || e.key === "W") { g.keys.up    = down; e.preventDefault(); }
      if (e.key === " ") { g.keys.shoot = down; e.preventDefault(); }
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKey);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    draw(0);
  }, [draw]);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="border border-cyan-400"
        style={{ boxShadow: "0 0 20px rgba(0, 245, 255, 0.3)", maxWidth: "100%" }}
      />
      {!started && (
        <button
          onClick={startGame}
          type="button"
          className="font-arcade text-xs text-cyan-400 border border-cyan-400 px-6 py-3 hover:bg-cyan-400 hover:text-black transition-all"
          style={{ boxShadow: "0 0 10px rgba(0,245,255,0.5)" }}
        >
          START GAME
        </button>
      )}
    </div>
  );
}
