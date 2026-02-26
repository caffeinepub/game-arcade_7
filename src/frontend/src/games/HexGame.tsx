import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const SIZE = 9; // Smaller for playability
type Stone = 0 | 1 | 2; // 0=empty, 1=blue(player, top-bottom), 2=red(AI, left-right)
type Board = Stone[][];

function createBoard(): Board { return Array(SIZE).fill(null).map(() => Array(SIZE).fill(0)); }

const NEIGHBORS = (r: number, c: number): [number,number][] => [
  [r-1,c],[r-1,c+1],[r,c-1],[r,c+1],[r+1,c-1],[r+1,c],
].filter(([nr,nc]) => nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE) as [number,number][];

function hasWon(board: Board, color: Stone): boolean {
  // Player(1) wins by connecting top row (r=0) to bottom row (r=SIZE-1)
  // AI(2) wins by connecting left col (c=0) to right col (c=SIZE-1)
  const starts: [number,number][] = color === 1
    ? Array.from({length:SIZE}, (_,c) => [0,c] as [number,number]).filter(([r,c]) => board[r][c] === color)
    : Array.from({length:SIZE}, (_,r) => [r,0] as [number,number]).filter(([r,c]) => board[r][c] === color);

  const visited = new Set<string>();
  const queue = [...starts];
  while (queue.length > 0) {
    const [r, c] = queue.pop()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (color === 1 && r === SIZE - 1) return true;
    if (color === 2 && c === SIZE - 1) return true;
    for (const [nr, nc] of NEIGHBORS(r, c)) {
      if (board[nr][nc] === color && !visited.has(`${nr},${nc}`)) queue.push([nr, nc]);
    }
  }
  return false;
}

function aiMove(board: Board): [number,number] | null {
  // Greedy: prefer center, then connections
  const empty: [number,number][] = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (board[r][c] === 0) empty.push([r, c]);
  if (empty.length === 0) return null;
  // Score each move
  let bestScore = -Infinity, best = empty[0];
  for (const [r, c] of empty) {
    const neighbors = NEIGHBORS(r, c);
    const friendlyNeighbors = neighbors.filter(([nr,nc]) => board[nr][nc] === 2).length;
    const centerScore = 1 - (Math.abs(r - SIZE/2) + Math.abs(c - SIZE/2)) / SIZE;
    const score = friendlyNeighbors * 2 + centerScore;
    if (score > bestScore) { bestScore = score; best = [r, c]; }
  }
  return best;
}

export default function HexGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [board, setBoard] = useState<Board>(() => createBoard());
  const [turn, setTurn] = useState<Stone>(1);
  const [gameOver, setGameOver] = useState(false);
  const [status, setStatus] = useState("YOUR TURN (BLUE — top to bottom)");
  const [score, setScore] = useState(0);

  const handleClick = useCallback((r: number, c: number) => {
    if (!isActive || gameOver || turn !== 1 || board[r][c] !== 0) return;
    const nb = board.map(row => [...row]) as Board;
    nb[r][c] = 1;
    setBoard(nb);
    if (hasWon(nb, 1)) {
      setGameOver(true); setStatus("YOU WIN! 🎉"); setScore(1000); onScoreUpdate(1000); onGameOver(1000); return;
    }
    setTurn(2); setStatus("AI THINKING...");
    setTimeout(() => {
      const aiM = aiMove(nb);
      if (!aiM) { setGameOver(true); setStatus("DRAW!"); onGameOver(0); return; }
      const nb2 = nb.map(row => [...row]) as Board;
      nb2[aiM[0]][aiM[1]] = 2;
      setBoard(nb2);
      if (hasWon(nb2, 2)) {
        setGameOver(true); setStatus("AI WINS!"); onGameOver(0); return;
      }
      setTurn(1); setStatus("YOUR TURN (BLUE)");
    }, 500);
  }, [board, turn, gameOver, isActive, onGameOver, onScoreUpdate]);

  const reset = () => { setBoard(createBoard()); setTurn(1); setGameOver(false); setStatus("YOUR TURN (BLUE — top to bottom)"); setScore(0); };

  // Hex cell dimensions
  const HEX_R = 22;
  const HEX_W = HEX_R * 2;
  const HEX_H = HEX_R * Math.sqrt(3);
  const totalW = SIZE * HEX_W * 0.75 + HEX_R + SIZE * 4;
  const totalH = SIZE * HEX_H + HEX_R;

  const hexPoints = (cx: number, cy: number): string => {
    return Array.from({length:6}, (_,i) => {
      const a = Math.PI / 180 * (60 * i - 30);
      return `${cx + HEX_R * Math.cos(a)},${cy + HEX_R * Math.sin(a)}`;
    }).join(" ");
  };

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="flex gap-6 items-center">
        <span style={{ color: "#0088ff", fontSize: 10, fontFamily: "'Press Start 2P'" }}>YOU = BLUE ↕</span>
        <span className="font-arcade text-[10px]" style={{ color: "#fff200" }}>{status}</span>
        <span style={{ color: "#ff4444", fontSize: 10, fontFamily: "'Press Start 2P'" }}>AI = RED ↔</span>
      </div>

      <svg width={totalW + 40} height={totalH + 40} style={{ overflow: "visible" }}>
        <title>Hex Game Board</title>
        <g transform="translate(20,20)">
          {/* Edge markers */}
          <text x={-15} y={totalH/2} fill="#0088ff" fontSize={11} textAnchor="middle">↕</text>
          <text x={totalW+15} y={totalH/2} fill="#0088ff" fontSize={11} textAnchor="middle">↕</text>
          <text x={totalW/2} y={-5} fill="#ff4444" fontSize={11} textAnchor="middle">↔</text>
          <text x={totalW/2} y={totalH+15} fill="#ff4444" fontSize={11} textAnchor="middle">↔</text>

          {board.map((row, r) => row.map((cell, c) => {
            const cx = c * HEX_W * 0.75 + HEX_R + r * HEX_W * 0.375;
            const cy = r * HEX_H + HEX_H / 2;
            return (
              <polygon key={`hex-${r}-${c}`} points={hexPoints(cx, cy)}
                fill={cell === 1 ? "#0055cc" : cell === 2 ? "#cc2200" : "rgba(20,10,40,0.8)"}
                stroke={cell === 1 ? "#4488ff" : cell === 2 ? "#ff6644" : "rgba(191,95,255,0.3)"}
                strokeWidth={1.5}
                onClick={() => handleClick(r, c)}
                style={{ cursor: cell === 0 && !gameOver ? "pointer" : "default" }}
              />
            );
          }))}
        </g>
      </svg>

      <div className="flex gap-3">
        {score > 0 && <span className="font-arcade text-[10px]" style={{ color: "#39ff14" }}>Score: {score}</span>}
        <button type="button" onClick={reset} className="font-arcade text-[9px] px-3 py-1 rounded" style={{ background: "transparent", color: "#00f5ff", border: "1px solid #00f5ff" }}>NEW</button>
      </div>
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Connect top to bottom with blue stones</p>
    </div>
  );
}
