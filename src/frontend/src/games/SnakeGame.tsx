import { useEffect, useRef, useCallback, useState } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const SPEED = 120;

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Point = { x: number; y: number };

export default function SnakeGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef({
    snake: [{ x: 10, y: 10 }] as Point[],
    direction: "RIGHT" as Direction,
    nextDirection: "RIGHT" as Direction,
    food: { x: 15, y: 10 } as Point,
    score: 0,
    running: false,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [started, setStarted] = useState(false);

  const spawnFood = useCallback((snake: Point[]): Point => {
    let food: Point;
    do {
      food = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (snake.some((s) => s.x === food.x && s.y === food.y));
    return food;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const state = gameStateRef.current;

    // Background
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Grid
    ctx.strokeStyle = "rgba(57,255,20,0.08)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Snake body
    state.snake.forEach((segment, index) => {
      const alpha = 0.4 + (index / state.snake.length) * 0.6;
      ctx.fillStyle = `rgba(57, 255, 20, ${alpha})`;
      ctx.shadowColor = "#39ff14";
      ctx.shadowBlur = index === state.snake.length - 1 ? 12 : 4;
      ctx.fillRect(
        segment.x * CELL_SIZE + 1,
        segment.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2
      );
    });

    // Snake head highlight
    if (state.snake.length > 0) {
      const head = state.snake[state.snake.length - 1];
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "#39ff14";
      ctx.shadowBlur = 15;
      ctx.fillRect(
        head.x * CELL_SIZE + 3,
        head.y * CELL_SIZE + 3,
        CELL_SIZE - 6,
        CELL_SIZE - 6
      );
    }

    // Food
    ctx.shadowColor = "#ff2d8e";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#ff2d8e";
    ctx.beginPath();
    ctx.arc(
      state.food.x * CELL_SIZE + CELL_SIZE / 2,
      state.food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
  }, []);

  const gameLoop = useCallback(() => {
    const state = gameStateRef.current;
    if (!state.running) return;

    state.direction = state.nextDirection;
    const head = state.snake[state.snake.length - 1];
    const newHead: Point = { x: head.x, y: head.y };

    if (state.direction === "UP") newHead.y -= 1;
    else if (state.direction === "DOWN") newHead.y += 1;
    else if (state.direction === "LEFT") newHead.x -= 1;
    else if (state.direction === "RIGHT") newHead.x += 1;

    // Wall collision
    if (
      newHead.x < 0 ||
      newHead.x >= GRID_SIZE ||
      newHead.y < 0 ||
      newHead.y >= GRID_SIZE
    ) {
      state.running = false;
      onGameOver(state.score);
      return;
    }

    // Self collision
    if (state.snake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
      state.running = false;
      onGameOver(state.score);
      return;
    }

    state.snake.push(newHead);

    // Eat food
    if (newHead.x === state.food.x && newHead.y === state.food.y) {
      state.score = state.snake.length - 1;
      onScoreUpdate(state.score);
      state.food = spawnFood(state.snake);
    } else {
      state.snake.shift();
    }

    draw();
  }, [draw, onGameOver, onScoreUpdate, spawnFood]);

  const startGame = useCallback(() => {
    const state = gameStateRef.current;
    state.snake = [{ x: 10, y: 10 }];
    state.direction = "RIGHT";
    state.nextDirection = "RIGHT";
    state.food = spawnFood([{ x: 10, y: 10 }]);
    state.score = 0;
    state.running = true;
    setStarted(true);
    onScoreUpdate(0);
    draw();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(gameLoop, SPEED);
  }, [draw, gameLoop, onScoreUpdate, spawnFood]);

  useEffect(() => {
    if (!isActive) {
      gameStateRef.current.running = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [isActive]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const state = gameStateRef.current;
      if (!state.running) return;

      const keyMap: Record<string, Direction> = {
        ArrowUp: "UP", w: "UP", W: "UP",
        ArrowDown: "DOWN", s: "DOWN", S: "DOWN",
        ArrowLeft: "LEFT", a: "LEFT", A: "LEFT",
        ArrowRight: "RIGHT", d: "RIGHT", D: "RIGHT",
      };
      const newDir = keyMap[e.key];
      if (!newDir) return;

      const opposite: Record<Direction, Direction> = {
        UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT",
      };
      if (newDir !== opposite[state.direction]) {
        state.nextDirection = newDir;
      }
      e.preventDefault();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    // Initial draw
    draw();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [draw]);

  // Update the game loop reference when it changes
  useEffect(() => {
    if (gameStateRef.current.running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(gameLoop, SPEED);
    }
  }, [gameLoop]);

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="border border-neon-green"
        style={{
          boxShadow: "0 0 20px rgba(57, 255, 20, 0.3)",
          maxWidth: "100%",
        }}
      />
      {!started && (
        <button
          onClick={startGame}
          type="button"
        className="font-arcade text-xs text-neon-green border border-neon-green px-6 py-3 hover:bg-neon-green hover:text-black transition-all"
          style={{ boxShadow: "0 0 10px rgba(57,255,20,0.5)" }}
        >
          START GAME
        </button>
      )}
    </div>
  );
}
