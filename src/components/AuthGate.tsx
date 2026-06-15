import { FormEvent, useMemo, useState } from "react";
import type { Player } from "../types";

interface AuthGateProps {
  players: Player[];
  mockMode: boolean;
  onLogin: (accountName: string, password: string) => void | Promise<void>;
  onInvite: (token: string, password: string) => void | Promise<void>;
  error?: string;
}

type AuthMode = "login" | "invite";

function getInitialInviteToken(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("invite") ?? "";
}

export function AuthGate({
  players,
  mockMode,
  onLogin,
  onInvite,
  error: externalError,
}: AuthGateProps) {
  const initialInviteToken = getInitialInviteToken();
  const [mode, setMode] = useState<AuthMode>(
    initialInviteToken ? "invite" : "login",
  );
  const [accountName, setAccountName] = useState("Сашенька");
  const [password, setPassword] = useState("");
  const [inviteToken, setInviteToken] = useState(initialInviteToken);
  const [error, setError] = useState("");

  const playerByName = useMemo(() => {
    return new Map(
      players.map((player) => [player.accountName.toLowerCase(), player]),
    );
  }, [players]);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mockMode && !playerByName.get(accountName.trim().toLowerCase())) {
      setError("Unknown account in this local mock.");
      return;
    }
    setError("");
    await onLogin(accountName.trim(), password);
  }

  async function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mockMode && !inviteToken.trim()) {
      setError("Invite token is required.");
      return;
    }
    setError("");
    await onInvite(inviteToken.trim(), password);
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">
          <p className="eyebrow">Shared Wishlist / SSF Trade Pact</p>
          <h1 id="auth-title">BROSF</h1>
          <div className="rule" />
        </div>

        {mode === "login" ? (
          <form className="auth-form" onSubmit={submitLogin}>
            <label>
              Account name
              <input
                autoComplete="username"
                value={accountName}
                onChange={(event) => setAccountName(event.target.value)}
                placeholder="Сашенька"
              />
            </label>
            <label>
              Password
              <input
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="local mock accepts anything"
              />
            </label>
            {error || externalError ? (
              <p className="form-error">{error || externalError}</p>
            ) : null}
            <button className="primary-action" type="submit">
              Enter the Pact
            </button>
            <button
              className="text-action"
              type="button"
              onClick={() => setMode("invite")}
            >
              Claim invite instead
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={submitInvite}>
            <div className="locked-account">
              <span>Invite</span>
              <strong>{mockMode ? "Пашенька" : "BROSF account"}</strong>
            </div>
            {!mockMode ? (
              <label>
                Invite token
                <input
                  autoComplete="one-time-code"
                  value={inviteToken}
                  onChange={(event) => setInviteToken(event.target.value)}
                  placeholder="from invite link"
                />
              </label>
            ) : null}
            <label>
              Create password
              <input
                autoComplete="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="stored later by Supabase"
              />
            </label>
            <button className="primary-action" type="submit">
              Claim & Enter
            </button>
            {error || externalError ? (
              <p className="form-error">{error || externalError}</p>
            ) : null}
            <button
              className="text-action"
              type="button"
              onClick={() => setMode("login")}
            >
              Back to login
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
