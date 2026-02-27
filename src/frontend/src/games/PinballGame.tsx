import { useEffect, useRef, useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const W = 340;
const H = 580;

interface Ball { x: number; y: number; vx: number; vy: number; }
interface Bumper { x: number; y: number; r: number; lit: number; }

function initState() {
  return {
    ball: { x: W - 30, y: H - 120, vx: 0, vy: 0 } as Ball,
    leftFlipper: 0,   // angle in degrees, 0=resting
    rightFlipper: 0,
    launched: false,
    score: 0,
    lives: 3,
    bumpers: [
      { x: 100, y: 200, r: 22, lit: 0 },
      { x: 220, y: 170, r: 22, lit: 0 },
      { x: 160, y: 130, r: 20, lit: 0 },
      { x: 80, y: 290, r: 18, lit: 0 },
      { x: 250, y: 260, r: 18, lit: 0 },
    ] as Bumper[],
    plungerPower: 0,
    plunging: false,
  };
}

export default function PinballGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(initState());
  const keysRef = useRef({ left: false, right: false, launch: false });
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [started, setStarted] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;

    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, W, H);

    // Walls
    ctx.strokeStyle = "#00f5ff44";
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, W - 20, H - 20);

    // Lane guides
    ctx.strokeStyle = "#ffffff11";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(10, H - 80); ctx.lineTo(80, H - 140); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - 10, H - 80); ctx.lineTo(W - 80, H - 140); ctx.stroke();

    // Bumpers
    s.bumpers.forEach(b => {
      const glow = b.lit > 0 ? b.lit / 10 : 0;
      const col = b.lit > 0 ? `rgba(255,242,0,${0.8 + glow * 0.2})` : "#ff2d8e";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = b.lit > 0 ? "rgba(255,242,0,0.3)" : "rgba(255,45,142,0.15)";
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      if (b.lit > 0) {
        ctx.shadowColor = "#fff200";
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });

    // Flippers
    const flipAngleL = s.leftFlipper ? -30 : 20; // degrees from horizontal
    const flipAngleR = s.rightFlipper ? 210 : 160;
    const flipLen = 55;

    ctx.strokeStyle = "#00f5ff";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";

    // Left flipper pivot
    const lx = 80, ly = H - 60;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx + Math.cos(flipAngleL * Math.PI / 180) * flipLen, ly + Math.sin(flipAngleL * Math.PI / 180) * flipLen);
    ctx.stroke();

    // Right flipper pivot
    const rx = W - 80, ry = H - 60;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx + Math.cos(flipAngleR * Math.PI / 180) * flipLen, ry + Math.sin(flipAngleR * Math.PI / 180) * flipLen);
    ctx.stroke();

    // Ball
    ctx.beginPath();
    ctx.arc(s.ball.x, s.ball.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#c0c0c0";
    ctx.fill();
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Plunger
    if (!s.launched) {
      ctx.fillStyle = `rgba(255,242,0,${0.3 + s.plungerPower * 0.7})`;
      ctx.fillRect(W - 45, H - 90 + s.plungerPower * 20, 20, 30);
    }

    // Score & lives
    ctx.fillStyle = "#00f5ff";
    ctx.font = "bold 14px monospace";
    ctx.fillText(`${s.score}`, 20, 35);

    for (let i = 0; i < s.lives; i++) {
      ctx.beginPath();
      ctx.arc(W - 35 + i * 0, 30, 5, 0, Math.PI * 2);
    }

    ctx.fillStyle = "#ff4444";
    for (let i = 0; i < s.lives; i++) {
      ctx.beginPath();
      ctx.arc(W - 20 - i * 15, 30, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const update = useCallback((dt: number) => {
    const s = stateRef.current;
    if (!s.launched) {
      if (keysRef.current.launch) {
        s.plungerPower = Math.min(1, s.plungerPower + dt * 1.5);
        s.plunging = true;
      } else if (s.plunging) {
        // Release
        s.ball.vy = -(s.plungerPower * 18 + 8);
        s.ball.vx = -0.5;
        s.launched = true;
        s.plungerPower = 0;
        s.plunging = false;
      }
      return;
    }

    // Physics
    s.ball.vy += 0.4 * dt * 60;
    s.ball.vx *= 0.999;
    s.ball.x += s.ball.vx * dt * 60;
    s.ball.y += s.ball.vy * dt * 60;

    // Wall collisions
    if (s.ball.x < 20) { s.ball.x = 20; s.ball.vx = Math.abs(s.ball.vx) * 0.8; }
    if (s.ball.x > W - 20) { s.ball.x = W - 20; s.ball.vx = -Math.abs(s.ball.vx) * 0.8; }
    if (s.ball.y < 20) { s.ball.y = 20; s.ball.vy = Math.abs(s.ball.vy) * 0.8; }

    // Bumper collisions
    s.bumpers.forEach((b, _i) => {
      const dx = s.ball.x - b.x;
      const dy = s.ball.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < b.r + 10) {
        const nx = dx / dist;
        const ny = dy / dist;
        const speed = Math.sqrt(s.ball.vx * s.ball.vx + s.ball.vy * s.ball.vy);
        s.ball.vx = nx * Math.max(speed * 1.3, 8);
        s.ball.vy = ny * Math.max(speed * 1.3, 8);
        s.ball.x = b.x + nx * (b.r + 11);
        s.ball.y = b.y + ny * (b.r + 11);
        b.lit = 10;
        s.score += 100;
        setScore(s.score);
        onScoreUpdate(s.score);
      }
      if (b.lit > 0) b.lit--;
    });

    // Flipper collisions
    const flipAngleL = s.leftFlipper ? -30 : 20;
    const lx = 80, ly = H - 60;
    const flipLen = 55;
    const lex = lx + Math.cos(flipAngleL * Math.PI / 180) * flipLen;
    const ley = ly + Math.sin(flipAngleL * Math.PI / 180) * flipLen;

    // Simple flipper hit check
    if (s.ball.y > H - 100 && s.ball.x > 60 && s.ball.x < 140) {
      if (s.leftFlipper) {
        s.ball.vy = -14;
        s.ball.vx += 2;
        s.score += 10;
      }
      void (lex + ley);
    }

    const flipAngleR = s.rightFlipper ? 210 : 160;
    const rx = W - 80, ry = H - 60;
    const rex = rx + Math.cos(flipAngleR * Math.PI / 180) * flipLen;
    const rey = ry + Math.sin(flipAngleR * Math.PI / 180) * flipLen;
    if (s.ball.y > H - 100 && s.ball.x > W - 140 && s.ball.x < W - 60) {
      if (s.rightFlipper) {
        s.ball.vy = -14;
        s.ball.vx -= 2;
        s.score += 10;
      }
      void (rex + rey);
    }

    // Flipper control
    s.leftFlipper = keysRef.current.left ? 1 : 0;
    s.rightFlipper = keysRef.current.right ? 1 : 0;

    // Ball lost
    if (s.ball.y > H + 20) {
      s.lives--;
      setLives(s.lives);
      if (s.lives <= 0) {
        onGameOver(s.score);
        return;
      }
      s.ball = { x: W - 30, y: H - 120, vx: 0, vy: 0 };
      s.launched = false;
    }
  }, [onGameOver, onScoreUpdate]);

  useEffect(() => {
    if (!isActive) return;
    let running = true;

    const loop = (time: number) => {
      if (!running) return;
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = time;
      update(dt);
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [isActive, update, draw]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "z" || e.key === "Z" || e.key === "ArrowLeft") keysRef.current.left = true;
      if (e.key === "x" || e.key === "X" || e.key === "ArrowRight") keysRef.current.right = true;
      if (e.key === " ") { keysRef.current.launch = true; e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "z" || e.key === "Z" || e.key === "ArrowLeft") keysRef.current.left = false;
      if (e.key === "x" || e.key === "X" || e.key === "ArrowRight") keysRef.current.right = false;
      if (e.key === " ") keysRef.current.launch = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const handleCanvasDown = (side: "left" | "right" | "launch") => {
    if (side === "left") keysRef.current.left = true;
    if (side === "right") keysRef.current.right = true;
    if (side === "launch") keysRef.current.launch = true;
    if (!started) setStarted(true);
  };

  const handleCanvasUp = (side: "left" | "right" | "launch") => {
    if (side === "left") keysRef.current.left = false;
    if (side === "right") keysRef.current.right = false;
    if (side === "launch") keysRef.current.launch = false;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-6 font-arcade text-xs">
        <span style={{ color: "#00f5ff" }}>SCORE: {score}</span>
        <span style={{ color: "#ff4444" }}>LIVES: {"❤".repeat(lives)}</span>
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded"
        style={{ border: "1px solid rgba(0,245,255,0.2)", maxHeight: "70vh", width: "auto" }}
      />

      {/* Touch controls */}
      <div className="flex gap-4">
        <button
          type="button"
          className="font-arcade text-[10px] px-5 py-3 rounded select-none"
          style={{ background: "rgba(0,245,255,0.1)", color: "#00f5ff", border: "1px solid rgba(0,245,255,0.3)" }}
          onPointerDown={() => handleCanvasDown("left")}
          onPointerUp={() => handleCanvasUp("left")}
          onPointerLeave={() => handleCanvasUp("left")}
        >
          Z / LEFT
        </button>
        <button
          type="button"
          className="font-arcade text-[10px] px-5 py-3 rounded select-none"
          style={{ background: "rgba(255,242,0,0.1)", color: "#fff200", border: "1px solid rgba(255,242,0,0.3)" }}
          onPointerDown={() => handleCanvasDown("launch")}
          onPointerUp={() => handleCanvasUp("launch")}
          onPointerLeave={() => handleCanvasUp("launch")}
        >
          LAUNCH
        </button>
        <button
          type="button"
          className="font-arcade text-[10px] px-5 py-3 rounded select-none"
          style={{ background: "rgba(0,245,255,0.1)", color: "#00f5ff", border: "1px solid rgba(0,245,255,0.3)" }}
          onPointerDown={() => handleCanvasDown("right")}
          onPointerUp={() => handleCanvasUp("right")}
          onPointerLeave={() => handleCanvasUp("right")}
        >
          X / RIGHT
        </button>
      </div>

      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
        Hold SPACE to charge plunger, release to launch. Z=left flipper, X=right flipper
      </p>
    </div>
  );
}
