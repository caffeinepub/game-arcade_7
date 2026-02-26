import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

type Stone = 0 | 1 | 2; // 0=empty, 1=black(player), 2=white(AI)
type Board = Stone[][];
const SIZE = 9;

function createBoard(): Board { return Array(SIZE).fill(null).map(() => Array(SIZE).fill(0)); }

function getGroup(board: Board, r: number, c: number): [number,number][] {
  const color = board[r][c];
  if (!color) return [];
  const visited = new Set<string>();
  const queue: [number,number][] = [[r, c]];
  const group: [number,number][] = [];
  while (queue.length > 0) {
    const [cr, cc] = queue.pop()!;
    const key = `${cr},${cc}`;
    if (visited.has(key)) continue;
    visited.add(key);
    group.push([cr, cc]);
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = cr+dr, nc = cc+dc;
      if (nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&board[nr][nc]===color&&!visited.has(`${nr},${nc}`)) queue.push([nr,nc]);
    }
  }
  return group;
}

function getLiberties(board: Board, group: [number,number][]): number {
  const libs = new Set<string>();
  for (const [r, c] of group) {
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r+dr, nc = c+dc;
      if (nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&board[nr][nc]===0) libs.add(`${nr},${nc}`);
    }
  }
  return libs.size;
}

function applyMove(board: Board, r: number, c: number, color: Stone): Board | null {
  if (board[r][c] !== 0) return null;
  const nb = board.map(row => [...row]) as Board;
  nb[r][c] = color;
  const opp = color === 1 ? 2 : 1;
  // Capture opponent groups with no liberties
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    const nr = r+dr, nc = c+dc;
    if (nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&nb[nr][nc]===opp) {
      const group = getGroup(nb, nr, nc);
      if (getLiberties(nb, group) === 0) { for (const [gr,gc] of group) nb[gr][gc] = 0; }
    }
  }
  // Check own group has liberties (suicide rule)
  const ownGroup = getGroup(nb, r, c);
  if (getLiberties(nb, ownGroup) === 0) return null;
  return nb;
}

function aiMove(board: Board): [number,number] | null {
  // Simple AI: pick random valid move, prefer captures/high-liberty spots
  const moves: [number,number][] = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (applyMove(board, r, c, 2)) moves.push([r, c]);
  }
  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * Math.min(moves.length, 10))];
}

function countScore(board: Board): [number, number] {
  let b = 0, w = 0;
  for (const row of board) for (const v of row) { if (v===1) b++; else if (v===2) w++; }
  return [b, w];
}

export default function GoGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [board, setBoard] = useState<Board>(() => createBoard());
  const [captured, setCaptured] = useState({ black: 0, white: 0 });
  const [turn, setTurn] = useState<Stone>(1);
  const [passes, setPasses] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [status, setStatus] = useState("YOUR TURN (BLACK)");
  const [score, setScore] = useState(0);

  const endGame = useCallback((b: Board, cap: { black: number; white: number }) => {
    const [bs, ws] = countScore(b);
    const total = bs - cap.white;
    setGameOver(true);
    setStatus(bs > ws ? `YOU WIN! B:${bs} W:${ws}` : `AI WINS! W:${ws} B:${bs}`);
    onGameOver(Math.max(0, total));
  }, [onGameOver]);

  const handlePass = useCallback(() => {
    if (!isActive || gameOver) return;
    const np = passes + 1;
    if (np >= 2) { endGame(board, captured); return; }
    setPasses(np);
    setTurn(2);
    setStatus("AI THINKING...");
    setTimeout(() => {
      const aiM = aiMove(board);
      if (!aiM) { setPasses(np + 1); if (np + 1 >= 2) { endGame(board, captured); } else { setTurn(1); setStatus("YOUR TURN (BLACK)"); } return; }
      const nb = applyMove(board, aiM[0], aiM[1], 2);
      if (!nb) { setTurn(1); setStatus("YOUR TURN (BLACK)"); return; }
      const newCap = board[aiM[0]][aiM[1]] === 0 ? captured : { ...captured, white: captured.white + 1 };
      setBoard(nb); setCaptured(newCap); setPasses(0); setTurn(1); setStatus("YOUR TURN (BLACK)");
    }, 600);
  }, [board, captured, passes, gameOver, isActive, endGame]);

  const handleClick = useCallback((r: number, c: number) => {
    if (!isActive || gameOver || turn !== 1) return;
    const nb = applyMove(board, r, c, 1);
    if (!nb) return;
    const beforeCap = board.flat().filter(v => v===2).length;
    const afterCap = nb.flat().filter(v => v===2).length;
    const newWhiteCap = captured.white + (beforeCap - afterCap);
    const newCap = { ...captured, white: newWhiteCap };
    const [bs] = countScore(nb);
    setCaptured(newCap); setBoard(nb); setPasses(0); onScoreUpdate(bs); setScore(bs);
    setTurn(2); setStatus("AI THINKING...");

    setTimeout(() => {
      const aiM = aiMove(nb);
      if (!aiM) { setTurn(1); setStatus("YOUR TURN (BLACK)"); return; }
      const nb2 = applyMove(nb, aiM[0], aiM[1], 2);
      if (!nb2) { setTurn(1); setStatus("YOUR TURN (BLACK)"); return; }
      const [bs2] = countScore(nb2);
      setBoard(nb2); onScoreUpdate(bs2); setScore(bs2); setTurn(1); setStatus("YOUR TURN (BLACK)");
    }, 700);
  }, [board, captured, turn, gameOver, isActive, onScoreUpdate]);

  const reset = () => { setBoard(createBoard()); setCaptured({ black:0, white:0 }); setTurn(1); setPasses(0); setGameOver(false); setStatus("YOUR TURN (BLACK)"); setScore(0); };
  const CELL = 40;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="flex gap-6 items-center">
        <span className="font-arcade text-[9px]" style={{ color: "#111", background: "#fff", padding: "1px 6px", borderRadius: 3 }}>● {board.flat().filter(v=>v===1).length}</span>
        <span className="font-arcade text-[10px] text-center" style={{ color: "#ff2d8e" }}>{status}</span>
        <span className="font-arcade text-[9px]" style={{ color: "#fff", background: "#555", padding: "1px 6px", borderRadius: 3 }}>○ {board.flat().filter(v=>v===2).length}</span>
      </div>

      <div style={{ position: "relative", background: "rgba(139,90,43,0.15)", border: "2px solid rgba(139,90,43,0.3)", borderRadius: 4, padding: 4 }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${SIZE}, ${CELL}px)` }}>
          {board.map((row, r) => row.map((cell, c) => (
            <button type="button" key={`go-${r}-${c}`} onClick={() => handleClick(r, c)}
              style={{
                width: CELL, height: CELL, padding: 0, background: "transparent", border: "none", cursor: cell===0 && turn===1 && !gameOver ? "pointer" : "default",
                position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              {/* Grid lines */}
              <div style={{ position: "absolute", top: r===0?"50%":0, left: c===0?"50%":0, right: c===SIZE-1?"50%":0, bottom: r===SIZE-1?"50%":0, borderRight: c<SIZE-1?"1px solid rgba(139,90,43,0.5)":"none", borderBottom: r<SIZE-1?"1px solid rgba(139,90,43,0.5)":"none", pointerEvents: "none" }} />
              {cell !== 0 && (
                <div style={{ width: CELL-6, height: CELL-6, borderRadius: "50%", background: cell===1?"radial-gradient(circle at 35% 35%, #444, #000)":"radial-gradient(circle at 35% 35%, #fff, #ccc)", boxShadow: cell===1?"0 2px 4px rgba(0,0,0,0.6)":"0 2px 4px rgba(0,0,0,0.3)", zIndex: 1, position: "relative" }} />
              )}
              {[0,2,4,6,8].includes(r) && [0,2,4,6,8].includes(c) && cell===0 && <div style={{ width:5,height:5,borderRadius:"50%",background:"rgba(139,90,43,0.5)",position:"absolute" }} />}
            </button>
          )))}
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <span className="font-mono-tech text-xs" style={{ color: "#fff200" }}>Score: {score}</span>
        <button type="button" onClick={handlePass} disabled={gameOver} className="font-arcade text-[9px] px-3 py-1 rounded" style={{ background: "transparent", color: "#bf5fff", border: "1px solid #bf5fff" }}>PASS</button>
        <button type="button" onClick={reset} className="font-arcade text-[9px] px-3 py-1 rounded" style={{ background: "transparent", color: "#00f5ff", border: "1px solid #00f5ff" }}>NEW</button>
      </div>
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Black = You • Click to place stone • Pass × 2 to end</p>
    </div>
  );
}
