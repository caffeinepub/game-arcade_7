import { useEffect, useRef, useCallback, useState } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const COLS = 10;
const ROWS = 20;
const CELL = 26;
const NEXT_CELL = 22;

type Board = (string | null)[][];
type Piece = { shape: number[][]; color: string; x: number; y: number };

const TETROMINOES = [
  { shape: [[1, 1, 1, 1]], color: "#00f5ff" },                      // I
  { shape: [[1, 1], [1, 1]], color: "#fff200" },                    // O
  { shape: [[0, 1, 0], [1, 1, 1]], color: "#bf5fff" },              // T
  { shape: [[0, 1, 1], [1, 1, 0]], color: "#39ff14" },              // S
  { shape: [[1, 1, 0], [0, 1, 1]], color: "#ff2d8e" },              // Z
  { shape: [[1, 0, 0], [1, 1, 1]], color: "#ff8c00" },              // J
  { shape: [[0, 0, 1], [1, 1, 1]], color: "#00f5ff" },              // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

function createBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomTetromino(): Piece {
  const t = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
  return { shape: t.shape, color: t.color, x: Math.floor(COLS / 2) - 1, y: 0 };
}

function rotate(shape: number[][]): number[][] {
  return shape[0].map((_, i) => shape.map((row) => row[i]).reverse());
}

function isValid(board: Board, piece: Piece, dx = 0, dy = 0, newShape?: number[][]): boolean {
  const shape = newShape || piece.shape;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = piece.x + c + dx;
      const ny = piece.y + r + dy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
      if (ny >= 0 && board[ny][nx]) return false;
    }
  }
  return true;
}

function placePiece(board: Board, piece: Piece): Board {
  const newBoard = board.map((row) => [...row]);
  piece.shape.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell && piece.y + r >= 0) {
        newBoard[piece.y + r][piece.x + c] = piece.color;
      }
    });
  });
  return newBoard;
}

function clearLines(board: Board): { board: Board; lines: number } {
  const newBoard = board.filter((row) => row.some((cell) => !cell));
  const lines = ROWS - newBoard.length;
  const empty = Array.from({ length: lines }, () => Array(COLS).fill(null));
  return { board: [...empty, ...newBoard], lines };
}

export default function TetrisGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const [started, setStarted] = useState(false);

  const stateRef = useRef({
    board: createBoard(),
    current: randomTetromino(),
    next: randomTetromino(),
    score: 0,
    running: false,
    dropInterval: 500,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const drawBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const state = stateRef.current;

    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL);

    // Grid lines
    ctx.strokeStyle = "rgba(0,245,255,0.07)";
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(COLS * CELL, r * CELL);
      ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, ROWS * CELL);
      ctx.stroke();
    }

    // Board cells
    state.board.forEach((row, r) => {
      row.forEach((color, c) => {
        if (color) {
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 6;
          ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
          ctx.fillStyle = "rgba(255,255,255,0.15)";
          ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, 4);
          ctx.shadowBlur = 0;
        }
      });
    });

    // Ghost piece
    let ghostY = state.current.y;
    while (isValid(state.board, state.current, 0, ghostY - state.current.y + 1)) {
      ghostY++;
    }
    if (ghostY !== state.current.y) {
      state.current.shape.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell) {
            ctx.fillStyle = `${state.current.color}33`;
            ctx.fillRect(
              (state.current.x + c) * CELL + 1,
              (ghostY + r) * CELL + 1,
              CELL - 2, CELL - 2
            );
          }
        });
      });
    }

    // Current piece
    state.current.shape.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) {
          const px = state.current.x + c;
          const py = state.current.y + r;
          if (py >= 0) {
            ctx.fillStyle = state.current.color;
            ctx.shadowColor = state.current.color;
            ctx.shadowBlur = 10;
            ctx.fillRect(px * CELL + 1, py * CELL + 1, CELL - 2, CELL - 2);
            ctx.fillStyle = "rgba(255,255,255,0.25)";
            ctx.fillRect(px * CELL + 1, py * CELL + 1, CELL - 2, 4);
            ctx.shadowBlur = 0;
          }
        }
      });
    });
  }, []);

  const drawNext = useCallback(() => {
    const canvas = nextCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const state = stateRef.current;
    const size = 4 * NEXT_CELL;

    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, size, size);

    const shape = state.next.shape;
    const offsetX = Math.floor((4 - shape[0].length) / 2);
    const offsetY = Math.floor((4 - shape.length) / 2);

    shape.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell) {
          ctx.fillStyle = state.next.color;
          ctx.shadowColor = state.next.color;
          ctx.shadowBlur = 8;
          ctx.fillRect(
            (offsetX + c) * NEXT_CELL + 1,
            (offsetY + r) * NEXT_CELL + 1,
            NEXT_CELL - 2, NEXT_CELL - 2
          );
          ctx.shadowBlur = 0;
        }
      });
    });
  }, []);

  const gameLoop = useCallback(() => {
    const state = stateRef.current;
    if (!state.running) return;

    if (isValid(state.board, state.current, 0, 1)) {
      state.current.y += 1;
    } else {
      state.board = placePiece(state.board, state.current);
      const { board: newBoard, lines } = clearLines(state.board);
      state.board = newBoard;
      state.score += LINE_SCORES[lines] || 0;
      onScoreUpdate(state.score);
      state.current = state.next;
      state.next = randomTetromino();

      if (!isValid(state.board, state.current, 0, 0)) {
        state.running = false;
        onGameOver(state.score);
        return;
      }
    }
    drawBoard();
    drawNext();
  }, [drawBoard, drawNext, onGameOver, onScoreUpdate]);

  const startGame = useCallback(() => {
    const state = stateRef.current;
    state.board = createBoard();
    state.current = randomTetromino();
    state.next = randomTetromino();
    state.score = 0;
    state.running = true;
    setStarted(true);
    onScoreUpdate(0);
    drawBoard();
    drawNext();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(gameLoop, state.dropInterval);
  }, [drawBoard, drawNext, gameLoop, onScoreUpdate]);

  useEffect(() => {
    if (!isActive) {
      stateRef.current.running = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [isActive]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const state = stateRef.current;
      if (!state.running) return;

      if (e.key === "ArrowLeft") {
        if (isValid(state.board, state.current, -1, 0)) state.current.x -= 1;
        e.preventDefault();
      } else if (e.key === "ArrowRight") {
        if (isValid(state.board, state.current, 1, 0)) state.current.x += 1;
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        if (isValid(state.board, state.current, 0, 1)) state.current.y += 1;
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        const rotated = rotate(state.current.shape);
        if (isValid(state.board, state.current, 0, 0, rotated)) {
          state.current.shape = rotated;
        }
        e.preventDefault();
      } else if (e.key === " ") {
        // Hard drop
        while (isValid(state.board, state.current, 0, 1)) {
          state.current.y += 1;
        }
        e.preventDefault();
      }
      drawBoard();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [drawBoard]);

  useEffect(() => {
    drawBoard();
    drawNext();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [drawBoard, drawNext]);

  useEffect(() => {
    if (stateRef.current.running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(gameLoop, 500);
    }
  }, [gameLoop]);

  return (
    <div className="flex gap-4 items-start justify-center">
      <canvas
        ref={canvasRef}
        width={COLS * CELL}
        height={ROWS * CELL}
        className="border border-primary"
        style={{ boxShadow: "0 0 20px rgba(0, 245, 255, 0.3)" }}
      />
      <div className="flex flex-col gap-4">
        <div
          className="border border-border p-2"
          style={{ background: "rgba(0,245,255,0.05)" }}
        >
          <p className="font-arcade text-[8px] text-muted-foreground mb-2">NEXT</p>
          <canvas
            ref={nextCanvasRef}
            width={4 * NEXT_CELL}
            height={4 * NEXT_CELL}
          />
        </div>
        {!started && (
          <button
            type="button"
            onClick={startGame}
            className="font-arcade text-[9px] text-primary border border-primary px-3 py-2 hover:bg-primary hover:text-black transition-all"
            style={{ boxShadow: "0 0 10px rgba(0,245,255,0.4)" }}
          >
            START
          </button>
        )}
        <div className="font-arcade text-[7px] text-muted-foreground space-y-1">
          <p>← → Move</p>
          <p>↑ Rotate</p>
          <p>↓ Speed</p>
          <p>Space Drop</p>
        </div>
      </div>
    </div>
  );
}
