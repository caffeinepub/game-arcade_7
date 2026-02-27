import { useEffect, useRef, useCallback, useState } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const W = 360;
const H = 520;
const SEGMENT_COLORS = ["#ff4444","#00f5ff","#39ff14","#fff200"];
const BALL_R = 12;
const OBSTACLE_Y_START = H / 2 - 20;

interface Obstacle {
  y: number;
  rotation: number;
  speed: number;
  type: "circle" | "square";
}

export default function ColorSwitchGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    ballY: H * 0.75,
    ballVY: 0,
    ballColorIdx: 0,
    obstacles: [
      { y: OBSTACLE_Y_START, rotation: 0, speed: 1.2, type: "circle" as const },
      { y: OBSTACLE_Y_START - 300, rotation: 45, speed: -0.9, type: "square" as const },
    ] as Obstacle[],
    score: 0,
    dead: false,
    cameraY: 0,
  });
  const rafRef = useRef(0);
  const jumpRef = useRef(false);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;

    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, W, H);

    // Ball
    ctx.beginPath();
    ctx.arc(W / 2, s.ballY - s.cameraY, BALL_R, 0, Math.PI * 2);
    ctx.fillStyle = SEGMENT_COLORS[s.ballColorIdx];
    ctx.shadowColor = SEGMENT_COLORS[s.ballColorIdx];
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Obstacles
    s.obstacles.forEach(obs => {
      const screenY = obs.y - s.cameraY;
      if (Math.abs(screenY - H / 2) > H) return;

      const R = 55;
      ctx.save();
      ctx.translate(W / 2, screenY);
      ctx.rotate(obs.rotation * Math.PI / 180);

      if (obs.type === "circle") {
        // 4 colored segments
        for (let i = 0; i < 4; i++) {
          const startAngle = (i * 90 - 5) * Math.PI / 180;
          const endAngle = ((i + 1) * 90 - 5) * Math.PI / 180;
          ctx.beginPath();
          ctx.arc(0, 0, R, startAngle, endAngle);
          ctx.arc(0, 0, R - 18, endAngle, startAngle, true);
          ctx.closePath();
          ctx.fillStyle = SEGMENT_COLORS[i];
          ctx.shadowColor = SEGMENT_COLORS[i];
          ctx.shadowBlur = 4;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      } else {
        // Square with 4 sides
        const side = 100;
        for (let i = 0; i < 4; i++) {
          ctx.save();
          ctx.rotate(i * 90 * Math.PI / 180);
          ctx.beginPath();
          ctx.rect(-side/2, -side/2 - 16, side, 16);
          ctx.fillStyle = SEGMENT_COLORS[i];
          ctx.fill();
          ctx.restore();
        }
      }

      ctx.restore();
    });

    // Score
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${s.score}`, W / 2, 40);
    ctx.textAlign = "left";

    // Ball color indicator
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.fillText("MATCH →", 10, H - 20);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(90 + i * 22, H - 24, 7, 0, Math.PI * 2);
      ctx.fillStyle = i === s.ballColorIdx ? SEGMENT_COLORS[i] : `${SEGMENT_COLORS[i]}44`;
      ctx.fill();
      if (i === s.ballColorIdx) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, []);

  const update = useCallback(() => {
    const s = stateRef.current;
    if (s.dead || !started) return;

    // Ball gravity
    s.ballVY += 0.5;
    s.ballY += s.ballVY;

    if (jumpRef.current) {
      jumpRef.current = false;
    }

    // Keep camera near ball
    const targetCamY = s.ballY - H * 0.75;
    s.cameraY += (targetCamY - s.cameraY) * 0.1;

    // Obstacle rotation
    s.obstacles.forEach(obs => {
      obs.rotation += obs.speed;
    });

    // Collision
    const ballScreenY = s.ballY - s.cameraY;
    s.obstacles.forEach(obs => {
      const obsScreenY = obs.y - s.cameraY;
      const dist = Math.abs(ballScreenY - obsScreenY);
      const R = 55;

      if (dist < R + BALL_R && dist > R - 18 - BALL_R) {
        // Check which segment ball is hitting
        const angle = Math.atan2(ballScreenY - obsScreenY, W / 2 - W / 2) * 180 / Math.PI;
        const normalizedAngle = ((angle - obs.rotation) % 360 + 360) % 360;
        const segmentIdx = Math.floor(normalizedAngle / 90) % 4;

        if (segmentIdx !== s.ballColorIdx) {
          s.dead = true;
          onGameOver(s.score);
        }
      }

      // Passed through obstacle
      if (obs.y - s.cameraY < -100) {
        obs.y -= 600;
        s.score++;
        s.ballColorIdx = Math.floor(Math.random() * 4);
        setScore(s.score);
        onScoreUpdate(s.score);
      }
    });

    // Fell off bottom
    if (s.ballY - s.cameraY > H + 50) {
      s.dead = true;
      onGameOver(s.score);
    }
  }, [started, onGameOver, onScoreUpdate]);

  const jump = useCallback(() => {
    if (!isActive) return;
    if (!started) { setStarted(true); }
    stateRef.current.ballVY = -10;
    jumpRef.current = true;
  }, [isActive, started]);

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
    const down = (e: KeyboardEvent) => { if (e.key === " ") { e.preventDefault(); jump(); } };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [jump]);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded cursor-pointer"
        style={{ border: "1px solid rgba(0,245,255,0.2)", maxHeight: "70vh", width: "auto" }}
        onClick={jump}
      />
      {!started && (
        <div className="font-arcade text-xs text-center" style={{ color: "#fff200" }}>
          TAP / SPACE to launch the ball!<br/>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>Match the ball color to the ring segment!</span>
        </div>
      )}
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
        Click or Space to bounce. Pass through matching colored segments only!
      </p>
    </div>
  );
}
