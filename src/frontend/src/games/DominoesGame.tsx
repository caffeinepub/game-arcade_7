import { useState, useCallback } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

interface Domino { id: number; a: number; b: number; }
interface ChainEnd { value: number; }

function createSet(): Domino[] {
  const d: Domino[] = [];
  let id = 0;
  for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) d.push({ id: id++, a, b });
  return d.sort(() => Math.random() - 0.5);
}

function pipDisplay(n: number): string {
  const patterns = ["","•","• •","• •\n •","• •\n• •","• •\n •\n• •","• •\n• •\n• •"];
  return patterns[n] || String(n);
}

export default function DominoesGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [hand, setHand] = useState<Domino[]>([]);
  const [aiHand, setAiHand] = useState<Domino[]>([]);
  const [chain, setChain] = useState<Domino[]>([]);
  const [stock, setStock] = useState<Domino[]>([]);
  const [leftEnd, setLeftEnd] = useState<number | null>(null);
  const [rightEnd, setRightEnd] = useState<number | null>(null);
  const [turn, setTurn] = useState<"player" | "ai" | null>(null);
  const [status, setStatus] = useState("Press START to play");
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const startGame = useCallback(() => {
    const set = createSet();
    const ph = set.slice(0, 7);
    const ah = set.slice(7, 14);
    const st = set.slice(14);
    setHand(ph); setAiHand(ah); setStock(st); setChain([]); setLeftEnd(null); setRightEnd(null);
    setTurn("player"); setStatus("YOUR TURN — place a domino"); setGameOver(false); setScore(0);
  }, []);

  const canPlay = (d: Domino, left: number | null, right: number | null) => {
    if (left === null) return true;
    return d.a === left || d.b === left || d.a === right! || d.b === right!;
  };

  const playDomino = useCallback((d: Domino, side: "left" | "right") => {
    if (leftEnd === null) {
      setChain([d]);
      setLeftEnd(d.a); setRightEnd(d.b);
      setHand(prev => prev.filter(x => x.id !== d.id));
      doAiTurn([d], d.a, d.b, hand.filter(x => x.id !== d.id), aiHand, stock);
      return;
    }
    const nc = [...chain];
    let nl = leftEnd!, nr = rightEnd!;
    if (side === "left") {
      if (d.b === leftEnd) { nc.unshift(d); nl = d.a; }
      else if (d.a === leftEnd) { nc.unshift({ ...d, a: d.b, b: d.a }); nl = d.b; }
      else return;
    } else {
      if (d.a === rightEnd) { nc.push(d); nr = d.b; }
      else if (d.b === rightEnd) { nc.push({ ...d, a: d.b, b: d.a }); nr = d.a; }
      else return;
    }
    const nh = hand.filter(x => x.id !== d.id);
    setChain(nc); setLeftEnd(nl); setRightEnd(nr); setHand(nh);
    if (nh.length === 0) {
      const pts = aiHand.reduce((s, x) => s + x.a + x.b, 0);
      setScore(pts); onScoreUpdate(pts); setGameOver(true); setStatus(`YOU WIN! +${pts} pts`);
      onGameOver(pts); return;
    }
    doAiTurn(nc, nl, nr, nh, aiHand, stock);
  }, [chain, leftEnd, rightEnd, hand, aiHand, stock, onGameOver, onScoreUpdate]);

  const doAiTurn = (ch: Domino[], le: number | null, re: number | null, ph: Domino[], ah: Domino[], st: Domino[]) => {
    setTurn("ai"); setStatus("AI THINKING...");
    setTimeout(() => {
      let playable = ah.find(d => canPlay(d, le, re));
      let curAh = [...ah], curSt = [...st];
      while (!playable && curSt.length > 0) {
        const drawn = curSt.pop()!;
        curAh.push(drawn);
        if (canPlay(drawn, le, re)) { playable = drawn; break; }
      }
      if (!playable) {
        setAiHand(curAh); setStock(curSt); setTurn("player"); setStatus("AI PASSED — YOUR TURN");
        return;
      }
      let nc = [...ch]; let nl = le!, nr = re!;
      if (le === null) { nc = [playable]; nl = playable.a; nr = playable.b; }
      else if (playable.a === re || playable.b === re) {
        if (playable.a === re) { nc.push(playable); nr = playable.b; }
        else { nc.push({ ...playable, a: playable.b, b: playable.a }); nr = playable.a; }
      } else {
        if (playable.b === le) { nc.unshift(playable); nl = playable.a; }
        else { nc.unshift({ ...playable, a: playable.b, b: playable.a }); nl = playable.b; }
      }
      curAh = curAh.filter(x => x.id !== playable!.id);
      setChain(nc); setLeftEnd(nl); setRightEnd(nr); setAiHand(curAh); setStock(curSt);
      if (curAh.length === 0) {
        const pts = ph.reduce((s, x) => s + x.a + x.b, 0);
        setScore(pts); setGameOver(true); setStatus(`AI WINS! You had ${pts} pips`);
        onGameOver(0); return;
      }
      setTurn("player"); setStatus("YOUR TURN");
    }, 800);
  };

  const drawFromStock = useCallback(() => {
    if (stock.length === 0) { setStatus("No tiles to draw!"); return; }
    const drawn = stock[stock.length - 1];
    setStock(prev => prev.slice(0, -1)); setHand(prev => [...prev, drawn]);
  }, [stock]);

  const DWIDTH = 48, DHEIGHT = 28;

  const DominoTile = ({ d, onClick, selected }: { d: Domino; onClick?: () => void; selected?: boolean }) => (
    <button type="button" onClick={onClick}
      style={{
        width: DWIDTH * 2 + 4, height: DHEIGHT,
        background: selected ? "rgba(255,242,0,0.2)" : "rgba(20,20,30,0.9)",
        border: `1px solid ${selected ? "#fff200" : "rgba(255,255,255,0.2)"}`,
        borderRadius: 4, cursor: onClick ? "pointer" : "default",
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 2, fontSize: 11, fontWeight: "bold", color: "#fff",
        flexShrink: 0, padding: 0,
      }}>
      <span style={{ width: DWIDTH, textAlign: "center" }}>{d.a}</span>
      <span style={{ color: "rgba(255,255,255,0.3)" }}>|</span>
      <span style={{ width: DWIDTH, textAlign: "center" }}>{d.b}</span>
    </button>
  );

  const playableDominos = hand.filter(d => canPlay(d, leftEnd, rightEnd));

  return (
    <div className="flex flex-col items-center gap-3 select-none" style={{ maxWidth: 600 }}>
      <div className="font-arcade text-[10px]" style={{ color: "#fff200" }}>{status}</div>

      {/* Chain */}
      <div style={{ background: "rgba(255,242,0,0.05)", border: "1px solid rgba(255,242,0,0.2)", borderRadius: 4, padding: 8, minHeight: 50, width: "100%", overflowX: "auto", display: "flex", alignItems: "center", gap: 2 }}>
        {chain.length === 0 ? <span className="font-mono-tech text-xs mx-auto" style={{ color: "rgba(255,255,255,0.3)" }}>Chain will appear here</span> : null}
        {chain.slice(-6).map(d => <DominoTile key={`ch-${d.id}`} d={d} />)}
        {chain.length > 6 && <span className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>...</span>}
        {chain.length > 0 && <span className="font-arcade text-[9px] ml-2" style={{ color: "#00f5ff" }}>[{leftEnd}...{rightEnd}]</span>}
      </div>

      {/* Player hand */}
      <div>
        <div className="font-arcade text-[9px] mb-2" style={{ color: "#39ff14" }}>YOUR HAND ({hand.length})</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {hand.map(d => {
            const canL = leftEnd !== null && (d.a === leftEnd || d.b === leftEnd);
            const canR = rightEnd !== null && (d.a === rightEnd || d.b === rightEnd);
            const isFirst = leftEnd === null;
            return (
              <div key={`h-${d.id}`} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <DominoTile d={d} selected={canPlay(d, leftEnd, rightEnd)} />
                {turn === "player" && !gameOver && (isFirst || canL || canR) && (
                  <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                    {(isFirst || canL) && <button type="button" onClick={() => playDomino(d, "left")} className="font-arcade text-[8px] px-1 py-0.5" style={{ background: "transparent", color: "#ff2d8e", border: "1px solid #ff2d8e", borderRadius: 2 }}>←L</button>}
                    {(isFirst || canR) && !isFirst && <button type="button" onClick={() => playDomino(d, "right")} className="font-arcade text-[8px] px-1 py-0.5" style={{ background: "transparent", color: "#39ff14", border: "1px solid #39ff14", borderRadius: 2 }}>R→</button>}
                    {isFirst && <button type="button" onClick={() => playDomino(d, "left")} className="font-arcade text-[8px] px-1 py-0.5" style={{ background: "transparent", color: "#39ff14", border: "1px solid #39ff14", borderRadius: 2 }}>PLAY</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 items-center">
        {!turn && <button type="button" onClick={startGame} className="font-arcade text-[10px] px-4 py-2 rounded" style={{ background: "transparent", color: "#00f5ff", border: "1px solid #00f5ff" }}>START</button>}
        {turn === "player" && !gameOver && playableDominos.length === 0 && stock.length > 0 && (
          <button type="button" onClick={drawFromStock} className="font-arcade text-[9px] px-3 py-1 rounded" style={{ background: "transparent", color: "#bf5fff", border: "1px solid #bf5fff" }}>DRAW</button>
        )}
        {turn && <button type="button" onClick={startGame} className="font-arcade text-[9px] px-3 py-1 rounded" style={{ background: "transparent", color: "#39ff14", border: "1px solid #39ff14" }}>NEW</button>}
        <span className="font-mono-tech text-xs" style={{ color: "#ff2d8e" }}>Score: {score}</span>
      </div>
    </div>
  );
}
