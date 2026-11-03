// Single source of truth for authentication against the Sentinel FastAPI
// backend. Owns the access/refresh tokens and the current user's profile, and
// is the ONLY place the token is read/written — api-client.ts imports the token
// accessor from here so the whole app shares one session. There is no longer
// any hard-coded credential baked into the bundle: users authenticate through
// the Login page and a real JWT is issued by POST /api/auth/login.

import { isDemoMode } from "@/lib/demo/demo-mode";

export const API_BASE =
  (import.meta.env as Record<string, string | undefined>).VITE_API_BASE_URL ?? "http://localhost:8000/api";

/**
 * Every backend request goes through here. In demo mode the in-browser mock
 * backend answers instead of the network (loaded lazily so it never ships in
 * the critical path for real deployments).
 */
export async function apiTransport(path: string, init: RequestInit = {}): Promise<Response> {
  if (isDemoMode()) {
    const { demoFetch } = await import("@/lib/demo/mock-backend");
    return demoFetch(path, init);
  }
  return fetch(`${API_BASE}${path}`, init);
}

const ACCESS_TOKEN_KEY = "sentinel_access_token";
const REFRESH_TOKEN_KEY = "sentinel_refresh_token";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  force_password_change: boolean;
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ---------------------------------------------------------------------- //
// Token store (memory-cached, localStorage-persisted)
// ---------------------------------------------------------------------- //
let accessToken: string | null = null;
let refreshToken: string | null = null;

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* localStorage unavailable (private mode) — in-memory only for this tab. */
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  accessToken = safeGet(ACCESS_TOKEN_KEY);
  return accessToken;
}

function getRefreshToken(): string | null {
  if (refreshToken) return refreshToken;
  refreshToken = safeGet(REFRESH_TOKEN_KEY);
  return refreshToken;
}

function persistTokens(access: string, refresh?: string) {
  accessToken = access;
  safeSet(ACCESS_TOKEN_KEY, access);
  if (refresh !== undefined) {
    refreshToken = refresh;
    safeSet(REFRESH_TOKEN_KEY, refresh);
  }
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  safeSet(ACCESS_TOKEN_KEY, null);
  safeSet(REFRESH_TOKEN_KEY, null);
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

// ---------------------------------------------------------------------- //
// Auth API
// ---------------------------------------------------------------------- //
async function readError(response: Response, fallback: string): Promise<AuthError> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return new AuthError(response.status, body.error?.message ?? fallback);
  } catch {
    return new AuthError(response.status, fallback);
  }
}

/** Authenticate with the backend. `identifier` may be a username or an email. */
export async function login(identifier: string, password: string): Promise<UserProfile> {
  const response = await apiTransport("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: identifier, password }),
  });
  if (!response.ok) {
    throw await readError(response, "Incorrect email or password.");
  }
  const data = (await response.json()) as { access_token: string; refresh_token: string };
  persistTokens(data.access_token, data.refresh_token);
  return fetchProfile();
}

/** Exchange the refresh token for a new access token. Returns false if it can't. */
export async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const response = await apiTransport("/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { access_token: string };
    persistTokens(data.access_token);
    return true;
  } catch {
    return false;
  }
}

export async function fetchProfile(): Promise<UserProfile> {
  const token = getAccessToken();
  if (!token) throw new AuthError(401, "Not authenticated.");
  const response = await apiTransport("/auth/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw await readError(response, "Could not load user profile.");
  }
  return (await response.json()) as UserProfile;
}

export function logout() {
  clearTokens();
}

/** Two-letter initials for avatars, derived from full name or username. */
export function initialsFor(user: Pick<UserProfile, "full_name" | "username">): string {
  const source = user.full_name?.trim() || user.username;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/** Humanised role label, e.g. "safety_lead" -> "Safety Lead". */
export function roleLabel(role: string): string {
  return role
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
