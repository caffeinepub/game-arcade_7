import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const BOARD_SIZE = 14;
const PLAYER_COLOR = "#00f5ff";
const AI_COLOR = "#ff2d8e";
const PLAYER_ID = 1;
const AI_ID = 2;

type Board = number[][];

// Polyomino pieces: array of [row, col] offsets
const PIECES = [
  [[0,0]],                                      // 1: monomino
  [[0,0],[0,1]],                                // 2: domino
  [[0,0],[0,1],[0,2]],                          // 3: tromino I
  [[0,0],[1,0],[0,1]],                          // 3: tromino L
  [[0,0],[0,1],[0,2],[0,3]],                    // 4: tetromino I
  [[0,0],[1,0],[0,1],[1,1]],                    // 4: square
  [[0,0],[0,1],[0,2],[1,0]],                    // 4: L
  [[0,0],[0,1],[0,2],[1,2]],                    // 4: J
  [[0,0],[0,1],[1,1],[1,2]],                    // 4: S
  [[0,1],[0,0],[1,0],[1,-1]],                   // 4: Z
  [[0,1],[0,0],[0,2],[1,1]],                    // 4: T
  [[0,0],[0,1],[0,2],[0,3],[0,4]],              // 5: pentomino I
  [[0,0],[0,1],[0,2],[1,0],[2,0]],              // 5: L5
  [[0,0],[0,1],[1,1],[1,2],[2,2]],              // 5: S5
  [[0,0],[0,1],[0,2],[1,0],[1,2]],              // 5: U
  [[0,0],[1,0],[2,0],[1,1],[1,2]],              // 5: T5
  [[0,0],[1,0],[1,1],[2,1],[2,2]],              // 5: W
  [[0,1],[1,0],[1,1],[1,2],[2,1]],              // 5: X
  [[0,0],[0,1],[0,2],[1,1],[2,1]],              // 5: Y
  [[0,0],[0,1],[1,1],[2,1],[2,2]],              // 5: Z5
  [[0,0],[0,1],[0,2],[1,2],[1,3]],              // 5: F
];

function initBoard(): Board {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(0));
}

function canPlace(board: Board, piece: number[][], r: number, c: number, playerId: number): boolean {
  // All cells must be in bounds and empty
  for (const [dr, dc] of piece) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) return false;
    if (board[nr][nc] !== 0) return false;
  }

  // Must touch at least one corner of existing same-color piece (or it's the first piece in corner)
  const cells = new Set(piece.map(([dr, dc]) => `${r+dr},${c+dc}`));
  const ownCells = board.flat().some(v => v === playerId);

  if (!ownCells) {
    // First piece: must include corner
    const corner = playerId === PLAYER_ID ? [0, 0] : [BOARD_SIZE - 1, BOARD_SIZE - 1];
    return piece.some(([dr, dc]) => r + dr === corner[0] && c + dc === corner[1]);
  }

  // Must share a corner with an existing piece but NOT share an edge
  let hasCorner = false;
  for (const [dr, dc] of piece) {
    const nr = r + dr, nc = c + dc;
    // Check edge adjacency (not allowed)
    for (const [er, ec] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const adjR = nr + er, adjC = nc + ec;
      if (adjR >= 0 && adjR < BOARD_SIZE && adjC >= 0 && adjC < BOARD_SIZE) {
        if (board[adjR][adjC] === playerId) return false; // edge touching same color
      }
    }
    // Check corner touches
    for (const [cr, cc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const adjR = nr + cr, adjC = nc + cc;
      if (adjR >= 0 && adjR < BOARD_SIZE && adjC >= 0 && adjC < BOARD_SIZE) {
        if (board[adjR][adjC] === playerId && !cells.has(`${adjR},${adjC}`)) hasCorner = true;
      }
    }
  }
  return hasCorner;
}

function placePiece(board: Board, piece: number[][], r: number, c: number, playerId: number): Board {
  const nb = board.map(row => [...row]);
  for (const [dr, dc] of piece) {
    nb[r + dr][c + dc] = playerId;
  }
  return nb;
}

export default function BlokusGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [board, setBoard] = useState<Board>(initBoard);
  const [playerPieces, setPlayerPieces] = useState(() => PIECES.map((_, i) => i));
  const [aiPieces, setAIPieces] = useState(() => PIECES.map((_, i) => i));
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [turnCount, setTurnCount] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState("Select a piece, then click the board to place it.");

  const doAITurn = useCallback((currentBoard: Board, aiPieceIndices: number[]): { board: Board; remaining: number[] } => {
    // AI tries to place a random valid piece
    const shuffled = [...aiPieceIndices].sort(() => Math.random() - 0.5);
    for (const pieceIdx of shuffled) {
      const piece = PIECES[pieceIdx];
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (canPlace(currentBoard, piece, r, c, AI_ID)) {
            return {
              board: placePiece(currentBoard, piece, r, c, AI_ID),
              remaining: aiPieceIndices.filter(i => i !== pieceIdx),
            };
          }
        }
      }
    }
    return { board: currentBoard, remaining: aiPieceIndices };
  }, []);

  const handleBoardClick = useCallback((r: number, c: number) => {
    if (!isActive || gameOver || selectedPiece === null) return;

    const piece = PIECES[selectedPiece];
    if (!canPlace(board, piece, r, c, PLAYER_ID)) {
      setMessage("Can't place there! Corners must touch, edges must not.");
      return;
    }

    const newBoard = placePiece(board, piece, r, c, PLAYER_ID);
    const newPlayerPieces = playerPieces.filter(i => i !== selectedPiece);
    setSelectedPiece(null);

    // AI turn
    const { board: afterAI, remaining: newAIPieces } = doAITurn(newBoard, aiPieces);

    setBoard(afterAI);
    setPlayerPieces(newPlayerPieces);
    setAIPieces(newAIPieces);
    setTurnCount(t => t + 1);

    const playerScore = BOARD_SIZE * BOARD_SIZE - newPlayerPieces.reduce((a, i) => a + PIECES[i].length, 0);
    setScore(playerScore);
    onScoreUpdate(playerScore);
    setMessage(`Turn ${turnCount + 1}: ${newPlayerPieces.length} pieces remaining.`);

    if (newPlayerPieces.length === 0) {
      setGameOver(true);
      onGameOver(playerScore + 200);
    }
  }, [isActive, gameOver, selectedPiece, board, playerPieces, aiPieces, turnCount, doAITurn, onScoreUpdate, onGameOver]);

  const CELL = 26;

  return (
    <div className="flex flex-col items-center gap-3 p-3">
      <div className="flex gap-5 font-arcade text-[9px]">
        <span style={{ color: "#00f5ff" }}>YOU (CYAN)</span>
        <span style={{ color: "#ff2d8e" }}>AI (PINK)</span>
        <span style={{ color: "#39ff14" }}>SCORE: {score}</span>
        <span style={{ color: "#fff200" }}>TURNS: {turnCount}</span>
      </div>

      <div className="flex gap-3 items-start">
        {/* Board */}
        <div
          className="rounded"
          style={{ border: "1px solid rgba(0,245,255,0.2)" }}
        >
          {board.map((row, r) => (
            <div key={`blokus-r-${r}`} className="flex">
              {row.map((cell, c) => (
                <button
                  key={`blokus-${r}-${c}`}
                  type="button"
                  onClick={() => handleBoardClick(r, c)}
                  className="transition-colors"
                  style={{
                    width: CELL,
                    height: CELL,
                    background: cell === PLAYER_ID ? PLAYER_COLOR :
                      cell === AI_ID ? AI_COLOR :
                      "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: cell === PLAYER_ID ? `0 0 4px ${PLAYER_COLOR}66` :
                      cell === AI_ID ? `0 0 4px ${AI_COLOR}66` : "none",
                    cursor: selectedPiece !== null && cell === 0 ? "pointer" : "default",
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Piece selector */}
        <div className="flex flex-col gap-1" style={{ maxHeight: 380, overflowY: "auto" }}>
          <div className="font-arcade text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>PIECES:</div>
          {playerPieces.map(idx => (
            <button
              key={`blokus-piece-${idx}`}
              type="button"
              onClick={() => setSelectedPiece(idx === selectedPiece ? null : idx)}
              className="rounded p-1 transition-all"
              style={{
                background: selectedPiece === idx ? "rgba(0,245,255,0.2)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${selectedPiece === idx ? "#00f5ff" : "rgba(255,255,255,0.1)"}`,
                minWidth: 60,
              }}
            >
              <svg width={56} height={24} aria-label={`piece ${idx}`}>
                {PIECES[idx].map(([dr, dc], ci) => (
                  <rect
                    key={`bp-${idx}-${ci}`}
                    x={dc * 10 + 5}
                    y={dr * 10 + 2}
                    width={9}
                    height={9}
                    fill="#00f5ff"
                    rx={1}
                  />
                ))}
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="font-mono-tech text-xs text-center" style={{ color: "rgba(0,245,255,0.6)" }}>
        {message}
      </div>

      <p className="font-mono-tech text-xs text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
        Select a piece (right panel), click board to place. Corners must touch your color, edges must not!
      </p>
    </div>
  );
}
