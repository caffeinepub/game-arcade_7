import { useEffect, useRef, useCallback, useState } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const CELL = 20;
const COLS = 21;
const ROWS = 21;
const CANVAS_W = COLS * CELL;
const CANVAS_H = ROWS * CELL;

// 0=empty, 1=wall, 2=dot, 3=power pellet, 4=ghost house door
const MAZE_1: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
  [1,3,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,3,1],
  [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,1,2,1],
  [1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1],
  [1,1,1,1,2,1,1,1,0,0,0,0,0,1,1,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,0,0,1,1,1,0,0,0,1,2,1,1,1,1],
  [1,1,1,1,2,0,0,1,1,4,1,4,1,1,0,0,2,1,1,1,1],
  [0,0,0,0,2,0,0,1,1,1,1,1,1,1,0,0,2,0,0,0,0],
  [1,1,1,1,2,0,0,1,1,1,1,1,1,1,0,0,2,1,1,1,1],
  [1,1,1,1,2,0,0,0,1,1,1,1,1,0,0,0,2,1,1,1,1],
  [1,1,1,1,2,1,0,0,0,0,0,0,0,0,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
  [1,3,2,1,2,2,2,2,2,2,0,2,2,2,2,2,2,1,2,3,1],
  [1,1,2,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,2,1,1],
  [1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const MAZE_2: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,2,1],
  [1,3,1,1,2,2,1,2,1,2,1,2,1,2,1,2,2,1,1,3,1],
  [1,2,1,1,2,2,2,2,1,2,2,2,1,2,2,2,2,1,1,2,1],
  [1,2,2,2,2,1,1,2,1,2,1,2,1,2,1,1,2,2,2,2,1],
  [1,1,1,2,2,1,2,2,2,2,1,2,2,2,2,1,2,2,1,1,1],
  [1,2,2,2,2,2,2,1,2,2,1,2,2,1,2,2,2,2,2,2,1],
  [1,2,1,1,1,2,1,1,0,0,0,0,0,1,1,2,1,1,1,2,1],
  [1,2,1,2,2,2,1,0,0,1,1,1,0,0,1,2,2,2,1,2,1],
  [1,2,2,2,1,2,0,0,1,4,1,4,1,0,0,2,1,2,2,2,1],
  [0,0,0,0,2,0,0,1,1,1,1,1,1,1,0,0,2,0,0,0,0],
  [1,2,1,2,2,0,0,1,1,1,1,1,1,1,0,0,2,2,1,2,1],
  [1,2,1,2,2,2,1,0,0,1,1,1,0,0,1,2,2,2,1,2,1],
  [1,2,2,2,1,2,1,1,0,0,0,0,0,1,1,2,1,2,2,2,1],
  [1,1,2,2,2,2,2,1,1,1,1,1,1,1,2,2,2,2,2,1,1],
  [1,2,2,1,2,2,2,2,2,2,1,2,2,2,2,2,2,1,2,2,1],
  [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
  [1,3,2,2,2,2,1,2,2,2,0,2,2,2,1,2,2,2,2,3,1],
  [1,1,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1,1],
  [1,2,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const MAZE_3: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,1,2,2,2,2,2,1,2,2,2,2,2,1,2,2,2,1],
  [1,3,1,2,1,2,1,1,2,1,1,1,2,1,1,2,1,2,1,3,1],
  [1,2,1,2,2,2,1,2,2,1,2,1,2,2,1,2,2,2,1,2,1],
  [1,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,1],
  [1,1,1,2,1,1,2,1,1,1,1,1,1,1,2,1,1,2,1,1,1],
  [1,2,2,2,2,2,2,1,2,2,1,2,2,1,2,2,2,2,2,2,1],
  [1,2,1,1,1,2,1,1,0,0,0,0,0,1,1,2,1,1,1,2,1],
  [1,2,2,2,1,2,1,0,0,1,1,1,0,0,1,2,1,2,2,2,1],
  [1,1,1,2,2,2,0,0,1,4,1,4,1,0,0,2,2,2,1,1,1],
  [0,0,0,0,2,0,0,1,1,1,1,1,1,1,0,0,2,0,0,0,0],
  [1,2,1,2,2,0,0,1,1,1,1,1,1,1,0,0,2,2,1,2,1],
  [1,2,2,2,1,2,1,0,0,1,1,1,0,0,1,2,1,2,2,2,1],
  [1,1,2,1,1,2,1,1,0,0,0,0,0,1,1,2,1,1,2,1,1],
  [1,2,2,2,2,2,1,2,1,1,1,1,1,2,1,2,2,2,2,2,1],
  [1,2,1,1,2,1,2,2,2,2,1,2,2,2,2,1,2,1,1,2,1],
  [1,2,1,2,2,2,1,1,2,1,1,1,2,1,1,2,2,2,1,2,1],
  [1,3,2,2,1,2,2,2,2,2,0,2,2,2,2,2,1,2,2,3,1],
  [1,1,1,2,1,1,2,1,1,1,1,1,1,1,2,1,1,2,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const MAZE_4: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,1,2,2,2,1,2,2,1,2,2,1,2,2,2,1,2,2,1],
  [1,3,2,1,2,1,2,1,2,1,1,1,2,1,2,1,2,1,2,3,1],
  [1,2,2,2,2,1,2,2,2,1,2,1,2,2,2,1,2,2,2,2,1],
  [1,1,1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1,1,1],
  [1,2,2,2,2,2,2,1,2,2,2,2,2,1,2,2,2,2,2,2,1],
  [1,2,1,1,1,1,2,1,2,1,1,1,2,1,2,1,1,1,1,2,1],
  [1,2,1,1,1,2,1,1,0,0,0,0,0,1,1,2,1,1,1,2,1],
  [1,2,2,2,1,2,1,0,0,1,1,1,0,0,1,2,1,2,2,2,1],
  [1,1,1,2,2,2,0,0,1,4,1,4,1,0,0,2,2,2,1,1,1],
  [0,0,0,0,2,0,0,1,1,1,1,1,1,1,0,0,2,0,0,0,0],
  [1,1,1,2,2,0,0,1,1,1,1,1,1,1,0,0,2,2,1,1,1],
  [1,2,2,2,1,2,1,0,0,1,1,1,0,0,1,2,1,2,2,2,1],
  [1,2,1,1,1,2,1,1,0,0,0,0,0,1,1,2,1,1,1,2,1],
  [1,2,1,2,2,2,2,1,1,1,1,1,1,1,2,2,2,2,1,2,1],
  [1,2,2,2,1,1,2,2,2,2,1,2,2,2,2,1,1,2,2,2,1],
  [1,1,2,1,2,2,2,1,2,1,1,1,2,1,2,2,2,1,2,1,1],
  [1,3,2,2,1,2,2,2,2,2,0,2,2,2,2,2,1,2,2,3,1],
  [1,2,1,2,2,1,1,2,1,1,1,1,1,2,1,1,2,2,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const MAZE_5: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,1,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,1,2,1],
  [1,3,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,3,1],
  [1,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,1],
  [1,2,1,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
  [1,1,2,1,1,1,2,1,2,1,1,1,2,1,2,1,1,1,2,1,1],
  [1,2,2,1,1,2,2,1,0,0,0,0,0,1,2,2,1,1,2,2,1],
  [1,2,1,2,2,2,1,0,0,1,1,1,0,0,1,2,2,2,1,2,1],
  [1,2,2,2,1,2,0,0,1,4,1,4,1,0,0,2,1,2,2,2,1],
  [0,0,0,0,2,0,0,1,1,1,1,1,1,1,0,0,2,0,0,0,0],
  [1,2,1,2,2,0,0,1,1,1,1,1,1,1,0,0,2,2,1,2,1],
  [1,2,1,2,2,2,1,0,0,1,1,1,0,0,1,2,2,2,1,2,1],
  [1,2,2,1,1,2,2,1,0,0,0,0,0,1,2,2,1,1,2,2,1],
  [1,1,2,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,2,1,1],
  [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,1,2,1,1,2,1,1,1,2,1,1,2,1,1,1,2,1],
  [1,3,2,2,1,2,2,2,2,2,0,2,2,2,2,2,1,2,2,3,1],
  [1,1,1,2,1,1,2,1,1,1,1,1,1,1,2,1,1,2,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const MAZES = [MAZE_1, MAZE_2, MAZE_3, MAZE_4, MAZE_5];

type Dir = { x: number; y: number };
const DIRS: Record<string, Dir> = {
  LEFT:  { x: -1, y: 0 },
  RIGHT: { x:  1, y: 0 },
  UP:    { x:  0, y:-1 },
  DOWN:  { x:  0, y: 1 },
};

interface Ghost {
  x: number;
  y: number;
  dir: Dir;
  color: string;
  scared: boolean;
  eaten: boolean;
}

function initMaze(level: number): number[][] {
  const template = MAZES[Math.min(level - 1, MAZES.length - 1)];
  return template.map(row => [...row]);
}

function canMove(maze: number[][], nx: number, ny: number): boolean {
  if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return true; // wrap
  const cell = maze[ny]?.[nx];
  return cell !== 1 && cell !== 4;
}

function wrapCoord(x: number, y: number): { x: number; y: number } {
  return {
    x: ((x % COLS) + COLS) % COLS,
    y: ((y % ROWS) + ROWS) % ROWS,
  };
}

function getDirections(maze: number[][], px: number, py: number, excludeReverse: Dir | null): Dir[] {
  const dirs = Object.values(DIRS);
  return dirs.filter(d => {
    if (excludeReverse && d.x === -excludeReverse.x && d.y === -excludeReverse.y) return false;
    const { x: nx, y: ny } = wrapCoord(px + d.x, py + d.y);
    return canMove(maze, nx, ny);
  });
}

function makeGhosts(level: number): Ghost[] {
  const ghosts: Ghost[] = [
    { x: 10, y: 9,  dir: DIRS.UP,    color: "#ff3333", scared: false, eaten: false },
    { x: 9,  y: 10, dir: DIRS.LEFT,  color: "#ffb8ff", scared: false, eaten: false },
    { x: 11, y: 10, dir: DIRS.RIGHT, color: "#00ffff", scared: false, eaten: false },
  ];
  if (level >= 3) {
    ghosts.push({ x: 10, y: 11, dir: DIRS.DOWN, color: "#ff9900", scared: false, eaten: false });
  }
  return ghosts;
}

export default function PacManGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const [started, setStarted] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const [displayLevel, setDisplayLevel] = useState(1);
  const [displayLives, setDisplayLives] = useState(3);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const gameRef = useRef({
    maze: initMaze(1),
    pacman: { x: 10, y: 15, dir: DIRS.LEFT, nextDir: DIRS.LEFT },
    ghosts: makeGhosts(1),
    score: 0,
    dotsLeft: 0,
    scaredTimer: 0,
    running: false,
    lives: 3,
    level: 1,
    flashTimer: 0,
    pacMouthAngle: 0,
    pacMouthDir: 1,
  });

  const countDots = useCallback((maze: number[][]): number => {
    let count = 0;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (maze[r][c] === 2 || maze[r][c] === 3) count++;
    return count;
  }, []);

  const draw = useCallback((timestamp: number, showLevelComplete: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current;

    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Draw maze
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = g.maze[r][c];
        const cx = c * CELL;
        const cy = r * CELL;

        if (cell === 1) {
          ctx.fillStyle = "#1a1a4e";
          ctx.fillRect(cx, cy, CELL, CELL);
          ctx.strokeStyle = "#3355ff";
          ctx.lineWidth = 1;
          ctx.strokeRect(cx + 0.5, cy + 0.5, CELL - 1, CELL - 1);
        } else if (cell === 4) {
          ctx.fillStyle = "#ffb8ff";
          ctx.fillRect(cx + 2, cy + CELL/2 - 1, CELL - 4, 2);
        } else if (cell === 2) {
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "#ffffff";
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(cx + CELL/2, cy + CELL/2, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (cell === 3) {
          const pulse = 0.7 + 0.3 * Math.sin(timestamp / 300);
          ctx.fillStyle = `rgba(255, 200, 0, ${pulse})`;
          ctx.shadowColor = "#ffcc00";
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(cx + CELL/2, cy + CELL/2, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }

    // Draw pac-man
    const px = g.pacman.x * CELL + CELL / 2;
    const py = g.pacman.y * CELL + CELL / 2;
    const mouthAngle = g.pacMouthAngle;
    let angle = 0;
    if (g.pacman.dir.x === 1) angle = 0;
    else if (g.pacman.dir.x === -1) angle = Math.PI;
    else if (g.pacman.dir.y === -1) angle = -Math.PI / 2;
    else if (g.pacman.dir.y === 1) angle = Math.PI / 2;

    ctx.fillStyle = "#fff200";
    ctx.shadowColor = "#fff200";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, CELL/2 - 2, angle + mouthAngle, angle + Math.PI * 2 - mouthAngle);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw ghosts
    g.ghosts.forEach(ghost => {
      if (ghost.eaten) return;
      const gx = ghost.x * CELL + CELL / 2;
      const gy = ghost.y * CELL + CELL / 2;
      const gr = CELL / 2 - 2;

      let ghostColor = ghost.color;
      if (ghost.scared) {
        const flickering = g.scaredTimer < 120 && Math.floor(timestamp / 200) % 2 === 0;
        ghostColor = flickering ? "#ffffff" : "#3333ff";
      }

      ctx.fillStyle = ghostColor;
      ctx.shadowColor = ghostColor;
      ctx.shadowBlur = 10;

      // Ghost body
      ctx.beginPath();
      ctx.arc(gx, gy - 2, gr, Math.PI, 0);
      ctx.lineTo(gx + gr, gy + gr);
      // Wavy bottom
      const waveCount = 3;
      const waveW = (gr * 2) / waveCount;
      for (let w = waveCount; w >= 0; w--) {
        const wx = gx - gr + w * waveW;
        const wy = w % 2 === 0 ? gy + gr : gy + gr - 4;
        ctx.lineTo(wx, wy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Eyes
      if (!ghost.scared) {
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(gx - 3, gy - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(gx + 3, gy - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0000aa";
        ctx.beginPath();
        ctx.arc(gx - 2, gy - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(gx + 4, gy - 3, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Level complete overlay
    if (showLevelComplete) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      const cx = CANVAS_W / 2;
      const cy = CANVAS_H / 2;

      ctx.textAlign = "center";

      // "LEVEL COMPLETE!"
      ctx.font = "bold 28px monospace";
      ctx.fillStyle = "#ffff00";
      ctx.shadowColor = "#ffff00";
      ctx.shadowBlur = 20;
      ctx.fillText("LEVEL COMPLETE!", cx, cy - 30);
      ctx.shadowBlur = 0;

      // Bonus
      ctx.font = "bold 18px monospace";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`+${100 * g.level} BONUS`, cx, cy + 5);

      // Next level hint
      ctx.font = "bold 16px monospace";
      ctx.fillStyle = "#00ffff";
      ctx.shadowColor = "#00ffff";
      ctx.shadowBlur = 10;
      if (g.level < 5) {
        ctx.fillText(`LEVEL ${g.level + 1} NEXT`, cx, cy + 35);
      } else {
        ctx.fillText("FINAL LEVEL!", cx, cy + 35);
      }
      ctx.shadowBlur = 0;
      ctx.textAlign = "left";
    }
  }, []);

  const tick = useCallback((timestamp: number) => {
    const g = gameRef.current;
    if (!g.running) return;

    const elapsed = timestamp - lastTickRef.current;
    const speed = g.scaredTimer > 0 ? 220 : Math.max(100, 160 - (g.level - 1) * 15);
    if (elapsed < speed) {
      g.pacMouthAngle = (Math.sin(timestamp / 80) * 0.3 + 0.3) * (Math.PI / 4);
      draw(timestamp, false);
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    lastTickRef.current = timestamp;

    // Move pac-man
    const pac = g.pacman;
    const tryDir = pac.nextDir;
    const nx1 = wrapCoord(pac.x + tryDir.x, pac.y + tryDir.y);
    if (canMove(g.maze, nx1.x, nx1.y)) {
      pac.dir = tryDir;
    }
    const nx2 = wrapCoord(pac.x + pac.dir.x, pac.y + pac.dir.y);
    if (canMove(g.maze, nx2.x, nx2.y)) {
      pac.x = nx2.x;
      pac.y = nx2.y;
    }

    // Eat dots
    const cell = g.maze[pac.y]?.[pac.x];
    if (cell === 2) {
      g.maze[pac.y][pac.x] = 0;
      g.score += 10;
      g.dotsLeft--;
      onScoreUpdate(g.score);
    } else if (cell === 3) {
      g.maze[pac.y][pac.x] = 0;
      g.score += 50;
      g.dotsLeft--;
      g.scaredTimer = 480;
      g.ghosts.forEach(gh => { gh.scared = true; gh.eaten = false; });
      onScoreUpdate(g.score);
    }

    // Check level complete
    if (g.dotsLeft <= 0) {
      g.running = false;
      // Award level bonus
      g.score += 100 * g.level;
      onScoreUpdate(g.score);

      if (g.level >= 5) {
        // All levels complete
        draw(timestamp, true);
        setTimeout(() => {
          onGameOver(g.score);
        }, 1500);
      } else {
        // Show level complete overlay
        setLevelComplete(true);
        draw(timestamp, true);
        setTimeout(() => {
          // Advance to next level
          g.level++;
          g.maze = initMaze(g.level);
          g.dotsLeft = countDots(g.maze);
          g.pacman = { x: 10, y: 15, dir: DIRS.LEFT, nextDir: DIRS.LEFT };
          g.ghosts = makeGhosts(g.level);
          g.scaredTimer = 0;
          g.running = true;
          setLevelComplete(false);
          setDisplayLevel(g.level);
          lastTickRef.current = performance.now();
          cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(tick);
        }, 1500);
      }
      return;
    }

    // Update scared timer
    if (g.scaredTimer > 0) {
      g.scaredTimer--;
      if (g.scaredTimer === 0) {
        g.ghosts.forEach(gh => { gh.scared = false; });
      }
    }

    // Move ghosts
    g.ghosts.forEach(ghost => {
      if (ghost.eaten) return;
      const validDirs = getDirections(g.maze, ghost.x, ghost.y, ghost.dir);
      let chosen: Dir = ghost.dir;

      if (validDirs.length === 0) {
        chosen = { x: -ghost.dir.x, y: -ghost.dir.y };
      } else if (validDirs.length === 1 || Math.random() < 0.3) {
        chosen = validDirs[Math.floor(Math.random() * validDirs.length)];
      } else {
        // Bias toward/away from player
        const targetX = ghost.scared ? -pac.x : pac.x;
        const targetY = ghost.scared ? -pac.y : pac.y;
        let best = validDirs[0];
        let bestDist = Infinity;
        for (const d of validDirs) {
          const { x: nx, y: ny } = wrapCoord(ghost.x + d.x, ghost.y + d.y);
          const dist = Math.abs(nx - targetX) + Math.abs(ny - targetY);
          if (dist < bestDist) { bestDist = dist; best = d; }
        }
        chosen = Math.random() < 0.65 ? best : validDirs[Math.floor(Math.random() * validDirs.length)];
      }

      ghost.dir = chosen;
      const ng = wrapCoord(ghost.x + chosen.x, ghost.y + chosen.y);
      ghost.x = ng.x;
      ghost.y = ng.y;

      // Collision with pac-man
      if (ghost.x === pac.x && ghost.y === pac.y) {
        if (ghost.scared) {
          ghost.eaten = true;
          ghost.scared = false;
          g.score += 200;
          onScoreUpdate(g.score);
          // Respawn ghost after delay
          setTimeout(() => {
            ghost.x = 10; ghost.y = 10; ghost.eaten = false;
          }, 3000);
        } else {
          g.lives--;
          setDisplayLives(g.lives);
          if (g.lives <= 0) {
            g.running = false;
            onGameOver(g.score);
            return;
          }
          // Reset positions
          pac.x = 10; pac.y = 15;
          pac.dir = DIRS.LEFT; pac.nextDir = DIRS.LEFT;
          g.ghosts = makeGhosts(g.level);
          g.scaredTimer = 0;
        }
      }
    });

    // Animate mouth
    g.pacMouthAngle += 0.08 * g.pacMouthDir;
    if (g.pacMouthAngle > Math.PI / 4) g.pacMouthDir = -1;
    if (g.pacMouthAngle < 0.05) g.pacMouthDir = 1;

    draw(timestamp, false);
    rafRef.current = requestAnimationFrame(tick);
  }, [draw, onGameOver, onScoreUpdate, countDots]);

  const startGame = useCallback(() => {
    const g = gameRef.current;
    g.level = 1;
    g.maze = initMaze(1);
    g.pacman = { x: 10, y: 15, dir: DIRS.LEFT, nextDir: DIRS.LEFT };
    g.ghosts = makeGhosts(1);
    g.score = 0;
    g.dotsLeft = countDots(g.maze);
    g.scaredTimer = 0;
    g.running = true;
    g.lives = 3;
    g.pacMouthAngle = 0;
    g.pacMouthDir = 1;
    setStarted(true);
    setLevelComplete(false);
    setDisplayLevel(1);
    setDisplayLives(3);
    onScoreUpdate(0);
    lastTickRef.current = performance.now();
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick, countDots, onScoreUpdate]);

  useEffect(() => {
    if (!isActive) {
      gameRef.current.running = false;
      cancelAnimationFrame(rafRef.current);
    }
  }, [isActive]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (!g.running) return;
      const map: Record<string, Dir> = {
        ArrowLeft: DIRS.LEFT, a: DIRS.LEFT, A: DIRS.LEFT,
        ArrowRight: DIRS.RIGHT, d: DIRS.RIGHT, D: DIRS.RIGHT,
        ArrowUp: DIRS.UP, w: DIRS.UP, W: DIRS.UP,
        ArrowDown: DIRS.DOWN, s: DIRS.DOWN, S: DIRS.DOWN,
      };
      const dir = map[e.key];
      if (dir) { g.pacman.nextDir = dir; e.preventDefault(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    // Draw initial maze
    draw(0, false);
  }, [draw]);

  const heartsDisplay = "♥ ".repeat(Math.max(0, displayLives)).trim();

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const g = gameRef.current;
    if (!g.running || !touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    // Need minimum swipe distance to register
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dx) >= Math.abs(dy)) {
      g.pacman.nextDir = dx > 0 ? DIRS.RIGHT : DIRS.LEFT;
    } else {
      g.pacman.nextDir = dy > 0 ? DIRS.DOWN : DIRS.UP;
    }
  };

  const pressDir = (dir: Dir) => {
    const g = gameRef.current;
    if (!g.running) return;
    g.pacman.nextDir = dir;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {started && (
        <div className="text-xs font-arcade text-yellow-300 opacity-70 flex gap-6">
          <span>LEVEL: {displayLevel}</span>
          <span>LIVES: {heartsDisplay}</span>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="border border-yellow-400"
        style={{ boxShadow: "0 0 20px rgba(255, 242, 0, 0.3)", maxWidth: "100%" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      />
      {!started && (
        <button
          onClick={startGame}
          type="button"
          className="font-arcade text-xs text-yellow-300 border border-yellow-400 px-6 py-3 hover:bg-yellow-400 hover:text-black transition-all"
          style={{ boxShadow: "0 0 10px rgba(255,242,0,0.5)" }}
        >
          START GAME
        </button>
      )}
      {levelComplete && (
        <div className="text-xs font-arcade text-cyan-400 opacity-80 animate-pulse">
          LEVEL {displayLevel - 1} COMPLETE! GET READY...
        </div>
      )}
      {started && (
        <div
          className="grid grid-cols-3 gap-1 mt-1 md:hidden"
          style={{ width: 132 }}
        >
          {/* Row 1: empty, UP, empty */}
          <div />
          <button
            type="button"
            onPointerDown={(e) => { e.preventDefault(); pressDir(DIRS.UP); }}
            className="font-arcade text-yellow-300 border border-yellow-500 flex items-center justify-center h-10 w-10 text-lg select-none active:bg-yellow-500 active:text-black transition-colors"
            style={{
              background: "rgba(10,10,15,0.9)",
              boxShadow: "0 0 8px rgba(255,242,0,0.35)",
              touchAction: "manipulation",
            }}
            aria-label="Up"
          >
            ▲
          </button>
          <div />

          {/* Row 2: LEFT, empty, RIGHT */}
          <button
            type="button"
            onPointerDown={(e) => { e.preventDefault(); pressDir(DIRS.LEFT); }}
            className="font-arcade text-yellow-300 border border-yellow-500 flex items-center justify-center h-10 w-10 text-lg select-none active:bg-yellow-500 active:text-black transition-colors"
            style={{
              background: "rgba(10,10,15,0.9)",
              boxShadow: "0 0 8px rgba(255,242,0,0.35)",
              touchAction: "manipulation",
            }}
            aria-label="Left"
          >
            ◀
          </button>
          <div />
          <button
            type="button"
            onPointerDown={(e) => { e.preventDefault(); pressDir(DIRS.RIGHT); }}
            className="font-arcade text-yellow-300 border border-yellow-500 flex items-center justify-center h-10 w-10 text-lg select-none active:bg-yellow-500 active:text-black transition-colors"
            style={{
              background: "rgba(10,10,15,0.9)",
              boxShadow: "0 0 8px rgba(255,242,0,0.35)",
              touchAction: "manipulation",
            }}
            aria-label="Right"
          >
            ▶
          </button>

          {/* Row 3: empty, DOWN, empty */}
          <div />
          <button
            type="button"
            onPointerDown={(e) => { e.preventDefault(); pressDir(DIRS.DOWN); }}
            className="font-arcade text-yellow-300 border border-yellow-500 flex items-center justify-center h-10 w-10 text-lg select-none active:bg-yellow-500 active:text-black transition-colors"
            style={{
              background: "rgba(10,10,15,0.9)",
              boxShadow: "0 0 8px rgba(255,242,0,0.35)",
              touchAction: "manipulation",
            }}
            aria-label="Down"
          >
            ▼
          </button>
          <div />
        </div>
      )}
    </div>
  );
}
