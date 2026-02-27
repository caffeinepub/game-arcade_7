import { useState, useCallback, lazy, Suspense } from "react";
import { ArrowLeft, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import GameOverModal from "./GameOverModal";
import { useSaveHighScore, useHighScore } from "@/hooks/useQueries";
import type { GameDefinition } from "@/types/games";

const SnakeGame = lazy(() => import("@/games/SnakeGame"));
const TetrisGame = lazy(() => import("@/games/TetrisGame"));
const Game2048 = lazy(() => import("@/games/Game2048"));
const FlappyGame = lazy(() => import("@/games/FlappyGame"));
const MemoryGame = lazy(() => import("@/games/MemoryGame"));
const MinesweeperGame = lazy(() => import("@/games/MinesweeperGame"));
const BreakoutGame = lazy(() => import("@/games/BreakoutGame"));
const WhackMoleGame = lazy(() => import("@/games/WhackMoleGame"));
const PacManGame = lazy(() => import("@/games/PacManGame"));
const SpaceInvadersGame = lazy(() => import("@/games/SpaceInvadersGame"));
const AsteroidsGame = lazy(() => import("@/games/AsteroidsGame"));
const PongGame = lazy(() => import("@/games/PongGame"));
const FroggerGame = lazy(() => import("@/games/FroggerGame"));
const BubbleShooterGame = lazy(() => import("@/games/BubbleShooterGame"));
const ConnectFourGame = lazy(() => import("@/games/ConnectFourGame"));
const SimonSaysGame = lazy(() => import("@/games/SimonSaysGame"));
const CrossyRoadGame = lazy(() => import("@/games/CrossyRoadGame"));
const BrickBreakerGame = lazy(() => import("@/games/BrickBreakerGame"));
const TicTacToeGame = lazy(() => import("@/games/TicTacToeGame"));
const CheckersGame = lazy(() => import("@/games/CheckersGame"));
const ChessGame = lazy(() => import("@/games/ChessGame"));
const SudokuGame = lazy(() => import("@/games/SudokuGame"));
const SolitaireGame = lazy(() => import("@/games/SolitaireGame"));
const MahjongGame = lazy(() => import("@/games/MahjongGame"));
const BattleshipGame = lazy(() => import("@/games/BattleshipGame"));
const ReversiGame = lazy(() => import("@/games/ReversiGame"));
const GoGame = lazy(() => import("@/games/GoGame"));
const DominoesGame = lazy(() => import("@/games/DominoesGame"));
const BackgammonGame = lazy(() => import("@/games/BackgammonGame"));
const YahtzeeGame = lazy(() => import("@/games/YahtzeeGame"));
const BlackjackGame = lazy(() => import("@/games/BlackjackGame"));
const VideoPokerGame = lazy(() => import("@/games/VideoPokerGame"));
const WordSearchGame = lazy(() => import("@/games/WordSearchGame"));
const HangmanGame = lazy(() => import("@/games/HangmanGame"));
const BoggleGame = lazy(() => import("@/games/BoggleGame"));
const SlidingPuzzleGame = lazy(() => import("@/games/SlidingPuzzleGame"));
const HanoiGame = lazy(() => import("@/games/HanoiGame"));
const NonogramGame = lazy(() => import("@/games/NonogramGame"));
const LightsOutGame = lazy(() => import("@/games/LightsOutGame"));
const MancalaGame = lazy(() => import("@/games/MancalaGame"));
const MorrisGame = lazy(() => import("@/games/MorrisGame"));
const HexGame = lazy(() => import("@/games/HexGame"));
const DotsBoxesGame = lazy(() => import("@/games/DotsBoxesGame"));
const MastermindGame = lazy(() => import("@/games/MastermindGame"));
const NimGame = lazy(() => import("@/games/NimGame"));
const CribbageGame = lazy(() => import("@/games/CribbageGame"));
const ConcentrationGame = lazy(() => import("@/games/ConcentrationGame"));
const ConnectFiveGame = lazy(() => import("@/games/ConnectFiveGame"));
const SameGameGame = lazy(() => import("@/games/SameGameGame"));
const PinballGame = lazy(() => import("@/games/PinballGame"));
const DoodleJumpGame = lazy(() => import("@/games/DoodleJumpGame"));
const GeometryDashGame = lazy(() => import("@/games/GeometryDashGame"));
const CandyCrushGame = lazy(() => import("@/games/CandyCrushGame"));
const JewelQuestGame = lazy(() => import("@/games/JewelQuestGame"));
const FreeCellGame = lazy(() => import("@/games/FreeCellGame"));
const SpiderSolitaireGame = lazy(() => import("@/games/SpiderSolitaireGame"));
const TripeaksSolitaireGame = lazy(() => import("@/games/TripeaksSolitaireGame"));
const PyramidSolitaireGame = lazy(() => import("@/games/PyramidSolitaireGame"));
const Hex2048Game = lazy(() => import("@/games/Hex2048Game"));
const StackGame = lazy(() => import("@/games/StackGame"));
const ColorSwitchGame = lazy(() => import("@/games/ColorSwitchGame"));
const SokobanGame = lazy(() => import("@/games/SokobanGame"));
const PipeDreamGame = lazy(() => import("@/games/PipeDreamGame"));
const NumberLinkGame = lazy(() => import("@/games/NumberLinkGame"));
const BlokusGame = lazy(() => import("@/games/BlokusGame"));
const TripleTriadGame = lazy(() => import("@/games/TripleTriadGame"));
const LudoGame = lazy(() => import("@/games/LudoGame"));
const WordleGame = lazy(() => import("@/games/WordleGame"));
const RollTheBallGame = lazy(() => import("@/games/RollTheBallGame"));
const Game2048_3D = lazy(() => import("@/games/Game2048_3D"));

interface Props {
  game: GameDefinition;
  onBackToLobby: () => void;
}

const NEON_COLORS: Record<string, string> = {
  cyan: "#00f5ff",
  green: "#39ff14",
  purple: "#bf5fff",
  pink: "#ff2d8e",
  yellow: "#fff200",
  red: "#ff4444",
};

export default function GameWrapper({ game, onBackToLobby }: Props) {
  const [currentScore, setCurrentScore] = useState(0);
  const [gameKey, setGameKey] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [isActive, setIsActive] = useState(true);

  const { data: highScoreEntry } = useHighScore(game.id);
  const saveScore = useSaveHighScore();

  const bestScore = highScoreEntry ? Number(highScoreEntry.score) : null;
  const neonColor = NEON_COLORS[game.color] || "#00f5ff";

  const handleGameOver = useCallback((score: number) => {
    setFinalScore(score);
    setIsActive(false);
    setShowModal(true);
    if (score > 0) {
      saveScore.mutate({ gameId: game.id, score });
    }
  }, [game.id, saveScore]);

  const handleScoreUpdate = useCallback((score: number) => {
    setCurrentScore(score);
  }, []);

  const handlePlayAgain = useCallback(() => {
    setShowModal(false);
    setCurrentScore(0);
    setGameKey((k) => k + 1);
    setIsActive(true);
  }, []);

  const handleBackToLobby = useCallback(() => {
    setShowModal(false);
    onBackToLobby();
  }, [onBackToLobby]);

  const renderGame = () => {
    const props = {
      key: gameKey,
      onGameOver: handleGameOver,
      onScoreUpdate: handleScoreUpdate,
      isActive,
    };

    switch (game.id) {
      case "snake": return <SnakeGame {...props} />;
      case "tetris": return <TetrisGame {...props} />;
      case "2048": return <Game2048 {...props} />;
      case "flappy": return <FlappyGame {...props} />;
      case "memory": return <MemoryGame {...props} />;
      case "minesweeper": return <MinesweeperGame {...props} />;
      case "breakout": return <BreakoutGame {...props} />;
      case "whackmole": return <WhackMoleGame {...props} />;
      case "pacman": return <PacManGame {...props} />;
      case "spaceinvaders": return <SpaceInvadersGame {...props} />;
      case "asteroids": return <AsteroidsGame {...props} />;
      case "pong": return <PongGame {...props} />;
      case "frogger": return <FroggerGame {...props} />;
      case "bubbleshooter": return <BubbleShooterGame {...props} />;
      case "connectfour": return <ConnectFourGame {...props} />;
      case "simonsays": return <SimonSaysGame {...props} />;
      case "crossyroad": return <CrossyRoadGame {...props} />;
      case "brickbreaker": return <BrickBreakerGame {...props} />;
      case "tictactoe": return <TicTacToeGame {...props} />;
      case "checkers": return <CheckersGame {...props} />;
      case "chess": return <ChessGame {...props} />;
      case "sudoku": return <SudokuGame {...props} />;
      case "solitaire": return <SolitaireGame {...props} />;
      case "mahjong": return <MahjongGame {...props} />;
      case "battleship": return <BattleshipGame {...props} />;
      case "reversi": return <ReversiGame {...props} />;
      case "go": return <GoGame {...props} />;
      case "dominoes": return <DominoesGame {...props} />;
      case "backgammon": return <BackgammonGame {...props} />;
      case "yahtzee": return <YahtzeeGame {...props} />;
      case "blackjack": return <BlackjackGame {...props} />;
      case "videopoker": return <VideoPokerGame {...props} />;
      case "wordsearch": return <WordSearchGame {...props} />;
      case "hangman": return <HangmanGame {...props} />;
      case "boggle": return <BoggleGame {...props} />;
      case "slidingpuzzle": return <SlidingPuzzleGame {...props} />;
      case "hanoi": return <HanoiGame {...props} />;
      case "nonogram": return <NonogramGame {...props} />;
      case "lightsout": return <LightsOutGame {...props} />;
      case "mancala": return <MancalaGame {...props} />;
      case "morris": return <MorrisGame {...props} />;
      case "hex": return <HexGame {...props} />;
      case "dotsboxes": return <DotsBoxesGame {...props} />;
      case "mastermind": return <MastermindGame {...props} />;
      case "nim": return <NimGame {...props} />;
      case "cribbage": return <CribbageGame {...props} />;
      case "concentration": return <ConcentrationGame {...props} />;
      case "connectfive": return <ConnectFiveGame {...props} />;
      case "samegame": return <SameGameGame {...props} />;
      case "pinball": return <PinballGame {...props} />;
      case "doodlejump": return <DoodleJumpGame {...props} />;
      case "geometrydash": return <GeometryDashGame {...props} />;
      case "candycrush": return <CandyCrushGame {...props} />;
      case "jewelquest": return <JewelQuestGame {...props} />;
      case "freecell": return <FreeCellGame {...props} />;
      case "spidersolitaire": return <SpiderSolitaireGame {...props} />;
      case "tripeaks": return <TripeaksSolitaireGame {...props} />;
      case "pyramidsolitaire": return <PyramidSolitaireGame {...props} />;
      case "hex2048": return <Hex2048Game {...props} />;
      case "stack": return <StackGame {...props} />;
      case "colorswitch": return <ColorSwitchGame {...props} />;
      case "sokoban": return <SokobanGame {...props} />;
      case "pipedream": return <PipeDreamGame {...props} />;
      case "numberlink": return <NumberLinkGame {...props} />;
      case "blokus": return <BlokusGame {...props} />;
      case "tripletriad": return <TripleTriadGame {...props} />;
      case "ludo": return <LudoGame {...props} />;
      case "wordle": return <WordleGame {...props} />;
      case "rolltheball": return <RollTheBallGame {...props} />;
      case "2048_3d": return <Game2048_3D {...props} />;
      default: return <div className="text-foreground font-mono-tech">Game not found</div>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0f" }}>
      {/* Header bar */}
      <header
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{
          borderColor: neonColor + "44",
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Button
          variant="ghost"
          onClick={onBackToLobby}
          className="font-arcade text-xs gap-2"
          style={{ color: neonColor }}
        >
          <ArrowLeft className="h-4 w-4" />
          LOBBY
        </Button>

        <div className="flex items-center gap-2">
          <span className="font-arcade text-xs" style={{ color: neonColor }}>
            {game.icon} {game.name.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-4 font-mono-tech text-sm">
          <div className="text-right">
            <span className="text-muted-foreground text-xs block">SCORE</span>
            <span style={{ color: neonColor, textShadow: `0 0 8px ${neonColor}` }}>
              {currentScore.toLocaleString()}
            </span>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground text-xs flex items-center gap-1">
              <Trophy className="h-3 w-3" /> BEST
            </span>
            <span style={{ color: "#bf5fff" }}>
              {bestScore !== null ? bestScore.toLocaleString() : "-"}
            </span>
          </div>
        </div>
      </header>

      {/* Game area */}
      <main className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <Suspense
          fallback={
            <div className="font-arcade text-xs text-muted-foreground animate-pulse">
              LOADING...
            </div>
          }
        >
          {renderGame()}
        </Suspense>
      </main>

      <GameOverModal
        open={showModal}
        score={finalScore}
        bestScore={bestScore}
        gameName={`${game.icon} ${game.name}`}
        onPlayAgain={handlePlayAgain}
        onBackToLobby={handleBackToLobby}
      />
    </div>
  );
}
