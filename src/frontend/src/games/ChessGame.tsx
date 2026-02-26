import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

type Color = "w" | "b";
type PieceType = "K" | "Q" | "R" | "B" | "N" | "P";
type Piece = { type: PieceType; color: Color } | null;
type Board = Piece[][];

const PIECE_VALUES: Record<PieceType, number> = { K: 0, Q: 9, R: 5, B: 3, N: 3, P: 1 };
const PIECE_SYMBOLS: Record<string, string> = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};

function createBoard(): Board {
  const b: Board = Array(8).fill(null).map(() => Array(8).fill(null));
  const back: PieceType[] = ["R","N","B","Q","K","B","N","R"];
  for (let c = 0; c < 8; c++) {
    b[0][c] = { type: back[c], color: "b" };
    b[1][c] = { type: "P", color: "b" };
    b[6][c] = { type: "P", color: "w" };
    b[7][c] = { type: back[c], color: "w" };
  }
  return b;
}

function inBounds(r: number, c: number) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

function getMoves(board: Board, r: number, c: number, enPassant: [number, number] | null): [number, number][] {
  const p = board[r][c];
  if (!p) return [];
  const moves: [number, number][] = [];
  const opp = p.color === "w" ? "b" : "w";
  const add = (nr: number, nc: number) => {
    if (inBounds(nr, nc) && board[nr][nc]?.color !== p.color) moves.push([nr, nc]);
  };
  const slide = (dr: number, dc: number) => {
    let nr = r + dr, nc = c + dc;
    while (inBounds(nr, nc)) {
      if (board[nr][nc]) { if (board[nr][nc]!.color === opp) moves.push([nr, nc]); break; }
      moves.push([nr, nc]); nr += dr; nc += dc;
    }
  };

  switch (p.type) {
    case "P": {
      const dir = p.color === "w" ? -1 : 1;
      const start = p.color === "w" ? 6 : 1;
      if (inBounds(r + dir, c) && !board[r + dir][c]) {
        moves.push([r + dir, c]);
        if (r === start && !board[r + dir * 2][c]) moves.push([r + dir * 2, c]);
      }
      for (const dc of [-1, 1]) {
        if (inBounds(r + dir, c + dc)) {
          if (board[r + dir][c + dc]?.color === opp) moves.push([r + dir, c + dc]);
          if (enPassant && enPassant[0] === r + dir && enPassant[1] === c + dc) moves.push([r + dir, c + dc]);
        }
      }
      break;
    }
    case "N": for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) add(r+dr,c+dc); break;
    case "B": for (const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) slide(dr,dc); break;
    case "R": for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) slide(dr,dc); break;
    case "Q": for (const [dr,dc] of [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]) slide(dr,dc); break;
    case "K": for (const [dr,dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) add(r+dr,c+dc); break;
  }
  return moves;
}

function applyMove(board: Board, fr: number, fc: number, tr: number, tc: number): Board {
  const nb = board.map(row => [...row]);
  const p = nb[fr][fc]!;
  nb[tr][tc] = p;
  nb[fr][fc] = null;
  if (p.type === "P" && (tr === 0 || tr === 7)) nb[tr][tc] = { type: "Q", color: p.color };
  return nb;
}

function isInCheck(board: Board, color: Color): boolean {
  let kr = -1, kc = -1;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (board[r][c]?.type === "K" && board[r][c]?.color === color) { kr = r; kc = c; }
  const opp = color === "w" ? "b" : "w";
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (board[r][c]?.color === opp) {
      const ms = getMoves(board, r, c, null);
      if (ms.some(([mr, mc]) => mr === kr && mc === kc)) return true;
    }
  }
  return false;
}

function getLegalMoves(board: Board, r: number, c: number, color: Color, enPassant: [number,number]|null): [number,number][] {
  if (board[r][c]?.color !== color) return [];
  return getMoves(board, r, c, enPassant).filter(([tr, tc]) => {
    const nb = applyMove(board, r, c, tr, tc);
    return !isInCheck(nb, color);
  });
}

function scoreBoard(board: Board): number {
  let s = 0;
  for (const row of board) for (const p of row) if (p) s += (p.color === "w" ? -1 : 1) * PIECE_VALUES[p.type];
  return s;
}

function aiPickMove(board: Board): [number,number,number,number] | null {
  let best = Infinity, bestMove: [number,number,number,number] | null = null;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (board[r][c]?.color !== "b") continue;
    const ms = getLegalMoves(board, r, c, "b", null);
    for (const [tr, tc] of ms) {
      const nb = applyMove(board, r, c, tr, tc);
      const s = scoreBoard(nb);
      if (s < best) { best = s; bestMove = [r, c, tr, tc]; }
    }
  }
  return bestMove;
}

export default function ChessGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [board, setBoard] = useState<Board>(() => createBoard());
  const [selected, setSelected] = useState<[number,number]|null>(null);
  const [legalMoves, setLegalMoves] = useState<[number,number][]>([]);
  const [enPassant, setEnPassant] = useState<[number,number]|null>(null);
  const [score, setScore] = useState(0);
  const [turn, setTurn] = useState<Color>("w");
  const [status, setStatus] = useState("YOUR TURN (WHITE)");
  const [gameOver, setGameOver] = useState(false);

  const handleClick = useCallback((r: number, c: number) => {
    if (!isActive || gameOver || turn !== "w") return;
    if (selected) {
      const move = legalMoves.find(([mr, mc]) => mr === r && mc === c);
      if (move) {
        const captured = board[r][c];
        const captureScore = captured ? PIECE_VALUES[captured.type] : 0;
        const nb = applyMove(board, selected[0], selected[1], r, c);
        const newScore = score + captureScore * 10;
        setScore(newScore);
        onScoreUpdate(newScore);
        setSelected(null);
        setLegalMoves([]);
        setBoard(nb);

        const blackHasMoves = Array.from({ length: 8 }, (_, br) =>
          Array.from({ length: 8 }, (_, bc) => getLegalMoves(nb, br, bc, "b", null))
        ).flat().some(ms => ms.length > 0);

        if (!blackHasMoves) {
          const inC = isInCheck(nb, "b");
          setStatus(inC ? "CHECKMATE! YOU WIN! 🎉" : "STALEMATE — DRAW");
          setGameOver(true);
          onGameOver(newScore);
          return;
        }

        setTurn("b");
        setStatus("AI THINKING...");
        setTimeout(() => {
          const aiM = aiPickMove(nb);
          if (!aiM) { setStatus("YOU WIN!"); setGameOver(true); onGameOver(newScore); return; }
          const [fr, fc, tr2, tc2] = aiM;
          const aiCapture = nb[tr2][tc2];
          const nb2 = applyMove(nb, fr, fc, tr2, tc2);
          setBoard(nb2);
          setTurn("w");
          const wHasMoves = Array.from({ length: 8 }, (_, wr) =>
            Array.from({ length: 8 }, (_, wc) => getLegalMoves(nb2, wr, wc, "w", null))
          ).flat().some(ms => ms.length > 0);
          if (!wHasMoves) {
            const inC2 = isInCheck(nb2, "w");
            setStatus(inC2 ? "CHECKMATE! AI WINS!" : "STALEMATE — DRAW");
            setGameOver(true);
            onGameOver(newScore);
            return;
          }
          setStatus(isInCheck(nb2, "w") ? "CHECK! YOUR TURN" : "YOUR TURN (WHITE)");
        }, 400);
        return;
      }
      setSelected(null);
      setLegalMoves([]);
    }
    if (board[r][c]?.color === "w") {
      const ms = getLegalMoves(board, r, c, "w", enPassant);
      setSelected([r, c]);
      setLegalMoves(ms);
    }
  }, [board, selected, legalMoves, enPassant, score, turn, gameOver, isActive, onGameOver, onScoreUpdate]);

  const reset = () => {
    setBoard(createBoard()); setSelected(null); setLegalMoves([]);
    setEnPassant(null); setScore(0); setTurn("w"); setStatus("YOUR TURN (WHITE)"); setGameOver(false);
  };

  const CELL = 52;
  const ranks = ["8","7","6","5","4","3","2","1"];
  const files = ["a","b","c","d","e","f","g","h"];

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="font-arcade text-[10px]" style={{ color: gameOver ? "#ff4444" : "#fff200" }}>{status}</div>
      <div style={{ position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(8, ${CELL}px)`, border: "2px solid rgba(0,245,255,0.3)", borderRadius: 2 }}>
          {board.map((row, r) => row.map((piece, c) => {
            const isLight = (r + c) % 2 === 0;
            const isSel = selected?.[0] === r && selected?.[1] === c;
            const isLegal = legalMoves.some(([mr, mc]) => mr === r && mc === c);
            return (
              <button type="button" key={`ch-${r}-${c}`}
                onClick={() => handleClick(r, c)}
                style={{
                  width: CELL, height: CELL, padding: 0,
                  background: isSel ? "rgba(255,242,0,0.4)" : isLegal ? "rgba(57,255,20,0.3)" : isLight ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.5)",
                  border: isLegal ? "2px solid #39ff14" : "none",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: CELL - 16,
                  lineHeight: 1,
                  position: "relative",
                }}
              >
                {piece && (
                  <span style={{
                    color: piece.color === "w" ? "#ffffff" : "#111",
                    textShadow: piece.color === "w" ? "0 1px 3px rgba(0,0,0,0.8), 0 0 8px rgba(255,255,255,0.3)" : "0 1px 3px rgba(255,255,255,0.4)",
                    filter: piece.color === "b" ? "drop-shadow(0 0 4px rgba(0,245,255,0.6))" : "drop-shadow(0 0 4px rgba(255,255,255,0.4))",
                  }}>
                    {PIECE_SYMBOLS[piece.color + piece.type]}
                  </span>
                )}
                {isLegal && !piece && <div style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(57,255,20,0.5)", pointerEvents: "none" }} />}
                {c === 0 && <span style={{ position: "absolute", top: 2, left: 2, fontSize: 9, color: "rgba(255,255,255,0.3)", lineHeight: 1 }}>{ranks[r]}</span>}
                {r === 7 && <span style={{ position: "absolute", bottom: 2, right: 2, fontSize: 9, color: "rgba(255,255,255,0.3)", lineHeight: 1 }}>{files[c]}</span>}
              </button>
            );
          }))}
        </div>
      </div>
      <div className="flex gap-4 items-center">
        <button type="button" onClick={reset}
          className="font-arcade text-[10px] px-4 py-2 rounded"
          style={{ background: "transparent", color: "#39ff14", border: "1px solid #39ff14" }}>
          NEW GAME
        </button>
        <span className="font-mono-tech text-xs" style={{ color: "#00f5ff" }}>Score: {score}</span>
      </div>
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>White = You • Click piece then destination</p>
    </div>
  );
}
