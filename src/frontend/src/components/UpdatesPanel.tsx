import { X, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Update {
  version: string;
  date: string;
  title: string;
  description: string;
  color: string;
  isNew?: boolean;
}

const UPDATES: Update[] = [
  {
    version: "v4.0",
    date: "Feb 26, 2026",
    title: "30 New Games Added",
    description: "Checkers, Chess, Sudoku, Solitaire, Mahjong, Battleship, Reversi, Go, Dominoes, Backgammon, Yahtzee, Blackjack, Video Poker, Word Search, Hangman, Boggle, Sliding Puzzle, Towers of Hanoi, Nonogram, Lights Out, Mancala, Nine Men's Morris, Hex, Dots & Boxes, Mastermind, Nim, Cribbage, Concentration, Connect Five, SameGame",
    color: "#00f5ff",
    isNew: true,
  },
  {
    version: "v3.0",
    date: "Feb 26, 2026",
    title: "8 New Games Added",
    description: "Pong, Frogger, Bubble Shooter, Connect Four, Simon Says, Crossy Road, Brick Breaker, Tic-Tac-Toe",
    color: "#00f5ff",
  },
  {
    version: "v3.0",
    date: "Feb 26, 2026",
    title: "Global Leaderboard Launched",
    description: "Compete with players worldwide! View top 10 scores for all 19 games and see how you rank.",
    color: "#fff200",
  },
  {
    version: "v2.2",
    date: "Feb 2026",
    title: "Pac-Man Mobile Controls",
    description: "Touch controls & swipe gestures added to Pac-Man. On-screen D-pad appears during gameplay.",
    color: "#39ff14",
  },
  {
    version: "v2.1",
    date: "Feb 2026",
    title: "Pac-Man Levels",
    description: "Pac-Man now has 5 levels with different maze layouts. Ghosts get faster and a 4th ghost joins from level 3.",
    color: "#bf5fff",
  },
  {
    version: "v2.0",
    date: "Jan 2026",
    title: "3 New Games",
    description: "Pac-Man with power pellets, Space Invaders with alien waves, and Asteroids with split rocks.",
    color: "#ff2d8e",
  },
  {
    version: "v1.0",
    date: "Jan 2026",
    title: "Game Arcade Launched",
    description: "8 classic arcade games: Snake, Tetris, 2048, Flappy Bird, Memory Match, Minesweeper, Breakout, Whack-a-Mole.",
    color: "#fff200",
  },
];

export default function UpdatesPanel({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 z-40 w-full"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", border: "none", cursor: "default" }}
        onClick={onClose}
        aria-label="Close updates panel"
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col"
        style={{
          width: "min(420px, 100vw)",
          background: "#0d0d14",
          borderLeft: "1px solid rgba(255,45,142,0.3)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.8)",
          animation: "slide-in-right 0.3s ease-out",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b shrink-0"
          style={{ borderColor: "rgba(255,45,142,0.2)" }}
        >
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5" style={{ color: "#ff2d8e" }} />
            <h2
              className="font-arcade text-sm"
              style={{ color: "#ff2d8e", textShadow: "0 0 15px rgba(255,45,142,0.6)" }}
            >
              WHAT'S NEW
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 transition-colors"
            style={{ color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#ff2d8e"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.4)"; }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Entries */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {UPDATES.map((update, i) => (
            <div
              key={`update-${update.version}-${i}`}
              className="rounded-lg p-4"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${update.isNew ? update.color + "33" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              <div className="flex items-start gap-3 mb-2">
                <span
                  className="font-arcade text-[9px] px-2 py-1 rounded shrink-0"
                  style={{
                    background: update.color + "22",
                    color: update.color,
                    border: `1px solid ${update.color}44`,
                  }}
                >
                  {update.version}
                </span>
                {update.isNew && (
                  <span
                    className="font-arcade text-[8px] px-1.5 py-1 rounded shrink-0"
                    style={{ background: "#ff2d8e22", color: "#ff2d8e", border: "1px solid #ff2d8e44" }}
                  >
                    NEW
                  </span>
                )}
                <span className="font-mono-tech text-[11px] ml-auto shrink-0" style={{ color: "rgba(255,255,255,0.25)" }}>
                  {update.date}
                </span>
              </div>

              <h3 className="font-arcade text-[10px] mb-2 leading-relaxed" style={{ color: update.color }}>
                {update.title.toUpperCase()}
              </h3>

              <p className="font-mono-tech text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                {update.description}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <p className="font-mono-tech text-xs text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
            Game Arcade • 49 games and counting
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
