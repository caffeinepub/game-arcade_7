# Game Arcade

## Current State
The arcade has 49 playable games in a neon dark lobby. Games are defined in `src/frontend/src/types/games.ts` (GAMES array) and loaded lazily in `GameWrapper.tsx`. There is a global leaderboard, updates panel, and user auth (username/password).

## Requested Changes (Diff)

### Add
21 new game components in `src/frontend/src/games/`:
1. **Pinball** — bouncing ball with flippers, bumpers, ramps (canvas)
2. **Doodle Jump** — bounce upward on platforms, avoid falling
3. **Geometry Dash** — side-scroll rhythm runner, jump over obstacles
4. **Temple Run** — endless runner, swipe to dodge/jump/slide
5. **Candy Crush** — match-3 candy swap puzzle
6. **Jewel Quest** — match-3 jewel grid
7. **Mahjong Solitaire** — tile-based matching (distinct from current Mahjong)
8. **Klondike Solitaire** — already have Solitaire, so add FreeCell Solitaire
9. **Spider Solitaire** — 2-suit variant
10. **Tripeaks Solitaire** — three-peak card clearing
11. **Pyramid Solitaire** — pair cards to 13
12. **2048 Hex** — 2048 on hexagonal grid
13. **Stack** — stack blocks by timing
14. **Color Switch** — pass through matching colored segments
15. **Roll the Ball** — slide pipes to guide a ball to the exit
16. **Sokoban** — push crates onto targets
17. **Pipe Dream** — connect pipe segments before water flows
18. **Number Link** — draw paths to connect matching numbers
19. **Blokus** — place polyominos to claim the most board space (vs AI)
20. **Othello** — alias for Reversi -- already exists, replace with **Triple Triad** card battle game
21. **Ludo** — roll dice and race 4 tokens home vs AI

### Modify
- `src/frontend/src/types/games.ts` — add 21 new entries to GAMES array
- `src/frontend/src/components/GameWrapper.tsx` — add lazy imports and switch cases
- `src/frontend/src/components/Lobby.tsx` — update count label from "49 TITLES" to "70 TITLES"
- `src/frontend/src/components/UpdatesPanel.tsx` — add v8 changelog entry

### Remove
Nothing removed.

## Implementation Plan
1. Create each of the 21 game TSX files in `src/frontend/src/games/`
2. Add 21 entries to `GAMES` constant in `types/games.ts`
3. Add 21 lazy imports and switch cases to `GameWrapper.tsx`
4. Update count in `Lobby.tsx` (49 → 70)
5. Add v8 entry to `UpdatesPanel.tsx`

## UX Notes
- All new games follow existing neon dark aesthetic (Canvas for action games, div/flex for card/board games)
- Each game exposes `onGameOver(score)` and `onScoreUpdate(score)` props
- Mobile-friendly where possible (touch controls or on-screen buttons)
