import { useState, useCallback } from "react";
import { Eye, EyeOff, Gamepad2, ArrowLeft, Loader2, User, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { useActor } from "@/hooks/useActor";

interface Props {
  onSuccess: (username: string) => void;
  onBack: () => void;
}

type Tab = "signin" | "signup";

type FieldError = string | null;

interface SignInForm {
  username: string;
  password: string;
}

interface SignUpForm {
  username: string;
  password: string;
  confirmPassword: string;
}

function validateUsername(value: string): FieldError {
  if (!value) return "Username is required";
  if (value.length < 3) return "Username must be at least 3 characters";
  if (value.length > 20) return "Username must be 20 characters or less";
  if (!/^[a-zA-Z0-9_]+$/.test(value)) return "Only letters, numbers, and underscores";
  return null;
}

function validatePassword(value: string): FieldError {
  if (!value) return "Password is required";
  if (value.length < 6) return "Password must be at least 6 characters";
  return null;
}

export default function AuthPage({ onSuccess, onBack }: Props) {
  const { actor } = useActor();
  const [tab, setTab] = useState<Tab>("signin");

  // Sign In state
  const [signIn, setSignIn] = useState<SignInForm>({ username: "", password: "" });
  const [signInErrors, setSignInErrors] = useState<Partial<SignInForm>>({});
  const [signInGlobalError, setSignInGlobalError] = useState<string | null>(null);
  const [signInLoading, setSignInLoading] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign Up state
  const [signUp, setSignUp] = useState<SignUpForm>({ username: "", password: "", confirmPassword: "" });
  const [signUpErrors, setSignUpErrors] = useState<Partial<Record<keyof SignUpForm, string>>>({});
  const [signUpGlobalError, setSignUpGlobalError] = useState<string | null>(null);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const checkUsernameAvailability = useCallback(
    async (username: string) => {
      const err = validateUsername(username);
      if (err || !actor) {
        setUsernameAvailable(null);
        return;
      }
      setCheckingUsername(true);
      try {
        const exists = await actor.checkUsernameExists(username);
        setUsernameAvailable(!exists);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    },
    [actor]
  );

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Partial<SignInForm> = {};
    const uErr = validateUsername(signIn.username);
    const pErr = validatePassword(signIn.password);
    if (uErr) errs.username = uErr;
    if (pErr) errs.password = pErr;
    setSignInErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (!actor) {
      setSignInGlobalError("Not connected to backend. Please wait and try again.");
      return;
    }

    setSignInLoading(true);
    setSignInGlobalError(null);
    try {
      await actor.loginUser(signIn.username, signIn.password);
      onSuccess(signIn.username);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("not found") || msg.includes("Invalid") || msg.includes("wrong")) {
        setSignInGlobalError("Invalid username or password");
      } else {
        setSignInGlobalError("Sign in failed. Please try again.");
      }
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Partial<Record<keyof SignUpForm, string>> = {};
    const uErr = validateUsername(signUp.username);
    const pErr = validatePassword(signUp.password);
    if (uErr) errs.username = uErr;
    if (pErr) errs.password = pErr;
    if (!signUp.confirmPassword) {
      errs.confirmPassword = "Please confirm your password";
    } else if (signUp.password !== signUp.confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }
    setSignUpErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (usernameAvailable === false) {
      setSignUpErrors((prev) => ({ ...prev, username: "Username is already taken" }));
      return;
    }

    if (!actor) {
      setSignUpGlobalError("Not connected to backend. Please wait and try again.");
      return;
    }

    setSignUpLoading(true);
    setSignUpGlobalError(null);
    try {
      await actor.registerUser(signUp.username, signUp.password);
      onSuccess(signUp.username);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already") || msg.includes("taken") || msg.includes("exists")) {
        setSignUpErrors((prev) => ({ ...prev, username: "Username is already taken" }));
      } else {
        setSignUpGlobalError("Registration failed. Please try again.");
      }
    } finally {
      setSignUpLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 game-grid-bg relative overflow-hidden"
      style={{ background: "#0a0a0f" }}
    >
      {/* Ambient glow blobs */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(0,245,255,0.06) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-0 left-1/4 w-[400px] h-[200px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(191,95,255,0.05) 0%, transparent 70%)",
        }}
      />

      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 font-mono-tech text-xs transition-all duration-200"
        style={{ color: "rgba(0,245,255,0.6)" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "#00f5ff";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,245,255,0.6)";
        }}
      >
        <ArrowLeft className="h-4 w-4" />
        BACK TO ARCADE
      </button>

      {/* Logo */}
      <div className="flex flex-col items-center mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <Gamepad2
            className="h-7 w-7 animate-neon-pulse"
            style={{ color: "#00f5ff", filter: "drop-shadow(0 0 8px #00f5ff)" }}
          />
          <h1
            className="font-arcade text-2xl sm:text-3xl tracking-wider"
            style={{
              color: "#00f5ff",
              textShadow: "0 0 20px #00f5ff, 0 0 40px rgba(0,245,255,0.5)",
            }}
          >
            GAME ARCADE
          </h1>
          <Gamepad2
            className="h-7 w-7 animate-neon-pulse"
            style={{ color: "#00f5ff", filter: "drop-shadow(0 0 8px #00f5ff)" }}
          />
        </div>
        <p className="font-mono-tech text-xs" style={{ color: "rgba(0,245,255,0.5)" }}>
          CREATE AN ACCOUNT OR SIGN IN TO SAVE YOUR SCORES
        </p>
      </div>

      {/* Auth Card */}
      <div
        className="w-full max-w-md relative animate-slide-in-up"
        style={{
          background: "oklch(0.10 0.015 265)",
          border: "1px solid rgba(0,245,255,0.25)",
          boxShadow: "0 0 40px rgba(0,245,255,0.07), inset 0 0 40px rgba(0,0,0,0.4)",
          borderRadius: "4px",
        }}
      >
        {/* Scanline overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-0 rounded"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
          }}
        />

        {/* Tab bar */}
        <div
          className="flex relative z-10 border-b"
          style={{ borderColor: "rgba(0,245,255,0.15)" }}
        >
          {(["signin", "signup"] as Tab[]).map((t) => {
            const isActive = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="flex-1 py-4 font-arcade text-[9px] tracking-widest transition-all duration-200 relative"
                style={{
                  color: isActive ? "#00f5ff" : "rgba(0,245,255,0.35)",
                  background: isActive ? "rgba(0,245,255,0.05)" : "transparent",
                  textShadow: isActive ? "0 0 10px #00f5ff" : "none",
                }}
              >
                {t === "signin" ? "SIGN IN" : "SIGN UP"}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{ background: "#00f5ff", boxShadow: "0 0 8px #00f5ff" }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Forms */}
        <div className="p-6 relative z-10">
          {/* ── SIGN IN ── */}
          {tab === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-5" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="signin-username" className="font-arcade text-[8px] tracking-widest" style={{ color: "rgba(0,245,255,0.7)" }}>
                  USERNAME
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                    style={{ color: signInErrors.username ? "#ff4444" : "rgba(0,245,255,0.4)" }}
                  />
                  <input
                    id="signin-username"
                    type="text"
                    value={signIn.username}
                    onChange={(e) => {
                      setSignIn((p) => ({ ...p, username: e.target.value }));
                      if (signInErrors.username) setSignInErrors((p) => ({ ...p, username: "" }));
                      setSignInGlobalError(null);
                    }}
                    placeholder="your_username"
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 font-mono-tech text-sm outline-none transition-all duration-200"
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      border: `1px solid ${signInErrors.username ? "rgba(255,68,68,0.6)" : "rgba(0,245,255,0.2)"}`,
                      color: "#e0f7fa",
                      borderRadius: "2px",
                      caretColor: "#00f5ff",
                    }}
                    onFocus={(e) => {
                      if (!signInErrors.username) {
                        (e.target as HTMLInputElement).style.borderColor = "rgba(0,245,255,0.7)";
                        (e.target as HTMLInputElement).style.boxShadow = "0 0 10px rgba(0,245,255,0.15)";
                      }
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLInputElement).style.borderColor = signInErrors.username
                        ? "rgba(255,68,68,0.6)"
                        : "rgba(0,245,255,0.2)";
                      (e.target as HTMLInputElement).style.boxShadow = "none";
                    }}
                  />
                </div>
                {signInErrors.username && (
                  <p className="flex items-center gap-1.5 font-mono-tech text-xs" style={{ color: "#ff4444" }}>
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {signInErrors.username}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="signin-password" className="font-arcade text-[8px] tracking-widest" style={{ color: "rgba(0,245,255,0.7)" }}>
                  PASSWORD
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                    style={{ color: signInErrors.password ? "#ff4444" : "rgba(0,245,255,0.4)" }}
                  />
                  <input
                    id="signin-password"
                    type={showSignInPassword ? "text" : "password"}
                    value={signIn.password}
                    onChange={(e) => {
                      setSignIn((p) => ({ ...p, password: e.target.value }));
                      if (signInErrors.password) setSignInErrors((p) => ({ ...p, password: "" }));
                      setSignInGlobalError(null);
                    }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-12 py-3 font-mono-tech text-sm outline-none transition-all duration-200"
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      border: `1px solid ${signInErrors.password ? "rgba(255,68,68,0.6)" : "rgba(0,245,255,0.2)"}`,
                      color: "#e0f7fa",
                      borderRadius: "2px",
                      caretColor: "#00f5ff",
                    }}
                    onFocus={(e) => {
                      if (!signInErrors.password) {
                        (e.target as HTMLInputElement).style.borderColor = "rgba(0,245,255,0.7)";
                        (e.target as HTMLInputElement).style.boxShadow = "0 0 10px rgba(0,245,255,0.15)";
                      }
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLInputElement).style.borderColor = signInErrors.password
                        ? "rgba(255,68,68,0.6)"
                        : "rgba(0,245,255,0.2)";
                      (e.target as HTMLInputElement).style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-200"
                    style={{ color: "rgba(0,245,255,0.4)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = "#00f5ff";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,245,255,0.4)";
                    }}
                  >
                    {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {signInErrors.password && (
                  <p className="flex items-center gap-1.5 font-mono-tech text-xs" style={{ color: "#ff4444" }}>
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {signInErrors.password}
                  </p>
                )}
              </div>

              {signInGlobalError && (
                <div
                  className="flex items-center gap-2 px-4 py-3 font-mono-tech text-xs"
                  style={{
                    background: "rgba(255,68,68,0.08)",
                    border: "1px solid rgba(255,68,68,0.4)",
                    color: "#ff6666",
                    borderRadius: "2px",
                    boxShadow: "0 0 10px rgba(255,68,68,0.1)",
                  }}
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {signInGlobalError}
                </div>
              )}

              <button
                type="submit"
                disabled={signInLoading}
                className="w-full py-3.5 font-arcade text-[9px] tracking-widest transition-all duration-200 flex items-center justify-center gap-2"
                style={{
                  background: signInLoading ? "rgba(0,245,255,0.1)" : "rgba(0,245,255,0.12)",
                  border: "1px solid rgba(0,245,255,0.5)",
                  color: signInLoading ? "rgba(0,245,255,0.5)" : "#00f5ff",
                  textShadow: signInLoading ? "none" : "0 0 10px rgba(0,245,255,0.7)",
                  boxShadow: signInLoading ? "none" : "0 0 15px rgba(0,245,255,0.1)",
                  borderRadius: "2px",
                  cursor: signInLoading ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!signInLoading) {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,245,255,0.18)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(0,245,255,0.25)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!signInLoading) {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,245,255,0.12)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 15px rgba(0,245,255,0.1)";
                  }
                }}
              >
                {signInLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    SIGNING IN…
                  </>
                ) : (
                  "INSERT COIN → PLAY"
                )}
              </button>

              <p className="text-center font-mono-tech text-xs" style={{ color: "rgba(0,245,255,0.35)" }}>
                No account?{" "}
                <button
                  type="button"
                  onClick={() => setTab("signup")}
                  className="transition-colors duration-200"
                  style={{ color: "#bf5fff" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.textShadow = "0 0 8px #bf5fff";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.textShadow = "none";
                  }}
                >
                  Create one →
                </button>
              </p>
            </form>
          )}

          {/* ── SIGN UP ── */}
          {tab === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-5" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="signup-username" className="font-arcade text-[8px] tracking-widest" style={{ color: "rgba(191,95,255,0.8)" }}>
                  USERNAME
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none z-10"
                    style={{
                      color: signUpErrors.username
                        ? "#ff4444"
                        : usernameAvailable === true
                        ? "#39ff14"
                        : "rgba(191,95,255,0.5)",
                    }}
                  />
                  <input
                    id="signup-username"
                    type="text"
                    value={signUp.username}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSignUp((p) => ({ ...p, username: val }));
                      if (signUpErrors.username) setSignUpErrors((p) => ({ ...p, username: "" }));
                      setSignUpGlobalError(null);
                      setUsernameAvailable(null);
                    }}
                    onBlur={() => checkUsernameAvailability(signUp.username)}
                    placeholder="choose_a_name"
                    autoComplete="username"
                    className="w-full pl-10 pr-10 py-3 font-mono-tech text-sm outline-none transition-all duration-200"
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      border: `1px solid ${
                        signUpErrors.username
                          ? "rgba(255,68,68,0.6)"
                          : usernameAvailable === true
                          ? "rgba(57,255,20,0.5)"
                          : usernameAvailable === false
                          ? "rgba(255,68,68,0.6)"
                          : "rgba(191,95,255,0.25)"
                      }`,
                      color: "#e0f7fa",
                      borderRadius: "2px",
                      caretColor: "#bf5fff",
                    }}
                    onFocus={(e) => {
                      if (!signUpErrors.username && usernameAvailable === null) {
                        (e.target as HTMLInputElement).style.borderColor = "rgba(191,95,255,0.7)";
                        (e.target as HTMLInputElement).style.boxShadow = "0 0 10px rgba(191,95,255,0.15)";
                      }
                    }}
                    onFocusCapture={(e) => {
                      (e.target as HTMLInputElement).style.boxShadow = "";
                    }}
                  />
                  {/* Username availability indicator */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checkingUsername && <Loader2 className="h-4 w-4 animate-spin" style={{ color: "rgba(191,95,255,0.6)" }} />}
                    {!checkingUsername && usernameAvailable === true && (
                      <CheckCircle2 className="h-4 w-4" style={{ color: "#39ff14", filter: "drop-shadow(0 0 4px #39ff14)" }} />
                    )}
                    {!checkingUsername && usernameAvailable === false && (
                      <AlertCircle className="h-4 w-4" style={{ color: "#ff4444" }} />
                    )}
                  </div>
                </div>
                {signUpErrors.username && (
                  <p className="flex items-center gap-1.5 font-mono-tech text-xs" style={{ color: "#ff4444" }}>
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {signUpErrors.username}
                  </p>
                )}
                {!signUpErrors.username && usernameAvailable === true && (
                  <p className="flex items-center gap-1.5 font-mono-tech text-xs" style={{ color: "#39ff14" }}>
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    Username is available!
                  </p>
                )}
                {!signUpErrors.username && usernameAvailable === false && (
                  <p className="flex items-center gap-1.5 font-mono-tech text-xs" style={{ color: "#ff4444" }}>
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    Username is already taken
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="signup-password" className="font-arcade text-[8px] tracking-widest" style={{ color: "rgba(191,95,255,0.8)" }}>
                  PASSWORD
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                    style={{ color: signUpErrors.password ? "#ff4444" : "rgba(191,95,255,0.5)" }}
                  />
                  <input
                    id="signup-password"
                    type={showSignUpPassword ? "text" : "password"}
                    value={signUp.password}
                    onChange={(e) => {
                      setSignUp((p) => ({ ...p, password: e.target.value }));
                      if (signUpErrors.password) setSignUpErrors((p) => ({ ...p, password: "" }));
                      setSignUpGlobalError(null);
                    }}
                    placeholder="min 6 characters"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-12 py-3 font-mono-tech text-sm outline-none transition-all duration-200"
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      border: `1px solid ${signUpErrors.password ? "rgba(255,68,68,0.6)" : "rgba(191,95,255,0.25)"}`,
                      color: "#e0f7fa",
                      borderRadius: "2px",
                      caretColor: "#bf5fff",
                    }}
                    onFocus={(e) => {
                      if (!signUpErrors.password) {
                        (e.target as HTMLInputElement).style.borderColor = "rgba(191,95,255,0.7)";
                        (e.target as HTMLInputElement).style.boxShadow = "0 0 10px rgba(191,95,255,0.15)";
                      }
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLInputElement).style.borderColor = signUpErrors.password
                        ? "rgba(255,68,68,0.6)"
                        : "rgba(191,95,255,0.25)";
                      (e.target as HTMLInputElement).style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-200"
                    style={{ color: "rgba(191,95,255,0.5)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = "#bf5fff";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = "rgba(191,95,255,0.5)";
                    }}
                  >
                    {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {signUpErrors.password && (
                  <p className="flex items-center gap-1.5 font-mono-tech text-xs" style={{ color: "#ff4444" }}>
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {signUpErrors.password}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="signup-confirm-password" className="font-arcade text-[8px] tracking-widest" style={{ color: "rgba(191,95,255,0.8)" }}>
                  CONFIRM PASSWORD
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                    style={{ color: signUpErrors.confirmPassword ? "#ff4444" : "rgba(191,95,255,0.5)" }}
                  />
                  <input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={signUp.confirmPassword}
                    onChange={(e) => {
                      setSignUp((p) => ({ ...p, confirmPassword: e.target.value }));
                      if (signUpErrors.confirmPassword) setSignUpErrors((p) => ({ ...p, confirmPassword: "" }));
                      setSignUpGlobalError(null);
                    }}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-12 py-3 font-mono-tech text-sm outline-none transition-all duration-200"
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      border: `1px solid ${signUpErrors.confirmPassword ? "rgba(255,68,68,0.6)" : "rgba(191,95,255,0.25)"}`,
                      color: "#e0f7fa",
                      borderRadius: "2px",
                      caretColor: "#bf5fff",
                    }}
                    onFocus={(e) => {
                      if (!signUpErrors.confirmPassword) {
                        (e.target as HTMLInputElement).style.borderColor = "rgba(191,95,255,0.7)";
                        (e.target as HTMLInputElement).style.boxShadow = "0 0 10px rgba(191,95,255,0.15)";
                      }
                    }}
                    onBlur={(e) => {
                      (e.target as HTMLInputElement).style.borderColor = signUpErrors.confirmPassword
                        ? "rgba(255,68,68,0.6)"
                        : "rgba(191,95,255,0.25)";
                      (e.target as HTMLInputElement).style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-200"
                    style={{ color: "rgba(191,95,255,0.5)" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = "#bf5fff";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color = "rgba(191,95,255,0.5)";
                    }}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {signUpErrors.confirmPassword && (
                  <p className="flex items-center gap-1.5 font-mono-tech text-xs" style={{ color: "#ff4444" }}>
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {signUpErrors.confirmPassword}
                  </p>
                )}
              </div>

              {signUpGlobalError && (
                <div
                  className="flex items-center gap-2 px-4 py-3 font-mono-tech text-xs"
                  style={{
                    background: "rgba(255,68,68,0.08)",
                    border: "1px solid rgba(255,68,68,0.4)",
                    color: "#ff6666",
                    borderRadius: "2px",
                    boxShadow: "0 0 10px rgba(255,68,68,0.1)",
                  }}
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {signUpGlobalError}
                </div>
              )}

              <button
                type="submit"
                disabled={signUpLoading || usernameAvailable === false}
                className="w-full py-3.5 font-arcade text-[9px] tracking-widest transition-all duration-200 flex items-center justify-center gap-2"
                style={{
                  background:
                    signUpLoading || usernameAvailable === false
                      ? "rgba(191,95,255,0.08)"
                      : "rgba(191,95,255,0.12)",
                  border: "1px solid rgba(191,95,255,0.45)",
                  color:
                    signUpLoading || usernameAvailable === false
                      ? "rgba(191,95,255,0.4)"
                      : "#bf5fff",
                  textShadow:
                    signUpLoading || usernameAvailable === false ? "none" : "0 0 10px rgba(191,95,255,0.7)",
                  boxShadow:
                    signUpLoading || usernameAvailable === false ? "none" : "0 0 15px rgba(191,95,255,0.1)",
                  borderRadius: "2px",
                  cursor:
                    signUpLoading || usernameAvailable === false ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!signUpLoading && usernameAvailable !== false) {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(191,95,255,0.18)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(191,95,255,0.25)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!signUpLoading && usernameAvailable !== false) {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(191,95,255,0.12)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 15px rgba(191,95,255,0.1)";
                  }
                }}
              >
                {signUpLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    CREATING ACCOUNT…
                  </>
                ) : (
                  "CREATE ACCOUNT ▶"
                )}
              </button>

              <p className="text-center font-mono-tech text-xs" style={{ color: "rgba(0,245,255,0.35)" }}>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setTab("signin")}
                  className="transition-colors duration-200"
                  style={{ color: "#00f5ff" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.textShadow = "0 0 8px #00f5ff";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.textShadow = "none";
                  }}
                >
                  Sign in →
                </button>
              </p>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center">
        <p className="font-mono-tech text-xs" style={{ color: "rgba(0,245,255,0.2)" }}>
          © 2026. Built with{" "}
          <span style={{ color: "#ff2d8e" }}>♥</span>
          {" "}using{" "}
          <a
            href="https://caffeine.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors"
            style={{ color: "rgba(0,245,255,0.45)" }}
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
