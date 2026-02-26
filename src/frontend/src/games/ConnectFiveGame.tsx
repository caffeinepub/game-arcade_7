import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const SIZE = 15;
type Stone = 0 | 1 | 2;
type Board = Stone[][];

function createBoard(): Board { return Array(SIZE).fill(null).map(() => Array(SIZE).fill(0)); }

function checkWin(board: Board, r: number, c: number, color: Stone): boolean {
  const dirs = [[0,1],[1,0],[1,1],[1,-1]] as const;
  for (const [dr, dc] of dirs) {
    let count = 1;
    for (let i = 1; i < 5; i++) { const nr=r+dr*i, nc=c+dc*i; if (nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&board[nr][nc]===color) count++; else break; }
    for (let i = 1; i < 5; i++) { const nr=r-dr*i, nc=c-dc*i; if (nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&board[nr][nc]===color) count++; else break; }
    if (count >= 5) return true;
  }
  return false;
}

function evalBoard(board: Board): number {
  // Score for AI(2) minus player(1) threats
  let score = 0;
  const dirs = [[0,1],[1,0],[1,1],[1,-1]] as const;
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    for (const [dr, dc] of dirs) {
      let b2=0, b1=0;
      for (let i = 0; i < 5; i++) {
        const nr=r+dr*i, nc=c+dc*i;
        if (nr<0||nr>=SIZE||nc<0||nc>=SIZE) { b2=-1; b1=-1; break; }
        if (board[nr][nc]===2) b2++;
        else if (board[nr][nc]===1) b1++;
      }
      if (b1===0&&b2>0) score += Math.pow(10,b2-1);
      if (b2===0&&b1>0) score -= Math.pow(10,b1-1);
    }
  }
  return score;
}

function aiMove(board: Board): [number, number] {
  // Check for immediate win or block
  const empty: [number,number][] = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (board[r][c] === 0) empty.push([r,c]);

  // Win move
  for (const [r,c] of empty) { const nb=board.map(row=>[...row]) as Board; nb[r][c]=2; if (checkWin(nb,r,c,2)) return [r,c]; }
  // Block
  for (const [r,c] of empty) { const nb=board.map(row=>[...row]) as Board; nb[r][c]=1; if (checkWin(nb,r,c,1)) return [r,c]; }
  // Heuristic
  let best = -Infinity, bestPos = empty[0] || [7,7];
  const candidates = empty.filter(([r,c]) => {
    const nearby = board[r].some(v=>v) || board.some(row=>row[c]);
    const adj = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].some(([dr,dc]) => { const nr=r+dr,nc=c+dc; return nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&board[nr][nc]>0; });
    return adj || empty.length < 20;
  });
  const toCheck = candidates.length > 0 ? candidates.slice(0, 30) : empty.slice(0, 30);
  for (const [r,c] of toCheck) {
    const nb=board.map(row=>[...row]) as Board; nb[r][c]=2;
    const s=evalBoard(nb);
    if (s>best){best=s;bestPos=[r,c];}
  }
  return bestPos;
}

export default function ConnectFiveGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [board, setBoard] = useState<Board>(() => createBoard());
  const [turn, setTurn] = useState<Stone>(1);
  const [gameOver, setGameOver] = useState(false);
  const [status, setStatus] = useState("YOUR TURN (BLACK)");
  const [lastMove, setLastMove] = useState<[number,number]|null>(null);

  const handleClick = useCallback((r: number, c: number) => {
    if (!isActive || gameOver || turn !== 1 || board[r][c] !== 0) return;
    const nb = board.map(row=>[...row]) as Board; nb[r][c]=1;
    setBoard(nb); setLastMove([r,c]);
    if (checkWin(nb,r,c,1)) { setGameOver(true); setStatus("YOU WIN! 🎉"); onScoreUpdate(1000); onGameOver(1000); return; }
    if (nb.flat().every(v=>v>0)) { setGameOver(true); setStatus("DRAW!"); onGameOver(0); return; }
    setTurn(2); setStatus("AI THINKING...");
    setTimeout(() => {
      const [ar,ac]=aiMove(nb);
      const nb2=nb.map(row=>[...row]) as Board; nb2[ar][ac]=2;
      setBoard(nb2); setLastMove([ar,ac]);
      if (checkWin(nb2,ar,ac,2)) { setGameOver(true); setStatus("AI WINS!"); onGameOver(0); return; }
      if (nb2.flat().every(v=>v>0)) { setGameOver(true); setStatus("DRAW!"); onGameOver(0); return; }
      setTurn(1); setStatus("YOUR TURN (BLACK)");
    }, 400);
  }, [board, turn, gameOver, isActive, onGameOver, onScoreUpdate]);

  const reset = () => { setBoard(createBoard()); setTurn(1); setGameOver(false); setStatus("YOUR TURN (BLACK)"); setLastMove(null); };
  const CELL = 30;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="font-arcade text-[10px]" style={{ color: gameOver ? "#39ff14" : "#fff200" }}>{status}</div>
      <div style={{ overflow: "auto", maxWidth: "100vw" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${SIZE}, ${CELL}px)`, background: "rgba(139,90,43,0.1)", border: "2px solid rgba(139,90,43,0.3)", borderRadius: 4, padding: 4 }}>
          {board.map((row, r) => row.map((cell, c) => {
            const isLast = lastMove?.[0]===r && lastMove?.[1]===c;
            return (
              <button type="button" key={`cf5-r${r}c${c}`} onClick={() => handleClick(r, c)}
                style={{
                  width: CELL, height: CELL, padding: 0,
                  background: "transparent", cursor: cell===0&&!gameOver?"pointer":"default",
                  border: "none", position: "relative",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(139,90,43,0.4)", transform: "translateY(-50%)" }} />
                <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, background: "rgba(139,90,43,0.4)", transform: "translateX(-50%)" }} />
                {cell !== 0 && (
                  <div style={{
                    width: CELL-6, height: CELL-6, borderRadius: "50%", zIndex: 1, position: "relative",
                    background: cell===1 ? "radial-gradient(circle at 35% 35%, #555, #000)" : "radial-gradient(circle at 35% 35%, #fff, #ccc)",
                    boxShadow: isLast ? `0 0 8px ${cell===1?"rgba(255,255,255,0.5)":"rgba(0,0,0,0.5)"}` : "none",
                    border: isLast ? `2px solid ${cell===1?"#fff200":"#ff4444"}` : "none",
                  }} />
                )}
              </button>
            );
          }))}
        </div>
      </div>
      <button type="button" onClick={reset} className="font-arcade text-[9px] px-3 py-1 rounded" style={{ background: "transparent", color: "#00f5ff", border: "1px solid #00f5ff" }}>NEW</button>
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Get 5 in a row (any direction) to win</p>
    </div>
  );
}
