import { Gamepad2, Trophy, Zap, Bell, User, LogIn } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllHighScores } from "@/hooks/useQueries";
import type { GameDefinition } from "@/types/games";
import { GAMES } from "@/types/games";

interface Props {
  onSelectGame: (game: GameDefinition) => void;
  onOpenLeaderboard: () => void;
  onOpenUpdates: () => void;
  currentUsername?: string | null;
  onOpenAuth?: () => void;
}

const NEON_COLORS: Record<string, { text: string; border: string; glow: string }> = {
  cyan:   { text: "#00f5ff", border: "rgba(0,245,255,0.35)", glow: "0 0 15px rgba(0,245,255,0.2)" },
  green:  { text: "#39ff14", border: "rgba(57,255,20,0.35)", glow: "0 0 15px rgba(57,255,20,0.2)" },
  purple: { text: "#bf5fff", border: "rgba(191,95,255,0.35)", glow: "0 0 15px rgba(191,95,255,0.2)" },
  pink:   { text: "#ff2d8e", border: "rgba(255,45,142,0.35)", glow: "0 0 15px rgba(255,45,142,0.2)" },
  yellow: { text: "#fff200", border: "rgba(255,242,0,0.35)", glow: "0 0 15px rgba(255,242,0,0.2)" },
  red:    { text: "#ff4444", border: "rgba(255,68,68,0.35)", glow: "0 0 15px rgba(255,68,68,0.2)" },
};

export default function Lobby({ onSelectGame, onOpenLeaderboard, onOpenUpdates, currentUsername, onOpenAuth }: Props) {
  const { data: allScores, isLoading } = useAllHighScores();

  const getScore = (gameId: string): number | null => {
    if (!allScores) return null;
    const entry = allScores.find((s) => s.gameId === gameId);
    return entry ? Number(entry.score) : null;
  };

  return (
    <div className="min-h-screen flex flex-col game-grid-bg" style={{ background: "#0a0a0f" }}>
      {/* Header */}
      <header className="text-center py-8 px-4 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at 50% 0%, rgba(0,245,255,0.08) 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Gamepad2 className="h-8 w-8" style={{ color: "#00f5ff" }} />
            <h1
              className="font-arcade text-3xl sm:text-4xl tracking-wider"
              style={{
                color: "#00f5ff",
                textShadow: "0 0 20px #00f5ff, 0 0 40px rgba(0,245,255,0.5)",
              }}
            >
              GAME ARCADE
            </h1>
            <Gamepad2 className="h-8 w-8" style={{ color: "#00f5ff" }} />
          </div>
          <p className="font-mono-tech text-sm text-muted-foreground mb-5">
            <Zap className="inline h-4 w-4 mr-1" style={{ color: "#fff200" }} />
            SELECT YOUR GAME — 49 TITLES
            <Zap className="inline h-4 w-4 ml-1" style={{ color: "#fff200" }} />
          </p>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {/* User badge or Sign In */}
            {currentUsername ? (
              <div
                className="flex items-center gap-1.5 font-mono-tech text-xs px-3 py-2 rounded"
                style={{
                  background: "rgba(57,255,20,0.08)",
                  border: "1px solid rgba(57,255,20,0.35)",
                  color: "#39ff14",
                  boxShadow: "0 0 8px rgba(57,255,20,0.1)",
                }}
              >
                <User className="h-3 w-3" />
                {currentUsername}
              </div>
            ) : onOpenAuth ? (
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center gap-2 font-arcade text-[10px] px-4 py-2.5 rounded transition-all duration-200"
                style={{
                  background: "transparent",
                  color: "#39ff14",
                  border: "1px solid rgba(57,255,20,0.4)",
                  boxShadow: "0 0 10px rgba(57,255,20,0.1)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 15px rgba(57,255,20,0.4)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#39ff14";
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(57,255,20,0.08)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 10px rgba(57,255,20,0.1)";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(57,255,20,0.4)";
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <LogIn className="h-3.5 w-3.5" />
                SIGN IN
              </button>
            ) : null}

            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="flex items-center gap-2 font-arcade text-[10px] px-4 py-2.5 rounded transition-all duration-200"
              style={{
                background: "transparent",
                color: "#fff200",
                border: "1px solid rgba(255,242,0,0.4)",
                boxShadow: "0 0 10px rgba(255,242,0,0.1)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 15px rgba(255,242,0,0.4)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#fff200";
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,242,0,0.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 10px rgba(255,242,0,0.1)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,242,0,0.4)";
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <Trophy className="h-3.5 w-3.5" />
              LEADERBOARD
            </button>

            <button
              type="button"
              onClick={onOpenUpdates}
              className="relative flex items-center gap-2 font-arcade text-[10px] px-4 py-2.5 rounded transition-all duration-200"
              style={{
                background: "transparent",
                color: "#ff2d8e",
                border: "1px solid rgba(255,45,142,0.4)",
                boxShadow: "0 0 10px rgba(255,45,142,0.1)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 15px rgba(255,45,142,0.4)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#ff2d8e";
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,45,142,0.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 10px rgba(255,45,142,0.1)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,45,142,0.4)";
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <Bell className="h-3.5 w-3.5" />
              UPDATES
              {/* Notification dot */}
              <span
                className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2 border-[#0a0a0f]"
                style={{ background: "#ff2d8e", boxShadow: "0 0 6px #ff2d8e" }}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Games grid */}
      <main className="flex-1 px-4 pb-8 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {GAMES.map((game) => {
            const colors = NEON_COLORS[game.color] ?? NEON_COLORS["cyan"];
            const score = getScore(game.id);

            return (
              <button
                key={game.id}
                type="button"
                onClick={() => onSelectGame(game)}
                className="group text-left p-5 rounded transition-all duration-300 relative overflow-hidden"
                style={{
                  background: "oklch(0.12 0.015 265)",
                  border: `1px solid ${colors.border}`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = colors.glow;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = colors.text;
                  (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.15 0.02 265)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = colors.border;
                  (e.currentTarget as HTMLButtonElement).style.background = "oklch(0.12 0.015 265)";
                }}
              >
                {/* Background glow on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at top left, ${colors.text}10 0%, transparent 60%)`,
                  }}
                />

                <div className="relative z-10">
                  <div className="text-4xl mb-3">{game.icon}</div>
                  <h2
                    className="font-arcade text-xs mb-2 leading-relaxed"
                    style={{ color: colors.text }}
                  >
                    {game.name.toUpperCase()}
                  </h2>
                  <p className="font-mono-tech text-xs text-muted-foreground mb-4 leading-relaxed">
                    {game.description}
                  </p>

                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-1">
                      <Trophy className="h-3 w-3" style={{ color: colors.text }} />
                      <span className="font-mono-tech text-xs" style={{ color: colors.text }}>
                        {isLoading ? (
                          <Skeleton className="h-3 w-12 inline-block" />
                        ) : score !== null ? (
                          score.toLocaleString()
                        ) : (
                          <span className="text-muted-foreground opacity-50">—</span>
                        )}
                      </span>
                    </div>
                    <span
                      className="font-arcade text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: colors.text }}
                    >
                      PLAY ▶
                    </span>
                  </div>

                  <p className="font-mono-tech text-[10px] text-muted-foreground mt-2 opacity-60">
                    {game.controls}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 px-4 border-t" style={{ borderColor: "rgba(0,245,255,0.1)" }}>
        <p className="font-mono-tech text-xs text-muted-foreground">
          © 2026. Built with{" "}
          <span style={{ color: "#ff2d8e" }}>♥</span>
          {" "}using{" "}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors"
            style={{ color: "#00f5ff" }}
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
