import { useState, useCallback, useRef } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

type Mark = "X" | "O" | null;

function checkWinner(board: Mark[]): Mark | "draw" {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every((c) => c !== null)) return "draw";
  return null;
}

function bestMove(board: Mark[]): number {
  let best = -Infinity;
  let move = -1;

  const minimax = (b: Mark[], isMax: boolean, depth: number): number => {
    const w = checkWinner(b);
    if (w === "O") return 10 - depth;
    if (w === "X") return depth - 10;
    if (w === "draw") return 0;

    let val = isMax ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i] !== null) continue;
      const nb = [...b];
      nb[i] = isMax ? "O" : "X";
      const score = minimax(nb, !isMax, depth + 1);
      val = isMax ? Math.max(val, score) : Math.min(val, score);
    }
    return val;
  };

  for (let i = 0; i < 9; i++) {
    if (board[i] !== null) continue;
    const nb = [...board];
    nb[i] = "O";
    const score = minimax(nb, false, 0);
    if (score > best) { best = score; move = i; }
  }
  return move;
}

export default function TicTacToeGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [board, setBoard] = useState<Mark[]>(Array(9).fill(null));
  const [thinking, setThinking] = useState(false);
  const [result, setResult] = useState<Mark | "draw" | null>(null);
  const [wins, setWins] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const gameOverFired = useRef(false);

  const reset = useCallback(() => {
    setBoard(Array(9).fill(null));
    setResult(null);
    setThinking(false);
  }, []);

  const handleClick = useCallback((idx: number) => {
    if (!isActive || board[idx] !== null || result !== null || thinking) return;

    const nb = [...board];
    nb[idx] = "X";
    setBoard(nb);

    const winner = checkWinner(nb);
    if (winner) {
      const newWins = winner === "X" ? wins + 1 : wins;
      const newGames = gamesPlayed + 1;
      setResult(winner);
      setWins(newWins);
      setGamesPlayed(newGames);
      if (winner === "X") onScoreUpdate(newWins);
      if (!gameOverFired.current) {
        gameOverFired.current = true;
        setTimeout(() => onGameOver(newWins), 1000);
      }
      return;
    }

    // CPU turn
    setThinking(true);
    setTimeout(() => {
      const cpuIdx = bestMove(nb);
      if (cpuIdx < 0) return;
      const nb2 = [...nb];
      nb2[cpuIdx] = "O";
      setBoard(nb2);

      const w2 = checkWinner(nb2);
      if (w2) {
        const newGames = gamesPlayed + 1;
        setResult(w2);
        setGamesPlayed(newGames);
        if (!gameOverFired.current) {
          gameOverFired.current = true;
          setTimeout(() => onGameOver(wins), 1000);
        }
      }
      setThinking(false);
    }, 400);
  }, [isActive, board, result, thinking, wins, gamesPlayed, onGameOver, onScoreUpdate]);

  const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const winLine = LINES.find(([a,b,c]) => board[a] && board[a] === board[b] && board[a] === board[c]);

  return (
    <div className="flex flex-col items-center gap-6 select-none">
      <div className="flex items-center gap-8">
        <div className="text-center">
          <div className="font-arcade text-[10px] mb-1" style={{ color: "rgba(0,245,255,0.5)" }}>YOU (X)</div>
          <div className="font-orbitron text-3xl font-bold" style={{ color: "#00f5ff", textShadow: "0 0 15px #00f5ff" }}>{wins}</div>
        </div>
        <div className="font-arcade text-xs" style={{ color: "#fff200" }}>WINS</div>
        <div className="text-center">
          <div className="font-arcade text-[10px] mb-1" style={{ color: "rgba(255,45,142,0.5)" }}>CPU (O)</div>
          <div className="font-orbitron text-3xl font-bold" style={{ color: "#ff2d8e", textShadow: "0 0 15px #ff2d8e" }}>{gamesPlayed - wins}</div>
        </div>
      </div>

      <div
        className="relative"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 100px)",
          gridTemplateRows: "repeat(3, 100px)",
          gap: 6,
          background: "rgba(0,245,255,0.05)",
          padding: 12,
          borderRadius: 8,
          border: "1px solid rgba(0,245,255,0.2)",
        }}
      >
        {board.map((cell, i) => {
          const isWinCell = winLine?.includes(i) ?? false;
          return (
            <button
              key={`ttt-${i}`}
              type="button"
              onClick={() => handleClick(i)}
              disabled={!!cell || !!result || thinking}
              style={{
                width: 100, height: 100,
                background: isWinCell ? "rgba(0,245,255,0.15)" : "rgba(0,0,0,0.3)",
                border: `1px solid ${isWinCell ? "#00f5ff" : "rgba(255,255,255,0.1)"}`,
                borderRadius: 6,
                cursor: !cell && !result && !thinking ? "pointer" : "default",
                boxShadow: isWinCell ? "0 0 15px rgba(0,245,255,0.4)" : "none",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {cell && (
                <span
                  style={{
                    fontFamily: "'Press Start 2P', cursive",
                    fontSize: 36,
                    color: cell === "X" ? "#00f5ff" : "#ff2d8e",
                    textShadow: cell === "X" ? "0 0 15px #00f5ff" : "0 0 15px #ff2d8e",
                    display: "block",
                  }}
                >
                  {cell}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="font-arcade text-xs text-center" style={{ color: "#fff200", minHeight: 24 }}>
        {result === "X" && "YOU WIN! 🎉"}
        {result === "O" && "CPU WINS!"}
        {result === "draw" && "DRAW!"}
        {!result && (thinking ? "CPU THINKING..." : "YOUR TURN (X)")}
      </div>

      {result && (
        <button
          type="button"
          className="font-arcade text-xs px-6 py-3 rounded"
          style={{ background: "transparent", color: "#39ff14", border: "1px solid #39ff14", boxShadow: "0 0 10px rgba(57,255,20,0.3)" }}
          onClick={() => {
            reset();
            gameOverFired.current = false;
          }}
        >
          PLAY AGAIN
        </button>
      )}

      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
        Click a cell to place X · CPU plays O
      </p>
    </div>
  );
}
