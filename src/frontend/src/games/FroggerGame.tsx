import { useEffect, useRef, useCallback, useState } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const COLS = 13;
const ROWS = 14;
const CELL = 44;
const W = COLS * CELL;
const H = ROWS * CELL;

type Lane = { type: "road" | "water" | "safe"; speed: number; dir: 1 | -1; objects: { x: number; w: number }[] };

function makeLanes(): Lane[] {
  const road = (speed: number, dir: 1 | -1): Lane => ({
    type: "road", speed, dir,
    objects: Array.from({ length: 3 }, (_, i) => ({ x: i * (COLS * CELL / 3), w: CELL * 2 })),
  });
  const water = (speed: number, dir: 1 | -1): Lane => ({
    type: "water", speed, dir,
    objects: Array.from({ length: 3 }, (_, i) => ({ x: i * (COLS * CELL / 3), w: CELL * 3 })),
  });
  return [
    { type: "safe", speed: 0, dir: 1, objects: [] },    // row 0 top goal
    water(1.5, 1), water(1, -1), water(2, 1), water(1.2, -1), water(0.8, 1),
    { type: "safe", speed: 0, dir: 1, objects: [] },    // row 6 median
    road(2, -1), road(1.5, 1), road(2.5, -1), road(1, 1), road(2, -1),
    { type: "safe", speed: 0, dir: 1, objects: [] },    // row 12 start zone
    { type: "safe", speed: 0, dir: 1, objects: [] },    // row 13
  ];
}

export default function FroggerGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [started, setStarted] = useState(false);

  const state = useRef({
    frogRow: ROWS - 1,
    frogCol: Math.floor(COLS / 2),
    score: 0,
    lives: 3,
    lanes: makeLanes(),
    gameOver: false,
    moving: false,
    onLog: false,
  });

  const gameOverFired = useRef(false);

  const reset = useCallback(() => {
    const s = state.current;
    s.frogRow = ROWS - 1;
    s.frogCol = Math.floor(COLS / 2);
    s.onLog = false;
    s.moving = false;
  }, []);

  const die = useCallback(() => {
    const s = state.current;
    s.lives--;
    if (s.lives <= 0) {
      s.gameOver = true;
      if (!gameOverFired.current) { gameOverFired.current = true; onGameOver(s.score); }
    } else {
      reset();
    }
  }, [onGameOver, reset]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = state.current;

    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, W, H);

    s.lanes.forEach((lane, row) => {
      const y = row * CELL;
      if (lane.type === "road") {
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, y, W, CELL);
        // Lane lines
        ctx.strokeStyle = "rgba(255,242,0,0.2)";
        ctx.setLineDash([20, 20]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y + CELL - 0.5);
        ctx.lineTo(W, y + CELL - 0.5);
        ctx.stroke();
        ctx.setLineDash([]);

        // Cars
        lane.objects.forEach((obj) => {
          ctx.shadowColor = "#ff2d8e";
          ctx.shadowBlur = 8;
          ctx.fillStyle = "#ff2d8e";
          ctx.fillRect(obj.x + 2, y + 6, obj.w - 4, CELL - 12);
          // Headlights
          ctx.fillStyle = "#fff200";
          const hl = lane.dir > 0 ? obj.x + obj.w - 6 : obj.x + 2;
          ctx.fillRect(hl, y + 8, 4, 6);
        });
      } else if (lane.type === "water") {
        ctx.fillStyle = "#001a33";
        ctx.fillRect(0, y, W, CELL);
        lane.objects.forEach((obj) => {
          ctx.shadowColor = "#39ff14";
          ctx.shadowBlur = 6;
          ctx.fillStyle = "#1a4a1a";
          ctx.fillRect(obj.x + 2, y + 4, obj.w - 4, CELL - 8);
          ctx.fillStyle = "#39ff14";
          ctx.font = "14px monospace";
          ctx.fillText("LOG", obj.x + obj.w / 2 - 15, y + CELL / 2 + 5);
        });
      } else {
        ctx.fillStyle = "#0d1f0d";
        ctx.fillRect(0, y, W, CELL);
        ctx.strokeStyle = "rgba(57,255,20,0.1)";
        ctx.lineWidth = 1;
        ctx.strokeRect(0, y, W, CELL);
      }
      ctx.shadowBlur = 0;
    });

    // Frog
    if (!s.gameOver) {
      const fx = s.frogCol * CELL + CELL / 2;
      const fy = s.frogRow * CELL + CELL / 2;
      ctx.shadowColor = "#39ff14";
      ctx.shadowBlur = 15;
      ctx.font = `${CELL - 8}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🐸", fx, fy);
      ctx.shadowBlur = 0;
    }

    // HUD
    ctx.font = "12px 'Press Start 2P', cursive";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#00f5ff";
    ctx.fillText(`SCORE:${s.score}  ❤️×${s.lives}`, 8, 4);
  }, []);

  const update = useCallback((dt: number) => {
    const s = state.current;
    if (s.gameOver) return;

    s.lanes.forEach((lane, row) => {
      lane.objects.forEach((obj) => {
        obj.x += lane.speed * lane.dir * dt * 60;
        if (obj.x > W) obj.x = -obj.w;
        if (obj.x + obj.w < 0) obj.x = W;
      });

      // Water: check if frog is on a log
      if (lane.type === "water" && row === s.frogRow) {
        s.onLog = false;
        let logX = -1;
        lane.objects.forEach((obj) => {
          const fx = s.frogCol * CELL + CELL / 2;
          if (fx >= obj.x && fx <= obj.x + obj.w) {
            s.onLog = true;
            logX = obj.x;
          }
        });
        if (s.onLog) {
          // Move frog with log
          s.frogCol += lane.speed * lane.dir * dt * 60 / CELL;
          if (s.frogCol < 0 || s.frogCol >= COLS) die();
        } else {
          die();
        }
      }

      // Road: check collision with cars
      if (lane.type === "road" && row === s.frogRow) {
        const fx = s.frogCol * CELL;
        lane.objects.forEach((obj) => {
          if (fx + 4 < obj.x + obj.w && fx + CELL - 4 > obj.x) {
            die();
          }
        });
      }
    });
  }, [die]);

  const loop = useCallback((timestamp: number) => {
    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = timestamp;
    update(dt);
    draw();
    animRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  const moveFrog = useCallback((dir: "up" | "down" | "left" | "right") => {
    const s = state.current;
    if (s.gameOver || s.moving) return;
    const prev = s.frogRow;
    if (dir === "up") s.frogRow = Math.max(0, s.frogRow - 1);
    if (dir === "down") s.frogRow = Math.min(ROWS - 1, s.frogRow + 1);
    if (dir === "left") s.frogCol = Math.max(0, Math.floor(s.frogCol) - 1);
    if (dir === "right") s.frogCol = Math.min(COLS - 1, Math.floor(s.frogCol) + 1);

    // Reached top
    if (s.frogRow === 0 && prev > 0) {
      s.score += 10;
      onScoreUpdate(s.score);
      reset();
    }
    if (s.frogRow < prev) {
      s.score += 1;
      onScoreUpdate(s.score);
    }
  }, [onScoreUpdate, reset]);

  useEffect(() => {
    if (!isActive || !started) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w") { e.preventDefault(); moveFrog("up"); }
      if (e.key === "ArrowDown" || e.key === "s") { e.preventDefault(); moveFrog("down"); }
      if (e.key === "ArrowLeft" || e.key === "a") { e.preventDefault(); moveFrog("left"); }
      if (e.key === "ArrowRight" || e.key === "d") { e.preventDefault(); moveFrog("right"); }
    };

    window.addEventListener("keydown", onKey);
    lastTimeRef.current = performance.now();
    animRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("keydown", onKey);
    };
  }, [isActive, started, loop, moveFrog]);

  useEffect(() => { draw(); }, [draw]);

  const dirs = [
    { label: "▲", dir: "up" as const, col: 1, row: 0 },
    { label: "◀", dir: "left" as const, col: 0, row: 1 },
    { label: "▼", dir: "down" as const, col: 1, row: 1 },
    { label: "▶", dir: "right" as const, col: 2, row: 1 },
  ];

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded"
        style={{ border: "1px solid rgba(57,255,20,0.3)", maxWidth: "100%" }}
      />
      {!started ? (
        <button
          type="button"
          className="font-arcade text-xs px-6 py-3 rounded"
          style={{ background: "transparent", color: "#39ff14", border: "1px solid #39ff14", boxShadow: "0 0 10px rgba(57,255,20,0.4)" }}
          onClick={() => setStarted(true)}
        >
          START FROGGER
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-1" style={{ width: 120 }}>
          {dirs.map(({ label, dir, col, row }) => (
            <button
              key={dir}
              type="button"
              className="font-arcade text-sm h-10 w-10 flex items-center justify-center rounded"
              style={{
                gridColumn: col + 1, gridRow: row + 1,
                background: "rgba(57,255,20,0.1)", color: "#39ff14",
                border: "1px solid rgba(57,255,20,0.4)",
              }}
              onTouchStart={(e) => { e.preventDefault(); moveFrog(dir); }}
              onClick={() => moveFrog(dir)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <p className="font-mono-tech text-xs" style={{ color: "rgba(57,255,20,0.5)" }}>
        Arrow keys / D-pad · Hop across traffic and logs
      </p>
    </div>
  );
}
