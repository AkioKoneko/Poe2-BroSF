import type { UserId } from "../types";

const AUTH_KEY = "brossf-local-auth:v1";

export function loadLocalAuth(): UserId | null {
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId?: UserId };
    return parsed.userId ?? null;
  } catch {
    return null;
  }
}

export function saveLocalAuth(userId: UserId): void {
  try {
    window.localStorage.setItem(AUTH_KEY, JSON.stringify({ userId }));
  } catch {
    // localStorage can be blocked; auth will still work for the current tab.
  }
}

export function clearLocalAuth(): void {
  try {
    window.localStorage.removeItem(AUTH_KEY);
  } catch {
    // no-op
  }
}
