import { useState, useEffect } from "react";
import Lobby from "./components/Lobby";
import GameWrapper from "./components/GameWrapper";
import GlobalLeaderboard from "./components/GlobalLeaderboard";
import UpdatesPanel from "./components/UpdatesPanel";
import AuthPage from "./components/AuthPage";
import { useActor } from "./hooks/useActor";
import type { GameDefinition } from "./types/games";

type View = "lobby" | "game" | "leaderboard" | "auth";

export default function App() {
  const { actor, isFetching } = useActor();
  const [view, setView] = useState<View>("lobby");
  const [activeGame, setActiveGame] = useState<GameDefinition | null>(null);
  const [showUpdates, setShowUpdates] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  // Load saved username on mount once actor is ready
  useEffect(() => {
    if (!actor || isFetching) return;
    actor.getCallerUsername().then((name) => {
      setCurrentUsername(name ?? null);
    }).catch(() => {
      // ignore — anonymous user
    });
  }, [actor, isFetching]);

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
      {view === "auth" && (
        <AuthPage
          onSuccess={(username) => {
            setCurrentUsername(username);
            setView("lobby");
          }}
          onBack={() => setView("lobby")}
        />
      )}

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
          currentUsername={currentUsername}
          onOpenAuth={() => setView("auth")}
        />
      )}

      <UpdatesPanel
        open={showUpdates}
        onClose={() => setShowUpdates(false)}
      />
    </div>
  );
}
