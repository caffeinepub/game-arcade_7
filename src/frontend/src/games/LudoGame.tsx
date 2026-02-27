import { useState, useCallback, useRef } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

const COLORS = ["red", "blue", "green", "yellow"] as const;
type Color = typeof COLORS[number];

const COLOR_STYLES: Record<Color, { bg: string; text: string; light: string }> = {
  red:    { bg: "#ff4444", text: "#fff", light: "rgba(255,68,68,0.15)" },
  blue:   { bg: "#00f5ff", text: "#0a0a0f", light: "rgba(0,245,255,0.15)" },
  green:  { bg: "#39ff14", text: "#0a0a0f", light: "rgba(57,255,20,0.15)" },
  yellow: { bg: "#fff200", text: "#0a0a0f", light: "rgba(255,242,0,0.15)" },
};

interface Token {
  id: number;
  pos: number; // -1=yard, 0-51=board path, 52-57=home stretch
  color: Color;
  finished: boolean;
}

const ENTRY: Record<Color, number> = { red: 0, blue: 13, green: 26, yellow: 39 };
const HOME_ENTRY: Record<Color, number> = { red: 51, blue: 12, green: 25, yellow: 38 };

function initTokens(): Token[] {
  return COLORS.flatMap((color, ci) =>
    Array(4).fill(null).map((_, i) => ({ id: ci * 4 + i, pos: -1, color, finished: false }))
  );
}

function canMove(token: Token, dice: number): boolean {
  if (token.finished) return false;
  if (token.pos === -1) return dice === 6;
  if (token.pos >= 52) return token.pos + dice <= 57;
  return true;
}

function applyMove(token: Token, dice: number): Token {
  if (!canMove(token, dice)) return token;
  if (token.pos === -1) return { ...token, pos: ENTRY[token.color] };

  let np = token.pos + dice;
  const he = HOME_ENTRY[token.color];

  if (token.pos < 52 && token.pos <= he && np > he) {
    np = 52 + (np - he - 1);
  } else if (token.pos < 52) {
    np = np % 52;
  }

  if (np > 57) return token;
  return { ...token, pos: np, finished: np === 57 };
}

export default function LudoGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [tokens, setTokens] = useState<Token[]>(initTokens);
  const [dice, setDice] = useState<number | null>(null);
  const [rolled, setRolled] = useState(false);
  const [message, setMessage] = useState("Roll the dice!");
  const [score, setScore] = useState(0);
  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;
  const scoreRef = useRef(score);
  scoreRef.current = score;

  const doAITurns = useCallback(() => {
    const aiColors: Color[] = ["blue", "green", "yellow"];
    let currentTokens = tokensRef.current;

    for (const aiColor of aiColors) {
      const d = Math.floor(Math.random() * 6) + 1;
      const movable = currentTokens.filter(t => t.color === aiColor && canMove(t, d));
      if (movable.length > 0) {
        const chosen = movable[0];
        currentTokens = currentTokens.map(t => t.id === chosen.id ? applyMove(t, d) : t);
      }
    }

    setTokens(currentTokens);
    setDice(null);
    setRolled(false);
    setMessage("Your turn — roll the dice!");

    const blueWon = currentTokens.filter(t => t.color === "blue" && t.finished).length === 4;
    if (blueWon) {
      setMessage("Blue wins! Game over.");
      onGameOver(scoreRef.current);
    }
  }, [onGameOver]);

  const rollDice = useCallback(() => {
    if (!isActive || rolled) return;
    const d = Math.floor(Math.random() * 6) + 1;
    setDice(d);
    setRolled(true);

    const movable = tokensRef.current.filter(t => t.color === "red" && canMove(t, d));
    if (movable.length === 0) {
      setMessage(`Rolled ${d} — no moves! AI's turn.`);
      setTimeout(() => doAITurns(), 1000);
    } else {
      setMessage(`Rolled ${d} — click a red token to move!`);
    }
  }, [isActive, rolled, doAITurns]);

  const handleTokenClick = useCallback((token: Token) => {
    if (!isActive || !rolled || token.color !== "red" || dice === null) return;
    if (!canMove(token, dice)) return;

    const newToken = applyMove(token, dice);
    const newTokens = tokens.map(t => t.id === token.id ? newToken : t);
    setTokens(newTokens);

    const finNow = newTokens.filter(t => t.color === "red" && t.finished).length;
    const newScore = finNow * 250;
    setScore(newScore);
    onScoreUpdate(newScore);

    if (finNow === 4) {
      setMessage("You win! All tokens home!");
      setTimeout(() => onGameOver(newScore + 500), 1000);
      return;
    }

    if (dice === 6) {
      setRolled(false);
      setDice(null);
      setMessage("Rolled 6 — roll again!");
    } else {
      setDice(null);
      setRolled(false);
      setMessage("AI is moving...");
      setTimeout(() => doAITurns(), 600);
    }
  }, [isActive, rolled, dice, tokens, onScoreUpdate, onGameOver, doAITurns]);

  const playerTokens = tokens.filter(t => t.color === "red");
  const finishedCount = playerTokens.filter(t => t.finished).length;

  return (
    <div className="flex flex-col items-center gap-5 p-4">
      <div className="font-arcade text-sm" style={{ color: "#fff200", textShadow: "0 0 12px #fff200" }}>
        LUDO
      </div>

      <div className="flex gap-8 items-center">
        {/* Token yards */}
        <div className="flex flex-col gap-4">
          {(["red", "blue"] as Color[]).map(color => (
            <div key={`yard-${color}`} className="flex flex-col gap-1.5">
              <div className="font-arcade text-[9px]" style={{ color: COLOR_STYLES[color].bg }}>
                {color.toUpperCase()}
              </div>
              <div className="flex gap-2">
                {tokens.filter(t => t.color === color).map(token => (
                  <button
                    key={`token-${token.id}`}
                    type="button"
                    onClick={() => handleTokenClick(token)}
                    className="w-10 h-10 rounded-full flex items-center justify-center font-arcade text-[10px] transition-all"
                    style={{
                      background: token.finished
                        ? "rgba(255,255,255,0.1)"
                        : token.pos === -1
                        ? COLOR_STYLES[color].light
                        : COLOR_STYLES[color].bg,
                      color: token.finished ? "rgba(255,255,255,0.3)" : token.pos === -1 ? COLOR_STYLES[color].bg : COLOR_STYLES[color].text,
                      border: `2px solid ${COLOR_STYLES[color].bg}`,
                      boxShadow:
                        color === "red" && rolled && dice !== null && canMove(token, dice)
                          ? `0 0 12px ${COLOR_STYLES[color].bg}, 0 0 20px ${COLOR_STYLES[color].bg}66`
                          : "none",
                      cursor: color === "red" && rolled && dice !== null && canMove(token, dice) ? "pointer" : "default",
                    }}
                  >
                    {token.finished ? "✓" : token.pos === -1 ? "⬤" : token.pos >= 52 ? `H${token.pos - 51}` : token.pos}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Dice + roll button */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl border-2 select-none"
            style={{
              background: dice ? "rgba(255,242,0,0.1)" : "rgba(255,255,255,0.05)",
              borderColor: dice ? "#fff200" : "rgba(255,255,255,0.15)",
              boxShadow: dice ? "0 0 20px rgba(255,242,0,0.3)" : "none",
            }}
          >
            {dice ? ["","⚀","⚁","⚂","⚃","⚄","⚅"][dice] : "?"}
          </div>

          <button
            type="button"
            onClick={rollDice}
            disabled={rolled || !isActive}
            className="font-arcade text-[10px] px-5 py-2.5 rounded transition-all"
            style={{
              background: !rolled ? "rgba(255,242,0,0.15)" : "rgba(255,255,255,0.05)",
              color: !rolled ? "#fff200" : "rgba(255,255,255,0.3)",
              border: `1px solid ${!rolled ? "#fff200" : "rgba(255,255,255,0.15)"}`,
              boxShadow: !rolled ? "0 0 10px rgba(255,242,0,0.2)" : "none",
              cursor: !rolled ? "pointer" : "not-allowed",
            }}
          >
            ROLL DICE
          </button>
        </div>

        {/* More token yards */}
        <div className="flex flex-col gap-4">
          {(["green", "yellow"] as Color[]).map(color => (
            <div key={`yard2-${color}`} className="flex flex-col gap-1.5">
              <div className="font-arcade text-[9px]" style={{ color: COLOR_STYLES[color].bg }}>
                {color.toUpperCase()}
              </div>
              <div className="flex gap-2">
                {tokens.filter(t => t.color === color).map(token => (
                  <div
                    key={`token2-${token.id}`}
                    className="w-10 h-10 rounded-full flex items-center justify-center font-arcade text-[10px]"
                    style={{
                      background: token.finished
                        ? "rgba(255,255,255,0.1)"
                        : token.pos === -1
                        ? COLOR_STYLES[color].light
                        : COLOR_STYLES[color].bg,
                      color: token.finished ? "rgba(255,255,255,0.3)" : token.pos === -1 ? COLOR_STYLES[color].bg : COLOR_STYLES[color].text,
                      border: `2px solid ${COLOR_STYLES[color].bg}`,
                    }}
                  >
                    {token.finished ? "✓" : token.pos === -1 ? "⬤" : token.pos >= 52 ? `H${token.pos - 51}` : token.pos}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="font-arcade text-[10px] px-4 py-2 rounded"
        style={{ color: "#00f5ff", background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.2)" }}
      >
        {message}
      </div>

      <div className="flex gap-6 font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
        <span>Red tokens home: {finishedCount}/4</span>
        <span>Score: {score}</span>
      </div>

      <p className="font-mono-tech text-xs text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
        You are RED. Roll dice, then click your token to move. Roll 6 to enter board or roll again.
      </p>
    </div>
  );
}
