# Game Arcade

## Current State
The arcade has 19 playable games (Snake, Tetris, 2048, Flappy Bird, Memory Match, Minesweeper, Breakout, Whack-a-Mole, Pac-Man, Space Invaders, Asteroids, Pong, Frogger, Bubble Shooter, Connect Four, Simon Says, Crossy Road, Brick Breaker, Tic-Tac-Toe). It features a global leaderboard, high score tracking, retro neon UI, and an updates panel. Backend stores scores via `saveHighScore` / `getGlobalLeaderboard`.

## Requested Changes (Diff)

### Add
30 new modern-day board, card, strategy, and puzzle games:

1. **Checkers** – vs AI, standard 8x8 board, kings, mandatory jumps
2. **Chess** – vs AI (minimax), full rules including castling and en passant
3. **Sudoku** – 9x9 grid with 3 difficulty levels, pencil marks, timer
4. **Solitaire (Klondike)** – Classic card solitaire, drag-and-drop style
5. **Mahjong Solitaire** – Match pairs of tiles to clear the board
6. **Battleship** – vs AI, classic ship placement and sea combat
7. **Reversi / Othello** – Flip opponent discs on an 8x8 board
8. **Go** – 9x9 board vs AI, territory capture, pass & resign
9. **Dominoes** – Match and chain domino tiles vs AI
10. **Backgammon** – Race and strategy vs AI with dice rolls
11. **Yahtzee** – 5-dice scoring game, complete all categories
12. **Blackjack** – Beat the dealer without busting 21
13. **Poker (Video Poker)** – 5-card draw, Jacks or Better payout table
14. **Solitaire Mahjong (Shanghai)** – Tile matching puzzle
15. **Word Search** – Find hidden words in a grid of letters
16. **Crossword Lite** – Mini 7x7 themed crossword puzzles
17. **Hangman** – Guess the word letter by letter
18. **Boggle / Word Grid** – Find words in a 4x4 random letter grid
19. **Sliding Puzzle (15-puzzle)** – Arrange numbered tiles in order
20. **Towers of Hanoi** – Move discs from peg to peg
21. **Nonogram / Picross** – Logic pixel-art puzzles
22. **Lights Out** – Toggle all lights off on a 5x5 grid
23. **Mancala (Kalah)** – Sow and capture seeds vs AI
24. **Nine Men's Morris** – Place, move, and capture pieces vs AI
25. **Hex** – Capture a path from edge to edge vs AI (11x11)
26. **Dots and Boxes** – Connect dots to claim boxes vs AI
27. **Mastermind** – Guess the hidden 4-color code in 10 tries
28. **Nim** – Take objects strategically to avoid the last pick
29. **Cribbage Lite** – Play and score crib cards vs AI (simplified)
30. **Concentration (Pairs)** – Advanced memory card matching with timer and combos

### Modify
- `src/types/games.ts` — Add 30 new game definitions to the GAMES array
- `src/components/Lobby.tsx` — Update subtitle count to 49 titles
- `src/components/UpdatesPanel.tsx` — Add changelog entry for 30 new games

### Remove
Nothing removed.

## Implementation Plan
1. Write 30 new game component files in `src/games/`
2. Update `src/types/games.ts` to register all 30 new games
3. Update `src/components/GameWrapper.tsx` to route to new games
4. Update lobby header count and updates panel changelog
5. Build and validate

## UX Notes
- Games follow the existing neon-dark aesthetic
- Board games (Chess, Checkers, Go, etc.) use clean grid-based canvas or DOM rendering
- Card games use stylized card visuals matching the dark theme
- Each game stores a score to the leaderboard on game end
- Mobile touch support for all new games where relevant
