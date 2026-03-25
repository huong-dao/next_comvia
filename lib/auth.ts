export const COMVIA_ACCESS_TOKEN_KEY = "comvia_access_token";
export const COMVIA_USER_KEY = "comvia_user";

export type StoredUser = {
  id?: string;
  email?: string;
  fullName?: string;
  role?: string;
};

export function saveAuthSession(payload: {
  accessToken: string;
  user?: StoredUser;
  remember: boolean;
}) {
  const storage = payload.remember ? window.localStorage : window.sessionStorage;
  const otherStorage = payload.remember ? window.sessionStorage : window.localStorage;

  otherStorage.removeItem(COMVIA_ACCESS_TOKEN_KEY);
  otherStorage.removeItem(COMVIA_USER_KEY);

  storage.setItem(COMVIA_ACCESS_TOKEN_KEY, payload.accessToken);
  if (payload.user) {
    storage.setItem(COMVIA_USER_KEY, JSON.stringify(payload.user));
  }
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;

  return (
    window.localStorage.getItem(COMVIA_ACCESS_TOKEN_KEY) ??
    window.sessionStorage.getItem(COMVIA_ACCESS_TOKEN_KEY)
  );
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem(COMVIA_ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(COMVIA_USER_KEY);
  window.sessionStorage.removeItem(COMVIA_ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(COMVIA_USER_KEY);
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;

  const raw =
    window.localStorage.getItem(COMVIA_USER_KEY) ?? window.sessionStorage.getItem(COMVIA_USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

/** Home path after auth — see `FRONTEND_SITEMAP_UX.mdc` §1 (Admin vs App). */
export function postLoginPathForRole(role?: string | null): string {
  const r = String(role ?? "").toUpperCase();
  if (r === "ADMIN") return "/admin";
  if (r === "STAFF") return "/staff";
  return "/app/workspaces";
}
