import { useEffect, useRef, useCallback, useState } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const TILE = 50;
const COLS = 11;
const VISIBLE_ROWS = 11;
const W = COLS * TILE;
const H = VISIBLE_ROWS * TILE;

type LaneType = "grass" | "road" | "water";
type LaneDef = { type: LaneType; speed: number; dir: 1 | -1; objects: { x: number; w: number }[] };

function makeLane(row: number): LaneDef {
  if (row === 0 || row % 7 === 0) return { type: "grass", speed: 0, dir: 1, objects: [] };
  if (row % 3 === 0) return {
    type: "water", speed: 1 + Math.random() * 1.5, dir: row % 6 === 0 ? 1 : -1,
    objects: Array.from({ length: 3 }, (_, i) => ({ x: i * (W / 3), w: TILE * 2 + Math.random() * TILE })),
  };
  return {
    type: "road", speed: 1.5 + Math.random() * 2, dir: row % 2 === 0 ? 1 : -1,
    objects: Array.from({ length: 3 }, (_, i) => ({ x: i * (W / 3) + Math.random() * 20, w: TILE * 2 })),
  };
}

export default function CrossyRoadGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const [started, setStarted] = useState(false);

  const state = useRef({
    frogRow: 0,  // local row in window (0 = bottom)
    frogCol: Math.floor(COLS / 2),
    frogX: 0,
    frogY: 0,
    cameraRow: 0, // how many rows scrolled up
    score: 0,
    maxScore: 0,
    lanes: Array.from({ length: 40 }, (_, i) => makeLane(i)),
    gameOver: false,
    onLog: false,
    logDelta: 0,
  });

  const gameOverFired = useRef(false);

  const die = useCallback(() => {
    const s = state.current;
    if (s.gameOver) return;
    s.gameOver = true;
    if (!gameOverFired.current) { gameOverFired.current = true; onGameOver(s.score); }
  }, [onGameOver]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = state.current;

    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, W, H);

    // Draw lanes (bottom = frog start)
    for (let row = 0; row < VISIBLE_ROWS; row++) {
      const laneIdx = s.cameraRow + row;
      const lane = s.lanes[laneIdx] ?? { type: "grass", speed: 0, dir: 1, objects: [] };
      const y = (VISIBLE_ROWS - 1 - row) * TILE;

      // Lane background
      if (lane.type === "grass") {
        ctx.fillStyle = "#0d2010";
        ctx.fillRect(0, y, W, TILE);
        ctx.strokeStyle = "rgba(57,255,20,0.08)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(0, y, W, TILE);
      } else if (lane.type === "road") {
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, y, W, TILE);
        lane.objects.forEach((obj) => {
          ctx.shadowColor = "#ff2d8e";
          ctx.shadowBlur = 6;
          ctx.fillStyle = "#cc2266";
          ctx.fillRect(obj.x + 2, y + 8, obj.w - 4, TILE - 16);
          ctx.fillStyle = "#fff200";
          const hl = lane.dir > 0 ? obj.x + obj.w - 5 : obj.x + 2;
          ctx.fillRect(hl, y + 10, 4, 6);
          ctx.shadowBlur = 0;
        });
      } else {
        ctx.fillStyle = "#001830";
        ctx.fillRect(0, y, W, TILE);
        lane.objects.forEach((obj) => {
          ctx.shadowColor = "#39ff14";
          ctx.shadowBlur = 4;
          ctx.fillStyle = "#1a3a1a";
          ctx.fillRect(obj.x + 2, y + 8, obj.w - 4, TILE - 16);
          ctx.shadowBlur = 0;
        });
      }
    }

    // Frog
    const frogScreenRow = s.frogRow - s.cameraRow;
    const fx = s.frogCol * TILE + TILE / 2 + s.logDelta;
    const fy = (VISIBLE_ROWS - 1 - frogScreenRow) * TILE + TILE / 2;
    ctx.font = `${TILE - 8}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#39ff14";
    ctx.shadowBlur = 10;
    ctx.fillText("🐸", fx, fy);
    ctx.shadowBlur = 0;

    // HUD
    ctx.font = "12px 'Press Start 2P', cursive";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#00f5ff";
    ctx.fillText(`SCORE: ${s.score}`, 8, 6);
  }, []);

  const update = useCallback((dt: number) => {
    const s = state.current;
    if (s.gameOver) return;

    s.logDelta = 0;

    s.lanes.forEach((lane, laneIdx) => {
      lane.objects.forEach((obj) => {
        obj.x += lane.speed * lane.dir * dt * 60;
        if (obj.x > W) obj.x = -obj.w;
        if (obj.x + obj.w < 0) obj.x = W;
      });

      if (laneIdx === s.frogRow) {
        if (lane.type === "water") {
          s.onLog = false;
          for (const obj of lane.objects) {
            const fx = s.frogCol * TILE + TILE / 2;
            if (fx >= obj.x && fx <= obj.x + obj.w) {
              s.onLog = true;
              s.logDelta += lane.speed * lane.dir * dt * 60;
              s.frogCol += lane.speed * lane.dir * dt * 60 / TILE;
            }
          }
          if (!s.onLog) die();
          if (s.frogCol < 0 || s.frogCol >= COLS) die();
        } else if (lane.type === "road") {
          const fc = Math.floor(s.frogCol);
          const fx = fc * TILE;
          for (const obj of lane.objects) {
            if (fx + 6 < obj.x + obj.w && fx + TILE - 6 > obj.x) {
              die();
            }
          }
        }
      }
    });
  }, [die]);

  const loop = useCallback((ts: number) => {
    const dt = Math.min((ts - lastRef.current) / 1000, 0.05);
    lastRef.current = ts;
    update(dt);
    draw();
    animRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  const moveFrog = useCallback((dir: "up" | "down" | "left" | "right") => {
    const s = state.current;
    if (s.gameOver) return;
    if (dir === "up") {
      s.frogRow++;
      s.score++;
      if (s.score > s.maxScore) s.maxScore = s.score;
      onScoreUpdate(s.score);
      if (s.frogRow > s.cameraRow + VISIBLE_ROWS - 2) s.cameraRow++;
    }
    if (dir === "down") { s.frogRow = Math.max(s.cameraRow, s.frogRow - 1); }
    if (dir === "left") s.frogCol = Math.max(0, Math.floor(s.frogCol) - 1);
    if (dir === "right") s.frogCol = Math.min(COLS - 1, Math.floor(s.frogCol) + 1);
  }, [onScoreUpdate]);

  useEffect(() => {
    if (!isActive || !started) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w") { e.preventDefault(); moveFrog("up"); }
      if (e.key === "ArrowDown" || e.key === "s") { e.preventDefault(); moveFrog("down"); }
      if (e.key === "ArrowLeft" || e.key === "a") { e.preventDefault(); moveFrog("left"); }
      if (e.key === "ArrowRight" || e.key === "d") { e.preventDefault(); moveFrog("right"); }
    };
    window.addEventListener("keydown", onKey);
    lastRef.current = performance.now();
    animRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("keydown", onKey);
    };
  }, [isActive, started, loop, moveFrog]);

  useEffect(() => { draw(); }, [draw]);

  const dirs: { label: string; dir: "up" | "down" | "left" | "right"; col: number; row: number }[] = [
    { label: "▲", dir: "up", col: 1, row: 0 },
    { label: "◀", dir: "left", col: 0, row: 1 },
    { label: "▼", dir: "down", col: 1, row: 1 },
    { label: "▶", dir: "right", col: 2, row: 1 },
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
          START CROSSY ROAD
        </button>
      ) : (
        <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(3, 40px)", gridTemplateRows: "repeat(2, 40px)" }}>
          {dirs.map(({ label, dir, col, row }) => (
            <button
              key={dir}
              type="button"
              className="font-arcade text-sm flex items-center justify-center rounded"
              style={{
                gridColumn: col + 1, gridRow: row + 1, width: 40, height: 40,
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
        Arrow keys / D-pad · Hop forward to score
      </p>
    </div>
  );
}
