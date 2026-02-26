import { useState } from "react";
import Lobby from "./components/Lobby";
import GameWrapper from "./components/GameWrapper";
import GlobalLeaderboard from "./components/GlobalLeaderboard";
import UpdatesPanel from "./components/UpdatesPanel";
import type { GameDefinition } from "./types/games";

type View = "lobby" | "game" | "leaderboard";

export default function App() {
  const [view, setView] = useState<View>("lobby");
  const [activeGame, setActiveGame] = useState<GameDefinition | null>(null);
  const [showUpdates, setShowUpdates] = useState(false);

  const handleSelectGame = (game: GameDefinition) => {
    setActiveGame(game);
    setView("game");
  };

  const handleBackToLobby = () => {
    setActiveGame(null);
    setView("lobby");
  };

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f" }}>
      {view === "leaderboard" && (
        <GlobalLeaderboard onBack={() => setView("lobby")} />
      )}

      {view === "game" && activeGame && (
        <GameWrapper
          game={activeGame}
          onBackToLobby={handleBackToLobby}
        />
      )}

      {view === "lobby" && (
        <Lobby
          onSelectGame={handleSelectGame}
          onOpenLeaderboard={() => setView("leaderboard")}
          onOpenUpdates={() => setShowUpdates(true)}
        />
      )}

      <UpdatesPanel
        open={showUpdates}
        onClose={() => setShowUpdates(false)}
      />
    </div>
  );
}
