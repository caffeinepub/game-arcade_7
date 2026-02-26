import { useState, useCallback, useEffect } from "react";

interface Props {
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  isActive: boolean;
}

// Common 3+ letter words for validation (simplified dictionary)
const VALID_WORDS = new Set([
  "ACE","ACT","ADD","AGO","AID","AIM","AIR","ALL","AND","ANT","APE","APP","ARC","ARE","ARK","ARM","ART","ASH","ASK","ATE",
  "BAD","BAG","BAN","BAR","BAT","BED","BIG","BIT","BOW","BOX","BOY","BUD","BUG","BUS","BUT","BUY",
  "CAB","CAN","CAP","CAR","CAT","COB","COD","COG","COP","COT","COW","CUB","CUP","CUT",
  "DAB","DAD","DAM","DEN","DID","DIG","DIM","DIP","DOC","DOE","DOG","DOT","DRY","DUB","DUG","DUO","DUE",
  "EAR","EAT","EEL","EGG","ELK","ELM","EMU","END","ERA","EVE","EWE","EYE",
  "FAD","FAN","FAR","FAT","FEW","FIG","FIN","FIT","FLY","FOB","FOG","FOR","FOX","FRY","FUN","FUR",
  "GAB","GAG","GAP","GAS","GEM","GET","GOB","GOD","GOT","GUM","GUN","GUT","GUY",
  "HAD","HAM","HAS","HAT","HEN","HER","HIM","HIP","HIS","HIT","HOB","HOG","HOP","HOT","HOW","HUB","HUG","HUM","HUT",
  "ICE","ILL","INN","IRS","ITS",
  "JAB","JAM","JAR","JAW","JAY","JET","JIG","JOB","JOG","JOT","JOY","JUG","JUT",
  "KEG","KID","KIN","KIT",
  "LAB","LAD","LAP","LAW","LAX","LAY","LEG","LET","LID","LIP","LIT","LOG","LOW","LUG",
  "MAD","MAN","MAP","MAR","MAT","MAW","MEN","MID","MIX","MOB","MOP","MUD","MUG","MUM",
  "NAB","NAG","NAP","NET","NIB","NIT","NOB","NOD","NOR","NOT","NOW","NUB","NUN","NUT",
  "OAK","OAR","OAT","ODD","ODE","OFT","OHM","OPT","ORB","ORE","OUR","OUT","OWE","OWL","OWN",
  "PAD","PAL","PAN","PAP","PAR","PAT","PAW","PAY","PEA","PEG","PEN","PEP","PER","PET","PIE","PIG","PIN","PIT","PLY","POD","POP","POT","POW","PRY","PUB","PUG","PUN","PUP","PUS","PUT",
  "RAG","RAN","RAP","RAT","RAW","RAY","RED","REF","RIB","RID","RIG","RIM","RIP","ROB","ROD","ROT","ROW","RUB","RUG","RUN","RUT",
  "SAC","SAD","SAG","SAP","SAT","SAW","SAY","SET","SEW","SHY","SIN","SIP","SIR","SIT","SKI","SKY","SLY","SOB","SOD","SON","SOP","SOT","SOW","SOY","SPA","SPY","STY","SUB","SUE","SUM","SUN",
  "TAB","TAN","TAP","TAR","TAT","TAX","TEA","TEN","THE","TIE","TIN","TIP","TOD","TON","TOO","TOP","TOT","TOW","TOY","TUB","TUG","TUN",
  "URN","USE",
  "VAN","VAT","VET","VIA","VIE","VOW",
  "WAD","WAR","WAS","WAX","WAY","WEB","WED","WET","WHO","WHY","WIG","WIN","WIT","WOE","WOK","WON","WOO","WOW",
  "YAK","YAM","YAP","YAW","YEA","YEW","YIN","YOU",
  "ZAP","ZEN","ZIT","ZOO",
  // Some longer words
  "ABLE","ACID","AGED","ALSO","ARCH","AREA","ARMY","AUTO",
  "BABY","BACK","BAIL","BAIT","BAKE","BALD","BALL","BAND","BANG","BANK","BARE","BARN","BASE","BASH","BASK","BATH","BEAD","BEAM","BEAN","BEAR","BEAT","BEEN","BEER","BELL","BELT","BEND","BEST","BIKE","BILL","BIND","BIRD","BITE","BLOW","BLUE","BLUR","BOAT","BOLT","BONE","BOOK","BOOM","BOOT","BORE","BORN","BOTH","BOUT","BOWL","BRAG","BRAN","BRAT","BREW","BRIM","BROW","BUMP","BUNG","BUNK","BURP","BURN","BURR","BUSH","BUSY",
  "CAFE","CAGE","CAKE","CALF","CALL","CALM","CAME","CAMP","CANE","CAPE","CARE","CART","CASE","CASH","CAST","CAVE","CELL","CENT","CHAT","CHEF","CHIP","CHOP","CLAP","CLAW","CLAY","CLIP","CLOD","CLOG","CLUB","CLUE","COAL","COAT","COIL","COLD","COME","CONE","COOK","COOL","COPE","CORD","CORE","CORN","COST","COZY","CRAB","CRAM","CROP","CROW","CRUD","CUBE","CUFF","CURE","CURL","CUTE",
  "DAMP","DARE","DARK","DART","DASH","DATE","DAWN","DAYS","DEAD","DEAL","DEAR","DECK","DEEP","DEER","DENY","DIAL","DICE","DIME","DINE","DIRT","DISH","DISK","DIVE","DOCK","DOME","DONE","DOOM","DOOR","DOSE","DOVE","DOWN","DRAG","DRAW","DRIP","DROP","DRUG","DRUM","DUCK","DULL","DUMB","DUMP","DUNE","DUSK","DUST","DUTY",
  "EACH","EDGE","ELSE","EMIT","EPIC","EVEN","EVER","EVIL","EXAM",
  "FACE","FACT","FADE","FAIL","FAIR","FAKE","FALL","FAME","FARM","FAST","FATE","FEEL","FEET","FELL","FELT","FEND","FERN","FIFE","FILE","FILL","FILM","FINE","FIRE","FIRM","FISH","FIST","FLAG","FLAT","FLAW","FLEA","FLEW","FLEX","FLIP","FLIT","FLOG","FLOW","FOAM","FOLD","FOND","FONT","FOOT","FORD","FORE","FORK","FORM","FOUL","FOUR","FREE","FROG","FROM","FUEL","FULL","FUME","FUND","FUSS",
  "GAIN","GALE","GANG","GAPE","GATE","GAVE","GEAR","GUST","GATE","GIVE","GLAD","GLAND","GLEE","GLEN","GLOW","GLUE","GOAL","GOAD","GOAT","GOLD","GOLF","GONE","GORE","GORGE","GOWN","GRAB","GRAD","GRAY","GREW","GRIN","GRIP","GRIT","GROW","GULF","GULL","GULP","GUST","GUTS",
]);

function generateBoard(): string[] {
  const COMMON = "ETAOINSHRDLUCMFWYPVBGKJQXZ";
  return Array.from({ length: 16 }, () => COMMON[Math.floor(Math.random() * Math.min(COMMON.length, 18))]);
}

function isAdjacent(a: number, b: number): boolean {
  const ar = Math.floor(a / 4), ac = a % 4;
  const br = Math.floor(b / 4), bc = b % 4;
  return Math.abs(ar - br) <= 1 && Math.abs(ac - bc) <= 1 && a !== b;
}

export default function BoggleGame({ onGameOver, onScoreUpdate, isActive }: Props) {
  const [board] = useState<string[]>(() => generateBoard());
  const [path, setPath] = useState<number[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [gameOver, setGameOver] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    if (gameOver) return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(id); setGameOver(true); onGameOver(score); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [gameOver, score, onGameOver]);

  const currentWord = path.map(i => board[i]).join("");

  const handleClick = useCallback((idx: number) => {
    if (!isActive || gameOver) return;
    if (path.includes(idx)) {
      if (path[path.length - 1] === idx && path.length > 1) {
        // Submit word on re-click last
        const word = currentWord;
        if (word.length >= 3 && VALID_WORDS.has(word) && !foundWords.includes(word)) {
          const pts = word.length * 10;
          const ns = score + pts;
          setFoundWords(prev => [...prev, word]); setScore(ns); onScoreUpdate(ns);
          setFlash(`+${pts} ${word}`); setTimeout(() => setFlash(""), 800);
        } else {
          setFlash(word.length < 3 ? "TOO SHORT" : !VALID_WORDS.has(word) ? "NOT A WORD" : "ALREADY FOUND");
          setTimeout(() => setFlash(""), 800);
        }
        setPath([]);
      }
      return;
    }
    if (path.length === 0 || isAdjacent(path[path.length - 1], idx)) {
      setPath(prev => [...prev, idx]);
    }
  }, [path, currentWord, foundWords, score, isActive, gameOver, onScoreUpdate]);

  const submitWord = () => {
    if (currentWord.length >= 3 && VALID_WORDS.has(currentWord) && !foundWords.includes(currentWord)) {
      const pts = currentWord.length * 10;
      const ns = score + pts;
      setFoundWords(prev => [...prev, currentWord]); setScore(ns); onScoreUpdate(ns);
      setFlash(`+${pts} ${currentWord}`); setTimeout(() => setFlash(""), 800);
    } else {
      setFlash(!VALID_WORDS.has(currentWord) ? "NOT A WORD" : "ALREADY FOUND");
      setTimeout(() => setFlash(""), 800);
    }
    setPath([]);
  };

  const CELL = 60;
  const timeColor = timeLeft > 30 ? "#39ff14" : timeLeft > 10 ? "#fff200" : "#ff4444";

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div className="flex gap-6 items-center">
        <span className="font-arcade text-sm" style={{ color: timeColor, textShadow: `0 0 10px ${timeColor}` }}>⏱ {timeLeft}s</span>
        <span className="font-arcade text-xs" style={{ color: "#bf5fff" }}>Score: {score}</span>
        <span className="font-arcade text-[10px]" style={{ color: "#39ff14", minWidth: 100 }}>{flash || currentWord}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(4, ${CELL}px)`, gap: 4, padding: 8, background: "rgba(191,95,255,0.05)", border: "1px solid rgba(191,95,255,0.2)", borderRadius: 6 }}>
        {board.map((letter, i) => {
          const inPath = path.includes(i);
          const isLast = path[path.length - 1] === i;
          return (
            <button type="button" key={`bog-${i}`} onClick={() => handleClick(i)}
              style={{
                width: CELL, height: CELL, fontSize: 24, fontWeight: "bold",
                background: isLast ? "rgba(255,242,0,0.3)" : inPath ? "rgba(191,95,255,0.35)" : "rgba(30,15,50,0.8)",
                border: `2px solid ${isLast ? "#fff200" : inPath ? "#bf5fff" : "rgba(191,95,255,0.3)"}`,
                borderRadius: 8, cursor: "pointer",
                color: inPath ? "#fff" : "#bf5fff",
                fontFamily: "'Orbitron', sans-serif",
                boxShadow: inPath ? `0 0 12px rgba(191,95,255,0.6)` : "none",
              }}>
              {letter}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        {path.length > 0 && (
          <>
            <button type="button" onClick={submitWord} className="font-arcade text-[9px] px-3 py-1.5 rounded" style={{ background: "transparent", color: "#39ff14", border: "1px solid #39ff14" }}>SUBMIT</button>
            <button type="button" onClick={() => setPath([])} className="font-arcade text-[9px] px-3 py-1.5 rounded" style={{ background: "transparent", color: "#ff4444", border: "1px solid #ff4444" }}>CLEAR</button>
          </>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 300, justifyContent: "center" }}>
        {foundWords.slice(-8).map(w => (
          <span key={`fw-${w}`} className="font-mono-tech text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(57,255,20,0.1)", color: "#39ff14", border: "1px solid rgba(57,255,20,0.2)" }}>{w}</span>
        ))}
      </div>
      <p className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Click adjacent letters • Click last letter or Submit to score</p>
    </div>
  );
}
