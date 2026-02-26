import { useState } from "react";
import { ArrowLeft, Users, Trophy } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGlobalLeaderboard, usePlayerCount } from "@/hooks/useQueries";
import { GAMES } from "@/types/games";
import type { ScoreEntry } from "@/backend.d";

interface Props {
  onBack: () => void;
}

const NEON_COLORS: Record<string, string> = {
  cyan: "#00f5ff",
  green: "#39ff14",
  purple: "#bf5fff",
  pink: "#ff2d8e",
  yellow: "#fff200",
  red: "#ff4444",
};

function timeAgo(timestamp: bigint): string {
  const ms = Number(timestamp) / 1_000_000; // nanoseconds to ms
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatPlayerName(entry: ScoreEntry): string {
  // The gameId field contains the player identifier from the backend
  // In the absence of username, display last 8 chars
  return `Player …${entry.gameId.slice(-8)}`;
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

function LeaderboardEntry({ entry, rank }: { entry: ScoreEntry; rank: number }) {
  const medal = rank < 3 ? RANK_MEDALS[rank] : null;
  const rankColor = rank === 0 ? "#fff200" : rank === 1 ? "#c0c0c0" : rank === 2 ? "#cd7f32" : "rgba(255,255,255,0.4)";

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded transition-all duration-200"
      style={{
        background: rank < 3
          ? `linear-gradient(90deg, rgba(${rank === 0 ? "255,242,0" : rank === 1 ? "192,192,192" : "205,127,50"},0.08) 0%, transparent 100%)`
          : "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.04)",
        marginBottom: 4,
      }}
    >
      <div
        className="font-arcade text-center shrink-0"
        style={{ width: 32, fontSize: rank < 3 ? 18 : 11, color: rankColor }}
      >
        {medal ?? `#${rank + 1}`}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-mono-tech text-sm truncate" style={{ color: "rgba(255,255,255,0.8)" }}>
          {formatPlayerName(entry)}
        </div>
        <div className="font-mono-tech text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          {timeAgo(entry.timestamp)}
        </div>
      </div>

      <div
        className="font-orbitron text-lg font-bold shrink-0"
        style={{ color: rank === 0 ? "#fff200" : "#00f5ff", textShadow: rank === 0 ? "0 0 10px #fff200" : "none" }}
      >
        {Number(entry.score).toLocaleString()}
      </div>
    </div>
  );
}

function GameLeaderboard({ gameId }: { gameId: string }) {
  const { data: entries, isLoading } = useGlobalLeaderboard(gameId);
  const { data: count } = usePlayerCount(gameId);
  const game = GAMES.find((g) => g.id === gameId);
  const neonColor = game ? NEON_COLORS[game.color] ?? "#00f5ff" : "#00f5ff";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="font-arcade text-xs animate-pulse" style={{ color: neonColor }}>
          LOADING...
        </div>
      </div>
    );
  }

  const topEntries = entries?.slice(0, 10) ?? [];

  return (
    <div className="flex flex-col gap-2">
      {/* Player count badge */}
      {count !== undefined && (
        <div className="flex items-center gap-2 px-4 py-2 mb-2">
          <Users className="h-4 w-4" style={{ color: neonColor }} />
          <span className="font-mono-tech text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            <span style={{ color: neonColor, fontWeight: "bold" }}>{Number(count).toLocaleString()}</span> players
          </span>
        </div>
      )}

      {topEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="text-5xl opacity-30">🎮</div>
          <div className="font-arcade text-xs text-center leading-loose" style={{ color: "rgba(255,255,255,0.3)" }}>
            BE THE FIRST<br />TO PLAY
          </div>
        </div>
      ) : (
        <div>
          {topEntries.map((entry, i) => (
            <LeaderboardEntry key={`${entry.gameId}-${i}`} entry={entry} rank={i} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function GlobalLeaderboard({ onBack }: Props) {
  const [selectedGame, setSelectedGame] = useState(GAMES[0].id);
  const selectedGameDef = GAMES.find((g) => g.id === selectedGame);
  const neonColor = selectedGameDef ? NEON_COLORS[selectedGameDef.color] ?? "#00f5ff" : "#00f5ff";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0a0a0f" }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-20 px-4 py-4 border-b"
        style={{
          background: "rgba(10,10,15,0.95)",
          backdropFilter: "blur(16px)",
          borderColor: "rgba(0,245,255,0.15)",
        }}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 font-arcade text-xs transition-colors"
            style={{ color: "rgba(0,245,255,0.6)", background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#00f5ff"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,245,255,0.6)"; }}
          >
            <ArrowLeft className="h-4 w-4" />
            BACK
          </button>

          <div className="flex items-center gap-3 flex-1 justify-center">
            <Trophy className="h-5 w-5" style={{ color: "#fff200" }} />
            <h1
              className="font-arcade text-sm sm:text-base tracking-wider"
              style={{ color: "#00f5ff", textShadow: "0 0 20px #00f5ff, 0 0 40px rgba(0,245,255,0.4)" }}
            >
              GLOBAL LEADERBOARD
            </h1>
            <Trophy className="h-5 w-5" style={{ color: "#fff200" }} />
          </div>

          <div style={{ width: 60 }} />
        </div>
      </header>

      {/* Game tab bar */}
      <div
        className="sticky z-10 border-b"
        style={{ top: 65, borderColor: "rgba(255,255,255,0.06)", background: "rgba(10,10,15,0.9)", backdropFilter: "blur(10px)" }}
      >
        <ScrollArea className="w-full" type="scroll">
          <div className="flex gap-1 px-4 py-2" style={{ width: "max-content" }}>
            {GAMES.map((game) => {
              const gc = NEON_COLORS[game.color] ?? "#00f5ff";
              const isSelected = game.id === selectedGame;
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => setSelectedGame(game.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded font-arcade text-[9px] whitespace-nowrap transition-all duration-200"
                  style={{
                    color: isSelected ? "#0a0a0f" : gc,
                    background: isSelected ? gc : "transparent",
                    border: `1px solid ${isSelected ? gc : "transparent"}`,
                    boxShadow: isSelected ? `0 0 10px ${gc}` : "none",
                  }}
                >
                  <span>{game.icon}</span>
                  <span>{game.name.toUpperCase()}</span>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Selected game info */}
      <div className="px-4 pt-6 pb-2 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">{selectedGameDef?.icon}</span>
          <h2
            className="font-arcade text-sm"
            style={{ color: neonColor, textShadow: `0 0 15px ${neonColor}` }}
          >
            {selectedGameDef?.name.toUpperCase()}
          </h2>
        </div>
        <div
          className="h-px w-full mt-3"
          style={{ background: `linear-gradient(90deg, ${neonColor}44 0%, transparent 100%)` }}
        />
      </div>

      {/* Leaderboard entries */}
      <main className="flex-1 px-4 pb-8 max-w-4xl mx-auto w-full">
        <GameLeaderboard key={selectedGame} gameId={selectedGame} />
      </main>

      {/* Footer */}
      <footer className="text-center py-4 px-4 border-t" style={{ borderColor: "rgba(0,245,255,0.1)" }}>
        <p className="font-mono-tech text-xs text-muted-foreground">
          © 2026. Built with <span style={{ color: "#ff2d8e" }}>♥</span> using{" "}
          <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" style={{ color: "#00f5ff" }}>
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
