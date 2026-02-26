# Game Arcade

## Current State
- 49-game arcade with lobby, game wrappers, global leaderboard, and updates panel
- Backend has authorization mixin, user profiles (name only), and high score tracking
- No sign-up or login UI exists; users are anonymous by default
- App.tsx manages views: lobby | game | leaderboard

## Requested Changes (Diff)

### Add
- Account page / auth flow with two screens: Sign Up (username + password) and Sign In (username + password)
- Backend: store username + hashed password per account; register and login endpoints returning a session token or setting a logged-in state
- Frontend: AuthPage component with tab toggle between Sign Up / Sign In
- Nav bar indicator showing logged-in username and a Sign Out button
- Redirect to lobby after successful login/signup
- "Account" button in the lobby header to reach the auth page

### Modify
- App.tsx: add "auth" view and pass current user context (username) down to Lobby and nav
- Lobby: show username in header if logged in, show "Sign In / Sign Up" button if not

### Remove
- Nothing removed

## Implementation Plan
1. Backend: add registerUser(username, password) and loginUser(username, password) functions that store credentials securely and return a session/auth result; add getUsername() for current caller
2. Frontend: create AuthPage component with Sign Up / Sign In tabs, form validation (username length, password length), error messages
3. App.tsx: add "auth" view state, pass username state down
4. Lobby: add auth button in header showing username or "Sign In" prompt

## UX Notes
- Retro neon dark theme consistent with existing arcade aesthetic
- Simple, focused form -- no email required, just username + password
- Show success feedback on account creation before redirecting to lobby
- Password field masked; show/hide toggle optional
