import { useEffect, useRef, useCallback, useState } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const W = 500;
const H = 500;
const PLAYER_W = 36;
const PLAYER_H = 20;
const BULLET_W = 3;
const BULLET_H = 12;
const ALIEN_W = 30;
const ALIEN_H = 22;
const ALIEN_COLS = 10;
const ALIEN_ROWS = 5;
const ALIEN_PAD_X = 14;
const ALIEN_PAD_Y = 16;
const BARRIER_COUNT = 4;
const BARRIER_BLOCK = 6;
const BARRIER_COLS = 8;
const BARRIER_ROWS = 5;

type AlienType = 0 | 1 | 2; // 0=top, 1=mid, 2=bottom

interface Alien {
  alive: boolean;
  x: number;
  y: number;
  type: AlienType;
}

interface Bullet {
  x: number;
  y: number;
  active: boolean;
}

interface AlienBullet {
  x: number;
  y: number;
  active: boolean;
}

interface Barrier {
  blocks: boolean[][];
  x: number;
  y: number;
}

function initAliens(): Alien[] {
  const aliens: Alien[] = [];
  for (let row = 0; row < ALIEN_ROWS; row++) {
    for (let col = 0; col < ALIEN_COLS; col++) {
      let type: AlienType = 2;
      if (row === 0) type = 0;
      else if (row <= 2) type = 1;
      aliens.push({
        alive: true,
        x: 30 + col * (ALIEN_W + ALIEN_PAD_X),
        y: 60 + row * (ALIEN_H + ALIEN_PAD_Y),
        type,
      });
    }
  }
  return aliens;
}

function initBarriers(): Barrier[] {
  const barriers: Barrier[] = [];
  const startX = 40;
  const gapX = (W - startX * 2 - BARRIER_COLS * BARRIER_BLOCK * BARRIER_COUNT) / (BARRIER_COUNT - 1) + BARRIER_COLS * BARRIER_BLOCK;
  for (let i = 0; i < BARRIER_COUNT; i++) {
    const bx = startX + i * gapX;
    const by = H - 120;
    const blocks: boolean[][] = [];
    for (let r = 0; r < BARRIER_ROWS; r++) {
      blocks.push(Array(BARRIER_COLS).fill(true));
    }
    // Notch bottom center
    if (blocks[BARRIER_ROWS - 2]) {
      blocks[BARRIER_ROWS - 2][BARRIER_COLS / 2 - 1] = false;
      blocks[BARRIER_ROWS - 2][BARRIER_COLS / 2] = false;
    }
    if (blocks[BARRIER_ROWS - 1]) {
      blocks[BARRIER_ROWS - 1][BARRIER_COLS / 2 - 2] = false;
      blocks[BARRIER_ROWS - 1][BARRIER_COLS / 2 - 1] = false;
      blocks[BARRIER_ROWS - 1][BARRIER_COLS / 2] = false;
      blocks[BARRIER_ROWS - 1][BARRIER_COLS / 2 + 1] = false;
    }
    barriers.push({ blocks, x: bx, y: by });
  }
  return barriers;
}

export default function SpaceInvadersGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const alienTickRef = useRef<number>(0);
  const [started, setStarted] = useState(false);

  const gameRef = useRef({
    player: { x: W / 2 - PLAYER_W / 2, y: H - 50 },
    bullets: [] as Bullet[],
    alienBullets: [] as AlienBullet[],
    aliens: initAliens(),
    barriers: initBarriers(),
    score: 0,
    lives: 3,
    running: false,
    wave: 1,
    alienDir: 1, // 1=right, -1=left
    alienDropPending: false,
    keys: { left: false, right: false, shoot: false },
    lastShot: 0,
    alienShootTimer: 0,
    alienMoveTimer: 0,
    alienMoveInterval: 800,
    animFrame: 0,
  });

  const draw = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current;

    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, W, H);

    // Starfield
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    for (let i = 0; i < 40; i++) {
      const sx = (i * 137 + timestamp * 0.01) % W;
      const sy = (i * 97) % H;
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Draw barriers
    g.barriers.forEach(b => {
      ctx.fillStyle = "#00aa44";
      b.blocks.forEach((row, r) => {
        row.forEach((alive, c) => {
          if (alive) {
            ctx.shadowColor = "#00ff55";
            ctx.shadowBlur = 3;
            ctx.fillRect(b.x + c * BARRIER_BLOCK, b.y + r * BARRIER_BLOCK, BARRIER_BLOCK - 1, BARRIER_BLOCK - 1);
          }
        });
      });
      ctx.shadowBlur = 0;
    });

    // Draw aliens
    g.aliens.forEach(alien => {
      if (!alien.alive) return;
      const anim = g.animFrame % 2;
      const colors = ["#ff3333", "#ff9900", "#39ff14"];
      const color = colors[alien.type];
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;

      // Draw alien body based on type
      if (alien.type === 0) {
        // Top row: saucer
        ctx.beginPath();
        ctx.ellipse(alien.x + ALIEN_W/2, alien.y + ALIEN_H/2, ALIEN_W/2 - 2, ALIEN_H/3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(alien.x + 6, alien.y + ALIEN_H/2 - 4, ALIEN_W - 12, 8);
        if (anim === 0) {
          ctx.fillRect(alien.x + 2, alien.y + ALIEN_H/2 + 4, 6, 5);
          ctx.fillRect(alien.x + ALIEN_W - 8, alien.y + ALIEN_H/2 + 4, 6, 5);
        } else {
          ctx.fillRect(alien.x + 4, alien.y + ALIEN_H/2 + 6, 6, 5);
          ctx.fillRect(alien.x + ALIEN_W - 10, alien.y + ALIEN_H/2 + 6, 6, 5);
        }
      } else if (alien.type === 1) {
        // Mid rows: crab
        ctx.fillRect(alien.x + 6, alien.y + 2, ALIEN_W - 12, ALIEN_H - 8);
        ctx.fillRect(alien.x + 2, alien.y + 6, ALIEN_W - 4, ALIEN_H - 14);
        if (anim === 0) {
          ctx.fillRect(alien.x,     alien.y + 4, 4, 6);
          ctx.fillRect(alien.x + ALIEN_W - 4, alien.y + 4, 4, 6);
          ctx.fillRect(alien.x + 4, alien.y + ALIEN_H - 6, 4, 6);
          ctx.fillRect(alien.x + ALIEN_W - 8, alien.y + ALIEN_H - 6, 4, 6);
        } else {
          ctx.fillRect(alien.x + 2,  alien.y + 2, 4, 6);
          ctx.fillRect(alien.x + ALIEN_W - 6, alien.y + 2, 4, 6);
          ctx.fillRect(alien.x + 2, alien.y + ALIEN_H - 8, 4, 6);
          ctx.fillRect(alien.x + ALIEN_W - 6, alien.y + ALIEN_H - 8, 4, 6);
        }
      } else {
        // Bottom rows: squid
        ctx.fillRect(alien.x + 4, alien.y + 2, ALIEN_W - 8, ALIEN_H - 6);
        if (anim === 0) {
          ctx.fillRect(alien.x,     alien.y + 10, 6, 8);
          ctx.fillRect(alien.x + ALIEN_W - 6, alien.y + 10, 6, 8);
        } else {
          ctx.fillRect(alien.x + 2,  alien.y + 8, 6, 8);
          ctx.fillRect(alien.x + ALIEN_W - 8, alien.y + 8, 6, 8);
        }
        ctx.fillRect(alien.x + 2, alien.y + ALIEN_H - 4, 4, 4);
        ctx.fillRect(alien.x + ALIEN_W - 6, alien.y + ALIEN_H - 4, 4, 4);
      }
      ctx.shadowBlur = 0;
    });

    // Draw player bullets
    g.bullets.forEach(b => {
      if (!b.active) return;
      ctx.fillStyle = "#00f5ff";
      ctx.shadowColor = "#00f5ff";
      ctx.shadowBlur = 10;
      ctx.fillRect(b.x - BULLET_W/2, b.y, BULLET_W, BULLET_H);
      ctx.shadowBlur = 0;
    });

    // Draw alien bullets
    g.alienBullets.forEach(b => {
      if (!b.active) return;
      ctx.fillStyle = "#ff3333";
      ctx.shadowColor = "#ff3333";
      ctx.shadowBlur = 8;
      ctx.fillRect(b.x - 2, b.y, 4, 10);
      ctx.shadowBlur = 0;
    });

    // Draw player ship
    const px = g.player.x;
    const py = g.player.y;
    ctx.fillStyle = "#00f5ff";
    ctx.shadowColor = "#00f5ff";
    ctx.shadowBlur = 15;
    // Hull
    ctx.fillRect(px + 8, py, PLAYER_W - 16, PLAYER_H - 6);
    // Wings
    ctx.fillRect(px, py + 8, PLAYER_W, PLAYER_H - 14);
    // Cannon
    ctx.fillRect(px + PLAYER_W/2 - 2, py - 8, 4, 12);
    ctx.shadowBlur = 0;

    // Draw lives
    for (let i = 0; i < g.lives; i++) {
      ctx.fillStyle = "#00f5ff";
      ctx.shadowColor = "#00f5ff";
      ctx.shadowBlur = 6;
      ctx.fillRect(10 + i * 24, H - 20, 14, 10);
      ctx.fillRect(10 + i * 24 + 3, H - 28, 8, 8);
      ctx.fillRect(10 + i * 24 + 5, H - 33, 4, 6);
      ctx.shadowBlur = 0;
    }

    // Wave indicator
    ctx.fillStyle = "#fff200";
    ctx.font = "9px 'Courier New', monospace";
    ctx.fillText(`WAVE ${g.wave}`, W - 70, H - 12);
  }, []);

  const tick = useCallback((timestamp: number) => {
    const g = gameRef.current;
    if (!g.running) return;

    const dt = timestamp - lastTickRef.current;
    lastTickRef.current = timestamp;

    // Move player
    const speed = 3;
    if (g.keys.left)  g.player.x = Math.max(0, g.player.x - speed);
    if (g.keys.right) g.player.x = Math.min(W - PLAYER_W, g.player.x + speed);

    // Shoot
    if (g.keys.shoot && timestamp - g.lastShot > 400) {
      const activeBullets = g.bullets.filter(b => b.active).length;
      if (activeBullets < 3) {
        g.bullets.push({ x: g.player.x + PLAYER_W/2, y: g.player.y, active: true });
        g.lastShot = timestamp;
      }
    }

    // Move bullets
    g.bullets.forEach(b => {
      if (!b.active) return;
      b.y -= 8;
      if (b.y < 0) b.active = false;
    });

    // Move alien bullets
    g.alienBullets.forEach(b => {
      if (!b.active) return;
      b.y += 5;
      if (b.y > H) b.active = false;
    });

    // Move aliens
    g.alienMoveTimer += dt;
    if (g.alienMoveTimer >= g.alienMoveInterval) {
      g.alienMoveTimer = 0;
      g.animFrame++;

      const aliveAliens = g.aliens.filter(a => a.alive);
      if (aliveAliens.length === 0) {
        // Next wave
        g.wave++;
        g.aliens = initAliens();
        g.alienMoveInterval = Math.max(100, 800 - g.wave * 80);
        g.alienDir = 1;
        g.alienBullets = [];
      } else {
        if (g.alienDropPending) {
          g.aliens.forEach(a => { if (a.alive) a.y += 20; });
          g.alienDir *= -1;
          g.alienDropPending = false;
        } else {
          const step = 10;
          g.aliens.forEach(a => { if (a.alive) a.x += step * g.alienDir; });

          let hitEdge = false;
          aliveAliens.forEach(a => {
            if (a.x <= 0 || a.x + ALIEN_W >= W) hitEdge = true;
          });
          if (hitEdge) g.alienDropPending = true;
        }

        // Alien bullets
        g.alienShootTimer += 1;
        if (g.alienShootTimer >= 8) {
          g.alienShootTimer = 0;
          // Random shooter from bottom-most in each column
          const colMap: Record<number, Alien> = {};
          aliveAliens.forEach(a => {
            const col = Math.round(a.x / (ALIEN_W + ALIEN_PAD_X));
            if (!colMap[col] || a.y > colMap[col].y) colMap[col] = a;
          });
          const shooters = Object.values(colMap);
          if (shooters.length > 0 && Math.random() < 0.4) {
            const shooter = shooters[Math.floor(Math.random() * shooters.length)];
            g.alienBullets.push({ x: shooter.x + ALIEN_W/2, y: shooter.y + ALIEN_H, active: true });
          }
        }
      }
    }

    // Bullet-alien collisions
    g.bullets.forEach(bullet => {
      if (!bullet.active) return;
      g.aliens.forEach(alien => {
        if (!alien.alive) return;
        if (
          bullet.x > alien.x && bullet.x < alien.x + ALIEN_W &&
          bullet.y > alien.y && bullet.y < alien.y + ALIEN_H
        ) {
          alien.alive = false;
          bullet.active = false;
          const pts = alien.type === 0 ? 30 : alien.type === 1 ? 20 : 10;
          g.score += pts;
          onScoreUpdate(g.score);
          // Speed up
          const alive = g.aliens.filter(a => a.alive).length;
          g.alienMoveInterval = Math.max(80, 100 + alive * 7);
        }
      });
    });

    // Bullet-barrier collisions (player bullets)
    g.bullets.forEach(bullet => {
      if (!bullet.active) return;
      g.barriers.forEach(b => {
        const brc = Math.floor((bullet.x - b.x) / BARRIER_BLOCK);
        const brr = Math.floor((bullet.y - b.y) / BARRIER_BLOCK);
        if (brc >= 0 && brc < BARRIER_COLS && brr >= 0 && brr < BARRIER_ROWS) {
          if (b.blocks[brr]?.[brc]) {
            b.blocks[brr][brc] = false;
            bullet.active = false;
          }
        }
      });
    });

    // Alien bullet-barrier and player collisions
    g.alienBullets.forEach(bullet => {
      if (!bullet.active) return;
      g.barriers.forEach(b => {
        const brc = Math.floor((bullet.x - b.x) / BARRIER_BLOCK);
        const brr = Math.floor((bullet.y - b.y) / BARRIER_BLOCK);
        if (brc >= 0 && brc < BARRIER_COLS && brr >= 0 && brr < BARRIER_ROWS) {
          if (b.blocks[brr]?.[brc]) {
            b.blocks[brr][brc] = false;
            bullet.active = false;
          }
        }
      });

      // Hit player
      if (
        bullet.active &&
        bullet.x > g.player.x && bullet.x < g.player.x + PLAYER_W &&
        bullet.y > g.player.y && bullet.y < g.player.y + PLAYER_H
      ) {
        bullet.active = false;
        g.lives--;
        if (g.lives <= 0) {
          g.running = false;
          onGameOver(g.score);
          return;
        }
      }
    });

    // Aliens reach bottom
    const aliveAliens = g.aliens.filter(a => a.alive);
    if (aliveAliens.some(a => a.y + ALIEN_H >= g.player.y)) {
      g.running = false;
      onGameOver(g.score);
      return;
    }

    // Cleanup
    g.bullets = g.bullets.filter(b => b.active);
    g.alienBullets = g.alienBullets.filter(b => b.active);

    draw(timestamp);
    rafRef.current = requestAnimationFrame(tick);
  }, [draw, onGameOver, onScoreUpdate]);

  const startGame = useCallback(() => {
    const g = gameRef.current;
    g.player = { x: W/2 - PLAYER_W/2, y: H - 50 };
    g.bullets = [];
    g.alienBullets = [];
    g.aliens = initAliens();
    g.barriers = initBarriers();
    g.score = 0;
    g.lives = 3;
    g.running = true;
    g.wave = 1;
    g.alienDir = 1;
    g.alienDropPending = false;
    g.lastShot = 0;
    g.alienShootTimer = 0;
    g.alienMoveTimer = 0;
    g.alienMoveInterval = 800;
    g.animFrame = 0;
    setStarted(true);
    onScoreUpdate(0);
    lastTickRef.current = performance.now();
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick, onScoreUpdate]);

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
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") { g.keys.left = down; e.preventDefault(); }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") { g.keys.right = down; e.preventDefault(); }
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
        className="border border-green-400"
        style={{ boxShadow: "0 0 20px rgba(57, 255, 20, 0.3)", maxWidth: "100%" }}
      />
      {!started && (
        <button
          onClick={startGame}
          type="button"
          className="font-arcade text-xs text-green-400 border border-green-400 px-6 py-3 hover:bg-green-400 hover:text-black transition-all"
          style={{ boxShadow: "0 0 10px rgba(57,255,20,0.5)" }}
        >
          START GAME
        </button>
      )}
    </div>
  );
}
