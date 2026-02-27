import { useEffect, useRef, useCallback, useState } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const W = 360;
const H = 500;
const GROUND_Y = H - 40;
const BLOCK_H = 28;
const BASE_W = 180;
const SPEED_INC = 0.3;

interface Block {
  x: number;
  w: number;
  y: number;
  color: string;
}

const PALETTE = ["#00f5ff","#39ff14","#bf5fff","#ff2d8e","#fff200","#ff8c00"];

function getBlockColor(level: number) { return PALETTE[level % PALETTE.length]; }

export default function StackGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    blocks: [{ x: W / 2 - BASE_W / 2, w: BASE_W, y: GROUND_Y - BLOCK_H, color: PALETTE[0] }] as Block[],
    moving: { x: 0, w: BASE_W, dir: 1, speed: 3 } as { x: number; w: number; dir: number; speed: number },
    level: 1,
    score: 0,
    dead: false,
    cameraOffset: 0,
  });
  const rafRef = useRef(0);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;
    const cam = s.cameraOffset;

    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Stacked blocks
    s.blocks.forEach((block, i) => {
      const screenY = block.y + cam;
      if (screenY > H + 10 || screenY < -BLOCK_H) return;
      ctx.fillStyle = block.color;
      ctx.shadowColor = block.color;
      ctx.shadowBlur = 6;
      ctx.fillRect(block.x, screenY, block.w, BLOCK_H - 2);
      ctx.shadowBlur = 0;
      // Shine effect
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(block.x, screenY, block.w, 3);
      void i;
    });

    // Moving block
    const topBlock = s.blocks[s.blocks.length - 1];
    const movingY = topBlock.y - BLOCK_H + cam;
    ctx.fillStyle = getBlockColor(s.level);
    ctx.shadowColor = getBlockColor(s.level);
    ctx.shadowBlur = 10;
    ctx.fillRect(s.moving.x, movingY, s.moving.w, BLOCK_H - 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(s.moving.x, movingY, s.moving.w, 3);

    // Score
    ctx.fillStyle = "#fff200";
    ctx.font = "bold 16px monospace";
    ctx.fillText(`${s.score}`, 10, 28);

    // Level
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "12px monospace";
    ctx.fillText(`LV ${s.level}`, W - 60, 28);
  }, []);

  const drop = useCallback(() => {
    if (!isActive) return;
    const s = stateRef.current;
    if (s.dead) return;
    if (!started) { setStarted(true); return; }

    const top = s.blocks[s.blocks.length - 1];
    const mx = s.moving.x;
    const mw = s.moving.w;
    const tx = top.x;
    const tw = top.w;

    // Calculate overlap
    const overlapStart = Math.max(mx, tx);
    const overlapEnd = Math.min(mx + mw, tx + tw);
    const overlapW = overlapEnd - overlapStart;

    if (overlapW <= 0) {
      // Missed entirely
      s.dead = true;
      onGameOver(s.score);
      return;
    }

    const newBlock: Block = {
      x: overlapStart,
      w: overlapW,
      y: top.y - BLOCK_H,
      color: getBlockColor(s.level),
    };
    s.blocks.push(newBlock);
    s.level++;
    s.score += Math.ceil(overlapW / tw * 100);
    setScore(s.score);
    onScoreUpdate(s.score);

    // Camera: scroll up
    s.cameraOffset += BLOCK_H;

    // New moving block
    s.moving = {
      x: -newBlock.w,
      w: newBlock.w,
      dir: 1,
      speed: 3 + s.level * SPEED_INC,
    };
  }, [isActive, started, onGameOver, onScoreUpdate]);

  useEffect(() => {
    if (!isActive) return;
    let running = true;

    const loop = () => {
      if (!running) return;
      const s = stateRef.current;
      if (!s.dead && started) {
        s.moving.x += s.moving.dir * s.moving.speed;
        if (s.moving.x + s.moving.w > W + 10) { s.moving.dir = -1; }
        if (s.moving.x < -10) { s.moving.dir = 1; }
      }
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [isActive, started, draw]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowDown") { e.preventDefault(); drop(); }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [drop]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="font-arcade text-xs" style={{ color: "#00f5ff" }}>
        SCORE: {score}
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded cursor-pointer"
        style={{ border: "1px solid rgba(0,245,255,0.2)", maxHeight: "65vh", width: "auto" }}
        onClick={drop}
      />
      {!started && (
        <div className="font-arcade text-sm text-center" style={{ color: "#fff200" }}>
          CLICK or SPACE to start stacking!
        </div>
      )}
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
        Click / SPACE to drop the block. Align it with the stack below!
      </p>
    </div>
  );
}
