import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

// 24 positions for Nine Men's Morris
// Mills: groups of 3 that form a "mill"
const MILLS = [
  [0,1,2],[3,4,5],[6,7,8],[9,10,11],[12,13,14],[15,16,17],[18,19,20],[21,22,23],
  [0,9,21],[3,10,18],[6,11,15],[1,4,7],[16,19,22],[8,12,20],[5,13,23],[2,14,17],
] as const;

const ADJACENT: number[][] = [
  [1,9],[0,2,4],[1,14],[3,4,10],[1,3,5,7],[4,13],[7,11],[4,6,8],[5,12],[0,10,21],[3,9,11,18],[6,10,15],[8,13,20],[5,12,14,23],[2,13,17],[6,16,11],[13,15,17,19],[14,16,23],[3,10,19],[16,18,20,22],[8,12,19],[0,9,22],[19,21,23],[5,14,17,22],
];

type Stone = "W" | "B" | null; // W=player(white), B=AI(black)

function hasMill(board: Stone[], pos: number, color: Stone): boolean {
  return MILLS.some(mill => mill.includes(pos as never) && mill.every(p => board[p] === color));
}

function newMillFormed(oldBoard: Stone[], newBoard: Stone[], pos: number, color: Stone): boolean {
  if (hasMill(newBoard, pos, color) && !hasMill(oldBoard, pos, color)) return true;
  return false;
}

type Phase = "place" | "move" | "gameover";

export default function MorrisGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [board, setBoard] = useState<Stone[]>(Array(24).fill(null));
  const [phase, setPhase] = useState<Phase>("place");
  const [turn, setTurn] = useState<Stone>("W");
  const [wPlaced, setWPlaced] = useState(0);
  const [bPlaced, setBPlaced] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [mustRemove, setMustRemove] = useState<Stone | null>(null);
  const [status, setStatus] = useState("YOUR TURN — Place a white piece");
  const [score, setScore] = useState(0);
  const [wCount, setWCount] = useState(9);
  const [bCount, setBCount] = useState(9);
  const [captured, setCaptured] = useState(0);

  const doAiTurn = useCallback((b: Stone[], wp: number, bp: number, wc: number, bc: number) => {
    setStatus("AI THINKING...");
    setTimeout(() => {
      let nb = [...b];
      let didMill = false;
      if (bp < 9) {
        // Place phase
        const empty = nb.map((v, i) => v === null ? i : -1).filter(i => i >= 0);
        const pos = empty[Math.floor(Math.random() * empty.length)];
        nb[pos] = "B"; setBPlaced(bp + 1);
        didMill = newMillFormed(b, nb, pos, "B");
      } else {
        // Move phase
        const bPieces = nb.map((v, i) => v === "B" ? i : -1).filter(i => i >= 0);
        let moved = false;
        for (const from of bPieces.sort(() => Math.random() - 0.5)) {
          const adjs = ADJACENT[from].filter(to => nb[to] === null);
          if (adjs.length > 0) {
            const to = adjs[Math.floor(Math.random() * adjs.length)];
            const old = [...nb]; nb[from] = null; nb[to] = "B";
            didMill = newMillFormed(old, nb, to, "B");
            moved = true; break;
          }
        }
        if (!moved) { setStatus("AI HAS NO MOVES — AI LOSES!"); setPhase("gameover"); onGameOver(score); return; }
      }
      if (didMill) {
        // Remove a white piece
        const wPieces = nb.map((v, i) => v === "W" ? i : -1).filter(i => i >= 0);
        const remove = wPieces[Math.floor(Math.random() * wPieces.length)];
        nb[remove] = null;
        const newWc = wc - 1;
        setWCount(newWc);
        if (newWc <= 2 && wp >= 9) { setBoard(nb); setPhase("gameover"); setStatus("AI WINS!"); onGameOver(score); return; }
      }
      setBoard(nb);
      const nextPhase = wp >= 9 && bp + 1 >= 9 ? "move" : "place";
      setPhase(nextPhase);
      setTurn("W"); setStatus("YOUR TURN");
    }, 800);
  }, [score, onGameOver]);

  const handleClick = useCallback((pos: number) => {
    if (!isActive || phase === "gameover" || turn !== "W") return;

    if (mustRemove) {
      // Remove opponent's piece
      if (board[pos] !== mustRemove) return;
      const nb = [...board]; nb[pos] = null;
      const newBc = bCount - 1;
      setBCount(newBc);
      setCaptured(c => { const nc = c + 1; setScore(nc); onScoreUpdate(nc); return nc; });
      setMustRemove(null);
      if (newBc <= 2 && bPlaced >= 9) { setBoard(nb); setPhase("gameover"); setStatus("YOU WIN! 🎉"); onGameOver(captured + 1); return; }
      setBoard(nb);
      doAiTurn(nb, wPlaced, bPlaced, wCount, newBc);
      return;
    }

    if (phase === "place" && wPlaced < 9) {
      if (board[pos] !== null) return;
      const nb = [...board]; nb[pos] = "W";
      const newWp = wPlaced + 1;
      setWPlaced(newWp);
      const mill = newMillFormed(board, nb, pos, "W");
      setBoard(nb);
      if (mill) { setMustRemove("B"); setStatus("MILL! Remove an AI piece"); return; }
      doAiTurn(nb, newWp, bPlaced, wCount, bCount);
      return;
    }

    // Move phase
    if (selected === null) {
      if (board[pos] !== "W") return;
      setSelected(pos); setStatus("Click destination");
      return;
    }
    if (pos === selected) { setSelected(null); setStatus("YOUR TURN"); return; }
    if (!ADJACENT[selected].includes(pos) || board[pos] !== null) { setSelected(null); setStatus("Invalid — try again"); return; }
    const nb = [...board]; nb[selected] = null; nb[pos] = "W";
    const mill = newMillFormed(board, nb, pos, "W");
    setSelected(null); setBoard(nb);
    if (mill) { setMustRemove("B"); setStatus("MILL! Remove an AI piece"); return; }
    doAiTurn(nb, wPlaced, bPlaced, wCount, bCount);
  }, [board, phase, turn, selected, mustRemove, wPlaced, bPlaced, wCount, bCount, captured, isActive, doAiTurn, onGameOver, onScoreUpdate]);

  const reset = () => { setBoard(Array(24).fill(null)); setPhase("place"); setTurn("W"); setWPlaced(0); setBPlaced(0); setSelected(null); setMustRemove(null); setStatus("YOUR TURN — Place a white piece"); setScore(0); setWCount(9); setBCount(9); setCaptured(0); };

  // Board positions mapped to SVG coords
  const POSITIONS: [number,number][] = [
    [50,50],[250,50],[450,50],[100,150],[250,150],[400,150],[150,250],[250,250],[350,250],
    [50,250],[100,250],[150,250],[350,250],[400,250],[450,250],
    [150,250],[250,350],[350,350],[450,350],[400,350],[350,350],[150,350],[100,350],[50,350],
  ];
  // Simplified rectangular layout
  const POS: [number, number][] = [
    [0,0],[3,0],[6,0], [1,1],[3,1],[5,1], [2,2],[3,2],[4,2],
    [0,3],[1,3],[2,3], [4,3],[5,3],[6,3],
    [2,4],[3,4],[4,4], [1,5],[3,5],[5,5],
    [0,6],[3,6],[6,6],
  ];
  const SCALE = 50, OFF = 20;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="flex gap-6">
        <span className="font-arcade text-[9px]" style={{ color: "#fff" }}>⚪ {wCount}</span>
        <span className="font-arcade text-[10px]" style={{ color: "#fff200", maxWidth: 200, textAlign: "center" }}>{status}</span>
        <span className="font-arcade text-[9px]" style={{ color: "#00f5ff" }}>⚫ {bCount}</span>
      </div>

      <svg width={7*SCALE+2*OFF} height={7*SCALE+2*OFF} style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(191,95,255,0.2)", borderRadius: 4 }}>
        {/* Board lines */}
        {[[0,0,6,0],[0,6,6,6],[0,0,0,6],[6,0,6,6],[1,1,5,1],[1,5,5,5],[1,1,1,5],[5,1,5,5],[2,2,4,2],[2,4,4,4],[2,2,2,4],[4,2,4,4],[3,0,3,2],[3,4,3,6],[0,3,2,3],[4,3,6,3]].map(([x1,y1,x2,y2], li) => (
          <line key={`ml-${li}`} x1={x1*SCALE+OFF} y1={y1*SCALE+OFF} x2={x2*SCALE+OFF} y2={y2*SCALE+OFF} stroke="rgba(191,95,255,0.3)" strokeWidth={1.5}/>
        ))}
        {POS.map(([col, row], i) => {
          const stone = board[i];
          const isSelected = selected === i;
          const isValid = selected !== null && ADJACENT[selected]?.includes(i) && board[i] === null;
          const isRemovable = mustRemove && board[i] === mustRemove;
          return (
            <g key={`mp-${i}`} onClick={() => handleClick(i)} style={{ cursor: "pointer" }}>
              <circle cx={col*SCALE+OFF} cy={row*SCALE+OFF} r={14}
                fill={isSelected ? "rgba(255,242,0,0.3)" : isValid ? "rgba(57,255,20,0.2)" : isRemovable ? "rgba(255,68,68,0.3)" : "rgba(30,10,50,0.7)"}
                stroke={isSelected ? "#fff200" : isValid ? "#39ff14" : isRemovable ? "#ff4444" : "rgba(191,95,255,0.4)"}
                strokeWidth={2}/>
              {stone && <circle cx={col*SCALE+OFF} cy={row*SCALE+OFF} r={10} fill={stone==="W"?"radial-gradient(circle,#fff,#aaa)":"radial-gradient(circle,#444,#000)"} stroke={stone==="W"?"rgba(255,255,255,0.5)":"rgba(0,0,0,0.5)"} strokeWidth={1.5}/>}
              {stone && <text x={col*SCALE+OFF} y={row*SCALE+OFF+5} textAnchor="middle" fontSize={12} fill={stone==="W"?"#000":"#fff"}>{stone==="W"?"○":"●"}</text>}
            </g>
          );
        })}
      </svg>

      <div className="flex gap-3">
        <span className="font-mono-tech text-xs" style={{ color: "#ff2d8e" }}>Captured: {captured}</span>
        <button type="button" onClick={reset} className="font-arcade text-[9px] px-3 py-1 rounded" style={{ background: "transparent", color: "#39ff14", border: "1px solid #39ff14" }}>NEW</button>
      </div>
    </div>
  );
}
