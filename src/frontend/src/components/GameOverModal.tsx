import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  score: number;
  bestScore: number | null;
  gameName: string;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export default function GameOverModal({ open, score, bestScore, gameName, onPlayAgain, onBackToLobby }: Props) {
  const isNewRecord = bestScore === null || score > bestScore;

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-sm text-center"
        style={{
          background: "oklch(0.12 0.015 265)",
          border: "1px solid rgba(0,245,255,0.4)",
          boxShadow: "0 0 40px rgba(0,245,255,0.2)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-arcade text-base" style={{ color: "#00f5ff", textShadow: "0 0 15px #00f5ff" }}>
            GAME OVER
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="font-mono-tech text-sm text-muted-foreground">{gameName}</p>

          <div>
            <p className="font-arcade text-xs text-muted-foreground mb-1">SCORE</p>
            <p className="font-orbitron text-4xl font-bold" style={{ color: "#00f5ff", textShadow: "0 0 20px #00f5ff" }}>
              {score.toLocaleString()}
            </p>
          </div>

          {isNewRecord && score > 0 && (
            <p className="font-arcade text-xs blink" style={{ color: "#fff200", textShadow: "0 0 10px #fff200" }}>
              ★ NEW RECORD! ★
            </p>
          )}

          {bestScore !== null && !isNewRecord && (
            <div>
              <p className="font-arcade text-xs text-muted-foreground mb-1">BEST</p>
              <p className="font-orbitron text-xl font-bold" style={{ color: "#bf5fff" }}>
                {bestScore.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          <Button
            onClick={onPlayAgain}
            className="font-arcade text-xs px-4 py-2"
            style={{
              background: "transparent",
              color: "#39ff14",
              border: "1px solid #39ff14",
              boxShadow: "0 0 10px rgba(57,255,20,0.3)",
            }}
          >
            PLAY AGAIN
          </Button>
          <Button
            onClick={onBackToLobby}
            variant="outline"
            className="font-arcade text-xs px-4 py-2"
            style={{
              background: "transparent",
              color: "#00f5ff",
              border: "1px solid rgba(0,245,255,0.4)",
            }}
          >
            LOBBY
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
