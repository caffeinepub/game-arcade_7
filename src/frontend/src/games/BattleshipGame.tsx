import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

type Cell = "empty" | "ship" | "hit" | "miss" | "sunk";
type Phase = "place" | "battle" | "over";

const SHIPS = [5, 4, 3, 3, 2];
const SHIP_NAMES = ["Carrier", "Battleship", "Destroyer", "Sub", "Patrol"];

function placeShipsRandom(): { board: Cell[][]; positions: [number,number][][] } {
  const board: Cell[][] = Array(10).fill(null).map(() => Array(10).fill("empty"));
  const positions: [number,number][][] = [];
  for (const len of SHIPS) {
    let placed = false;
    while (!placed) {
      const horiz = Math.random() > 0.5;
      const r = Math.floor(Math.random() * (horiz ? 10 : 10 - len + 1));
      const c = Math.floor(Math.random() * (horiz ? 10 - len + 1 : 10));
      const cells: [number,number][] = [];
      let ok = true;
      for (let i = 0; i < len; i++) {
        const nr = r + (horiz ? 0 : i), nc = c + (horiz ? i : 0);
        if (board[nr][nc] !== "empty") { ok = false; break; }
        cells.push([nr, nc]);
      }
      if (ok) {
        for (const [nr, nc] of cells) board[nr][nc] = "ship";
        positions.push(cells);
        placed = true;
      }
    }
  }
  return { board, positions };
}

export default function BattleshipGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [phase, setPhase] = useState<Phase>("place");
  const [playerBoard, setPlayerBoard] = useState<Cell[][]>(() => Array(10).fill(null).map(() => Array(10).fill("empty")));
  const [aiBoard, setAiBoard] = useState<Cell[][]>(() => Array(10).fill(null).map(() => Array(10).fill("empty")));
  const [aiShipPositions, setAiShipPositions] = useState<[number,number][][]>([]);
  const [playerShipPositions, setPlayerShipPositions] = useState<[number,number][][]>([]);
  const [placingShipIdx, setPlacingShipIdx] = useState(0);
  const [horizontal, setHorizontal] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<[number,number]|null>(null);
  const [score, setScore] = useState(0);
  const [aiHits, setAiHits] = useState<[number,number][]>([]);
  const [status, setStatus] = useState("Place your ships");

  const startBattle = useCallback(() => {
    const { board, positions } = placeShipsRandom();
    setAiBoard(board.map(r => r.map(c => c === "ship" ? "empty" : c)));
    setAiShipPositions(positions);
    setPhase("battle");
    setStatus("YOUR TURN — Fire at the enemy grid!");
  }, []);

  const placePlayerShip = useCallback((r: number, c: number) => {
    if (phase !== "place" || placingShipIdx >= SHIPS.length) return;
    const len = SHIPS[placingShipIdx];
    const cells: [number,number][] = [];
    let ok = true;
    for (let i = 0; i < len; i++) {
      const nr = r + (horizontal ? 0 : i), nc = c + (horizontal ? i : 0);
      if (nr >= 10 || nc >= 10 || playerBoard[nr][nc] !== "empty") { ok = false; break; }
      cells.push([nr, nc]);
    }
    if (!ok) return;
    const nb = playerBoard.map(row => [...row]) as Cell[][];
    for (const [nr, nc] of cells) nb[nr][nc] = "ship";
    setPlayerBoard(nb);
    setPlayerShipPositions(prev => [...prev, cells]);
    const nextIdx = placingShipIdx + 1;
    setPlacingShipIdx(nextIdx);
    if (nextIdx >= SHIPS.length) { setStatus("All ships placed! Starting battle..."); setTimeout(startBattle, 800); }
    else setStatus(`Place your ${SHIP_NAMES[nextIdx]} (${SHIPS[nextIdx]} cells)`);
  }, [phase, placingShipIdx, horizontal, playerBoard, startBattle]);

  const playerFire = useCallback((r: number, c: number) => {
    if (phase !== "battle" || !isActive) return;
    if (aiBoard[r][c] === "hit" || aiBoard[r][c] === "miss" || aiBoard[r][c] === "sunk") return;

    const nb = aiBoard.map(row => [...row]) as Cell[][];
    const hit = aiShipPositions.some(ship => ship.some(([sr, sc]) => sr === r && sc === c));
    nb[r][c] = hit ? "hit" : "miss";

    let ns = score;
    if (hit) {
      // Check sunk
      for (const ship of aiShipPositions) {
        if (ship.some(([sr, sc]) => sr === r && sc === c)) {
          const sunk = ship.every(([sr, sc]) => nb[sr][sc] === "hit" || (sr === r && sc === c));
          if (sunk) {
            for (const [sr2, sc2] of ship) nb[sr2][sc2] = "sunk";
            ns += 100;
            setScore(ns);
            onScoreUpdate(ns);
          }
        }
      }
    }
    setAiBoard(nb);

    const allSunk = aiShipPositions.every(ship => ship.every(([sr, sc]) => nb[sr][sc] === "sunk" || nb[sr][sc] === "hit"));
    if (allSunk) { setPhase("over"); setStatus("YOU WIN! 🎉"); onGameOver(ns); return; }

    // AI turn
    setTimeout(() => {
      const ai = aiHits;
      let tr = -1, tc = -1;
      if (ai.length > 0 && Math.random() > 0.4) {
        const last = ai[ai.length - 1];
        const neighbors = [[-1,0],[1,0],[0,-1],[0,1]].map(([dr,dc]) => [last[0]+dr, last[1]+dc] as [number,number]).filter(([ar,ac]) => ar>=0&&ar<10&&ac>=0&&ac<10&&playerBoard[ar][ac]!=="hit"&&playerBoard[ar][ac]!=="miss");
        if (neighbors.length > 0) { const n = neighbors[Math.floor(Math.random()*neighbors.length)]; tr = n[0]; tc = n[1]; }
      }
      if (tr < 0) {
        do { tr = Math.floor(Math.random()*10); tc = Math.floor(Math.random()*10); } while (playerBoard[tr][tc]==="hit"||playerBoard[tr][tc]==="miss");
      }
      const pb = playerBoard.map(row => [...row]) as Cell[][];
      const phit = playerShipPositions.some(ship => ship.some(([sr,sc]) => sr===tr&&sc===tc));
      pb[tr][tc] = phit ? "hit" : "miss";
      if (phit) setAiHits(prev => [...prev, [tr, tc]]);
      setPlayerBoard(pb);
      const pAllSunk = playerShipPositions.every(ship => ship.every(([sr,sc]) => pb[sr][sc]==="hit"));
      if (pAllSunk) { setPhase("over"); setStatus("AI WINS!"); onGameOver(ns); }
      else setStatus("YOUR TURN");
    }, 800);
  }, [phase, aiBoard, aiShipPositions, playerBoard, playerShipPositions, aiHits, score, isActive, onGameOver, onScoreUpdate]);

  const CELL = 28;
  const cellColor = (c: Cell, isAi: boolean) => {
    if (c === "hit") return "#ff4444"; if (c === "sunk") return "#ff2d8e";
    if (c === "miss") return "rgba(0,245,255,0.15)";
    if (c === "ship" && !isAi) return "rgba(57,255,20,0.3)";
    return "rgba(0,30,60,0.5)";
  };

  const getHoverCells = () => {
    if (!hoveredCell || phase !== "place") return new Set<string>();
    const [r, c] = hoveredCell;
    const len = SHIPS[placingShipIdx];
    const s = new Set<string>();
    for (let i = 0; i < len; i++) {
      const nr = r + (horizontal ? 0 : i), nc = c + (horizontal ? i : 0);
      if (nr < 10 && nc < 10) s.add(`${nr},${nc}`);
    }
    return s;
  };
  const hoverSet = getHoverCells();

  const reset = () => {
    setPhase("place"); setPlayerBoard(Array(10).fill(null).map(() => Array(10).fill("empty")));
    setAiBoard(Array(10).fill(null).map(() => Array(10).fill("empty"))); setAiShipPositions([]);
    setPlayerShipPositions([]); setPlacingShipIdx(0); setHorizontal(true); setScore(0);
    setAiHits([]); setStatus("Place your ships");
  };

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="font-arcade text-[10px]" style={{ color: "#00f5ff", minHeight: 18 }}>{status}</div>
      {phase === "place" && (
        <div className="flex gap-2 mb-1">
          <span className="font-mono-tech text-xs" style={{ color: "#fff200" }}>Ship: {SHIP_NAMES[placingShipIdx]} ({SHIPS[placingShipIdx]})</span>
          <button type="button" onClick={() => setHorizontal(h => !h)} className="font-arcade text-[9px] px-2 py-1 rounded" style={{ background: "transparent", color: "#bf5fff", border: "1px solid #bf5fff" }}>
            {horizontal ? "→ H" : "↓ V"}
          </button>
        </div>
      )}
      <div className="flex gap-6">
        {/* Player board */}
        <div>
          <div className="font-arcade text-[9px] mb-1 text-center" style={{ color: "#39ff14" }}>YOUR FLEET</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(10, ${CELL}px)`, gap: 1, background: "rgba(57,255,20,0.1)", padding: 4, borderRadius: 4 }}>
            {playerBoard.map((row, r) => row.map((cell, c) => (
              <button type="button" key={`pb-${r}-${c}`}
                onClick={() => phase === "place" && placePlayerShip(r, c)}
                onMouseEnter={() => setHoveredCell([r, c])}
                onMouseLeave={() => setHoveredCell(null)}
                style={{ width: CELL, height: CELL, padding: 0, background: hoverSet.has(`${r},${c}`) && phase==="place" ? "rgba(57,255,20,0.4)" : cellColor(cell, false), border: "1px solid rgba(57,255,20,0.2)", cursor: phase==="place" ? "pointer" : "default" }}
              />
            )))}
          </div>
        </div>
        {/* AI board */}
        <div>
          <div className="font-arcade text-[9px] mb-1 text-center" style={{ color: "#ff4444" }}>ENEMY WATERS</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(10, ${CELL}px)`, gap: 1, background: "rgba(0,30,60,0.5)", padding: 4, borderRadius: 4 }}>
            {aiBoard.map((row, r) => row.map((cell, c) => (
              <button type="button" key={`ab-${r}-${c}`}
                onClick={() => playerFire(r, c)}
                style={{ width: CELL, height: CELL, padding: 0, background: cellColor(cell, true), border: "1px solid rgba(0,100,200,0.2)", cursor: phase==="battle" && cell==="empty" ? "crosshair" : "default", fontSize: 10 }}>
                {cell === "hit" ? "💥" : cell === "sunk" ? "🔴" : cell === "miss" ? "●" : ""}
              </button>
            )))}
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <span className="font-mono-tech text-xs" style={{ color: "#ff2d8e" }}>Score: {score}</span>
        <button type="button" onClick={reset} className="font-arcade text-[9px] px-3 py-1 rounded" style={{ background: "transparent", color: "#00f5ff", border: "1px solid #00f5ff" }}>NEW</button>
      </div>
    </div>
  );
}
