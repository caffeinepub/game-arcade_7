import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const GRID = 5; // 5x5 dots = 4x4 boxes

// Edges: horizontal[row][col] (GRID rows × GRID-1 cols) and vertical[row][col] (GRID-1 rows × GRID cols)
interface GameState {
  horiz: boolean[][];
  vert: boolean[][];
  boxes: number[][]; // 0=unclaimed, 1=player, 2=AI
  playerScore: number;
  aiScore: number;
}

function initState(): GameState {
  return {
    horiz: Array(GRID).fill(null).map(() => Array(GRID-1).fill(false)),
    vert: Array(GRID-1).fill(null).map(() => Array(GRID).fill(false)),
    boxes: Array(GRID-1).fill(null).map(() => Array(GRID-1).fill(0)),
    playerScore: 0, aiScore: 0,
  };
}

function checkBoxes(s: GameState): { boxes: number[][]; newBoxes: number } {
  const boxes = s.boxes.map(r => [...r]);
  let newBoxes = 0;
  for (let r = 0; r < GRID-1; r++) for (let c = 0; c < GRID-1; c++) {
    if (boxes[r][c] === 0) {
      if (s.horiz[r][c] && s.horiz[r+1][c] && s.vert[r][c] && s.vert[r][c+1]) {
        boxes[r][c] = -1; // just completed, caller assigns color
        newBoxes++;
      }
    }
  }
  return { boxes, newBoxes };
}

function claimNewBoxes(s: GameState, color: number): { boxes: number[][]; count: number } {
  const boxes = s.boxes.map(r => [...r]);
  let count = 0;
  for (let r = 0; r < GRID-1; r++) for (let c = 0; c < GRID-1; c++) {
    if (boxes[r][c] === 0 && s.horiz[r][c] && s.horiz[r+1][c] && s.vert[r][c] && s.vert[r][c+1]) {
      boxes[r][c] = color; count++;
    }
  }
  return { boxes, count };
}

export default function DotsBoxesGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [state, setState] = useState<GameState>(() => initState());
  const [turn, setTurn] = useState<1|2>(1);
  const [gameOver, setGameOver] = useState(false);
  const [status, setStatus] = useState("YOUR TURN — click an edge");

  const checkEnd = useCallback((s: GameState, t: number) => {
    const total = s.playerScore + s.aiScore;
    if (total === (GRID-1) * (GRID-1)) {
      setGameOver(true);
      const ps = s.playerScore;
      setStatus(ps > s.aiScore ? `YOU WIN! ${ps}-${s.aiScore} 🎉` : ps < s.aiScore ? `AI WINS! ${s.aiScore}-${ps}` : `DRAW! ${ps}-${s.aiScore}`);
      onGameOver(ps);
    }
  }, [onGameOver]);

  const doAiTurn = useCallback((s: GameState) => {
    setStatus("AI THINKING...");
    setTimeout(() => {
      // Find edge that completes a box, else pick safe edge
      let best: { type: "horiz"|"vert"; r: number; c: number } | null = null;

      // Look for completing moves
      outer: for (let r = 0; r < GRID-1; r++) for (let c = 0; c < GRID-1; c++) {
        if (s.boxes[r][c] !== 0) continue;
        const edges = [{t:"horiz",r,c},{t:"horiz",r:r+1,c},{t:"vert",r,c},{t:"vert",r,c:c+1}] as const;
        const missing = edges.filter(e => e.t==="horiz" ? !s.horiz[e.r][e.c] : !s.vert[e.r][e.c]);
        if (missing.length === 1) { best = { type: missing[0].t, r: missing[0].r, c: missing[0].c }; break outer; }
      }

      // Otherwise random safe edge
      if (!best) {
        const allEdges: { type: "horiz"|"vert"; r: number; c: number }[] = [];
        for (let r = 0; r < GRID; r++) for (let c = 0; c < GRID-1; c++) if (!s.horiz[r][c]) allEdges.push({type:"horiz",r,c});
        for (let r = 0; r < GRID-1; r++) for (let c = 0; c < GRID; c++) if (!s.vert[r][c]) allEdges.push({type:"vert",r,c});
        if (allEdges.length === 0) return;
        best = allEdges[Math.floor(Math.random() * allEdges.length)];
      }

      const ns: GameState = { ...s, horiz: s.horiz.map(r2=>[...r2]), vert: s.vert.map(r2=>[...r2]), boxes: s.boxes.map(r2=>[...r2]) };
      if (best.type === "horiz") ns.horiz[best.r][best.c] = true;
      else ns.vert[best.r][best.c] = true;
      const { boxes: nb, count } = claimNewBoxes(ns, 2);
      ns.boxes = nb; ns.aiScore += count;
      setState(ns);
      if (count > 0) {
        // AI gets another turn
        checkEnd(ns, 2);
        if (!gameOver && ns.playerScore + ns.aiScore < (GRID-1)*(GRID-1)) {
          doAiTurn(ns); return;
        }
      } else {
        setTurn(1); setStatus("YOUR TURN");
      }
      checkEnd(ns, 2);
    }, 400);
  }, [gameOver, checkEnd]);

  const clickEdge = useCallback((type: "horiz"|"vert", r: number, c: number) => {
    if (!isActive || gameOver || turn !== 1) return;
    if (type === "horiz" && state.horiz[r][c]) return;
    if (type === "vert" && state.vert[r][c]) return;

    const ns: GameState = { ...state, horiz: state.horiz.map(r2=>[...r2]), vert: state.vert.map(r2=>[...r2]), boxes: state.boxes.map(r2=>[...r2]) };
    if (type === "horiz") ns.horiz[r][c] = true;
    else ns.vert[r][c] = true;
    const { boxes: nb, count } = claimNewBoxes(ns, 1);
    ns.boxes = nb; ns.playerScore += count;
    setState(ns); onScoreUpdate(ns.playerScore);
    checkEnd(ns, 1);
    if (count > 0 || gameOver) { setTurn(1); setStatus("YOUR TURN — box claimed!"); return; }
    setTurn(2);
    doAiTurn(ns);
  }, [state, turn, gameOver, isActive, checkEnd, doAiTurn, onScoreUpdate]);

  const SPACING = 54;
  const DOT = 8;

  const DotRow = ({ row }: { row: number }) => (
    <div style={{ display: "flex", alignItems: "center", height: DOT + 4 }}>
      {Array.from({length:GRID}, (_,c) => (
        <span key={`dot-r${row}c${c}`} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: DOT, height: DOT, borderRadius: "50%", background: "#fff200", boxShadow: "0 0 6px rgba(255,242,0,0.6)" }} />
          {c < GRID-1 && (
            <button type="button" onClick={() => clickEdge("horiz", row, c)}
              style={{ width: SPACING - DOT, height: 12, background: state.horiz[row][c] ? "rgba(0,245,255,0.6)" : "transparent", border: `2px solid ${state.horiz[row][c] ? "#00f5ff" : "rgba(255,255,255,0.1)"}`, borderRadius: 2, cursor: state.horiz[row][c] ? "default" : "pointer", padding: 0, margin: "0 1px" }} />
          )}
        </span>
      ))}
    </div>
  );

  const VertRow = ({ row }: { row: number }) => (
    <div style={{ display: "flex", alignItems: "stretch", height: SPACING - DOT - 4 }}>
      {Array.from({length:GRID}, (_,c) => (
        <span key={`vert-r${row}c${c}`} style={{ display: "flex", alignItems: "stretch" }}>
          <button type="button" onClick={() => clickEdge("vert", row, c)}
            style={{ width: 12, height: SPACING - DOT - 4, background: state.vert[row][c] ? "rgba(0,245,255,0.6)" : "transparent", border: `2px solid ${state.vert[row][c] ? "#00f5ff" : "rgba(255,255,255,0.1)"}`, borderRadius: 2, cursor: state.vert[row][c] ? "default" : "pointer", padding: 0, margin: "0 1px" }} />
          {c < GRID-1 && (
            <div style={{ width: SPACING - DOT - 4, display: "flex", alignItems: "center", justifyContent: "center", background: state.boxes[row][c] === 1 ? "rgba(57,255,20,0.2)" : state.boxes[row][c] === 2 ? "rgba(255,68,68,0.2)" : "transparent" }}>
              {state.boxes[row][c] !== 0 && <span style={{ fontSize: 16 }}>{state.boxes[row][c] === 1 ? "✦" : "✧"}</span>}
            </div>
          )}
        </span>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="flex gap-6">
        <span className="font-arcade text-[10px]" style={{ color: "#39ff14" }}>YOU ✦ {state.playerScore}</span>
        <span className="font-arcade text-[10px]" style={{ color: "#fff200" }}>{status}</span>
        <span className="font-arcade text-[10px]" style={{ color: "#ff4444" }}>AI ✧ {state.aiScore}</span>
      </div>

      <div style={{ padding: 12, background: "rgba(255,20,147,0.04)", border: "1px solid rgba(255,20,147,0.15)", borderRadius: 8 }}>
        {Array.from({length:GRID}, (_,r) => (
          <div key={`dr-${r}`}>
            <DotRow row={r} />
            {r < GRID-1 && <VertRow row={r} />}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={() => { setState(initState()); setTurn(1); setGameOver(false); setStatus("YOUR TURN — click an edge"); }}
          className="font-arcade text-[9px] px-3 py-1 rounded" style={{ background: "transparent", color: "#00f5ff", border: "1px solid #00f5ff" }}>NEW</button>
      </div>
    </div>
  );
}
