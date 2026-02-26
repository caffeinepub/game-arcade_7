import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

type Cell = 0 | 1 | 2; // 0=empty, 1=black(player), 2=white(AI)
type Board = Cell[][];

function createBoard(): Board {
  const b: Board = Array(8).fill(null).map(() => Array(8).fill(0));
  b[3][3] = 2; b[3][4] = 1; b[4][3] = 1; b[4][4] = 2;
  return b;
}

const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]] as const;

function getFlips(board: Board, r: number, c: number, color: Cell): [number,number][] {
  if (board[r][c] !== 0) return [];
  const opp = color === 1 ? 2 : 1;
  const flips: [number,number][] = [];
  for (const [dr, dc] of DIRS) {
    const line: [number,number][] = [];
    let nr = r + dr, nc = c + dc;
    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === opp) {
      line.push([nr, nc]); nr += dr; nc += dc;
    }
    if (line.length > 0 && nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === color) {
      flips.push(...line);
    }
  }
  return flips;
}

function getValidMoves(board: Board, color: Cell): [number,number][] {
  const moves: [number,number][] = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (getFlips(board, r, c, color).length > 0) moves.push([r, c]);
  }
  return moves;
}

function applyMove(board: Board, r: number, c: number, color: Cell): Board {
  const nb = board.map(row => [...row]) as Board;
  const flips = getFlips(nb, r, c, color);
  nb[r][c] = color;
  for (const [fr, fc] of flips) nb[fr][fc] = color;
  return nb;
}

function scoreBoard(board: Board): number {
  // Corner bonus for AI
  let s = 0;
  const corners = [[0,0],[0,7],[7,0],[7,7]];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const v = board[r][c] === 2 ? 1 : board[r][c] === 1 ? -1 : 0;
    const cornerBonus = corners.some(([cr,cc]) => cr===r&&cc===c) ? 4 : 1;
    s += v * cornerBonus;
  }
  return s;
}

function aiMove(board: Board): Board {
  const moves = getValidMoves(board, 2);
  if (moves.length === 0) return board;
  let best = -Infinity, bestMove = moves[0];
  for (const [r, c] of moves) {
    const nb = applyMove(board, r, c, 2);
    const s = scoreBoard(nb);
    if (s > best) { best = s; bestMove = [r, c]; }
  }
  return applyMove(board, bestMove[0], bestMove[1], 2);
}

export default function ReversiGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [board, setBoard] = useState<Board>(() => createBoard());
  const [turn, setTurn] = useState<Cell>(1);
  const [gameOver, setGameOver] = useState(false);
  const [status, setStatus] = useState("YOUR TURN (BLACK ●)");
  const [score, setScore] = useState(0);
  const validMoves = getValidMoves(board, 1);

  const handleClick = useCallback((r: number, c: number) => {
    if (!isActive || gameOver || turn !== 1) return;
    const flips = getFlips(board, r, c, 1);
    if (flips.length === 0) return;

    let nb = applyMove(board, r, c, 1);
    const p1 = nb.flat().filter(v => v === 1).length;
    onScoreUpdate(p1);
    setScore(p1);

    const aiMoves = getValidMoves(nb, 2);
    if (aiMoves.length === 0) {
      const playerMoves2 = getValidMoves(nb, 1);
      if (playerMoves2.length === 0) {
        const b1 = nb.flat().filter(v => v === 1).length;
        const b2 = nb.flat().filter(v => v === 2).length;
        setBoard(nb); setGameOver(true);
        setStatus(b1 > b2 ? `YOU WIN! ${b1}-${b2}` : b2 > b1 ? `AI WINS! ${b2}-${b1}` : "DRAW!");
        onGameOver(b1);
        return;
      }
      setBoard(nb); setStatus("AI HAS NO MOVES — YOUR TURN");
      return;
    }

    setTurn(2); setStatus("AI THINKING...");
    setBoard(nb);

    setTimeout(() => {
      nb = aiMove(nb);
      const p2 = nb.flat().filter(v => v === 1).length;
      setBoard(nb); setScore(p2); onScoreUpdate(p2);
      const pMoves = getValidMoves(nb, 1);
      if (pMoves.length === 0) {
        const aiMoves2 = getValidMoves(nb, 2);
        if (aiMoves2.length === 0) {
          const b1 = nb.flat().filter(v => v === 1).length;
          const b2 = nb.flat().filter(v => v === 2).length;
          setGameOver(true);
          setStatus(b1 > b2 ? `YOU WIN! ${b1}-${b2}` : b2 > b1 ? `AI WINS! ${b2}-${b1}` : "DRAW!");
          onGameOver(b1);
          return;
        }
        setTurn(2); setStatus("YOU HAVE NO MOVES — AI PLAYS");
      } else {
        setTurn(1); setStatus("YOUR TURN (BLACK ●)");
      }
    }, 600);
  }, [board, turn, gameOver, isActive, onGameOver, onScoreUpdate]);

  const reset = () => { setBoard(createBoard()); setTurn(1); setGameOver(false); setStatus("YOUR TURN (BLACK ●)"); setScore(0); };
  const CELL = 52;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="flex gap-6">
        <span className="font-arcade text-xs" style={{ color: "#111", textShadow: "0 0 8px rgba(255,255,255,0.5)", background: "#fff", padding: "2px 8px", borderRadius: 4 }}>● {board.flat().filter(v=>v===1).length}</span>
        <span className="font-arcade text-[10px]" style={{ color: "#fff200" }}>{status}</span>
        <span className="font-arcade text-xs" style={{ color: "#fff", textShadow: "0 0 8px rgba(0,245,255,0.8)", background: "#333", padding: "2px 8px", borderRadius: 4 }}>○ {board.flat().filter(v=>v===2).length}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(8, ${CELL}px)`, border: "2px solid rgba(57,255,20,0.3)", borderRadius: 4, background: "rgba(0,60,0,0.2)" }}>
        {board.map((row, r) => row.map((cell, c) => {
          const isValid = turn === 1 && !gameOver && validMoves.some(([mr,mc]) => mr===r && mc===c);
          return (
            <button type="button" key={`rev-${r}-${c}`} onClick={() => handleClick(r, c)}
              style={{
                width: CELL, height: CELL, padding: 0,
                background: isValid ? "rgba(57,255,20,0.1)" : "transparent",
                border: `1px solid rgba(57,255,20,${isValid ? "0.4" : "0.1"})`,
                cursor: isValid ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              {cell !== 0 && (
                <div style={{
                  width: CELL - 10, height: CELL - 10, borderRadius: "50%",
                  background: cell === 1 ? "radial-gradient(circle at 35% 35%, #444, #000)" : "radial-gradient(circle at 35% 35%, #fff, #aaa)",
                  boxShadow: cell === 1 ? "0 0 8px rgba(0,0,0,0.8), inset 0 2px 4px rgba(255,255,255,0.1)" : "0 0 8px rgba(255,255,255,0.3)",
                }} />
              )}
              {isValid && cell === 0 && <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(57,255,20,0.4)" }} />}
            </button>
          );
        }))}
      </div>

      <div className="flex gap-3">
        <span className="font-mono-tech text-xs" style={{ color: "#39ff14" }}>Score: {score}</span>
        <button type="button" onClick={reset} className="font-arcade text-[9px] px-3 py-1 rounded" style={{ background: "transparent", color: "#00f5ff", border: "1px solid #00f5ff" }}>NEW</button>
      </div>
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>You = Black • Click valid squares (highlighted)</p>
    </div>
  );
}
