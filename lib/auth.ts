export const COMVIA_ACCESS_TOKEN_KEY = "comvia_access_token";
export const COMVIA_USER_KEY = "comvia_user";

/**
 * Token "đăng nhập hộ" (ISSUE-002) luôn nằm riêng ở sessionStorage của đúng
 * tab đó — không bao giờ ghi vào localStorage — để không ảnh hưởng phiên
 * admin đang mở ở tab gốc. getAccessToken()/getStoredUser() ưu tiên đọc
 * các key này trước khi rơi về phiên đăng nhập thường.
 */
export const COMVIA_IMPERSONATION_TOKEN_KEY = "comvia_impersonation_token";
export const COMVIA_IMPERSONATION_USER_KEY = "comvia_impersonation_user";
export const COMVIA_IMPERSONATION_META_KEY = "comvia_impersonation_meta";

export type StoredUser = {
  id?: string;
  email?: string;
  fullName?: string;
  role?: string;
};

export type ImpersonationMeta = {
  workspaceId: string;
  workspaceName?: string;
  adminId?: string;
  adminEmail?: string;
  adminFullName?: string;
  /** Epoch ms — tính từ lúc nhận token + `expiresInMinutes` BE trả về. */
  expiresAt: number;
};

export function saveAuthSession(payload: {
  accessToken: string;
  user?: StoredUser;
  remember: boolean;
}) {
  // Một phiên đăng nhập thật luôn thay thế phiên đăng nhập hộ (nếu có) ở tab này.
  clearImpersonationSession();

  const storage = payload.remember ? window.localStorage : window.sessionStorage;
  const otherStorage = payload.remember ? window.sessionStorage : window.localStorage;

  otherStorage.removeItem(COMVIA_ACCESS_TOKEN_KEY);
  otherStorage.removeItem(COMVIA_USER_KEY);

  storage.setItem(COMVIA_ACCESS_TOKEN_KEY, payload.accessToken);
  if (payload.user) {
    storage.setItem(COMVIA_USER_KEY, JSON.stringify(payload.user));
  }
}

/** Lưu phiên "đăng nhập hộ Owner" — chỉ sessionStorage, chỉ cho tab hiện tại. */
export function saveImpersonationSession(payload: {
  accessToken: string;
  user: StoredUser;
  meta: ImpersonationMeta;
}) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(COMVIA_IMPERSONATION_TOKEN_KEY, payload.accessToken);
  window.sessionStorage.setItem(COMVIA_IMPERSONATION_USER_KEY, JSON.stringify(payload.user));
  window.sessionStorage.setItem(COMVIA_IMPERSONATION_META_KEY, JSON.stringify(payload.meta));
}

export function getImpersonationToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(COMVIA_IMPERSONATION_TOKEN_KEY);
}

export function getImpersonationMeta(): ImpersonationMeta | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(COMVIA_IMPERSONATION_META_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ImpersonationMeta;
  } catch {
    return null;
  }
}

export function isImpersonating(): boolean {
  return Boolean(getImpersonationToken());
}

export function clearImpersonationSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(COMVIA_IMPERSONATION_TOKEN_KEY);
  window.sessionStorage.removeItem(COMVIA_IMPERSONATION_USER_KEY);
  window.sessionStorage.removeItem(COMVIA_IMPERSONATION_META_KEY);
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;

  const impersonationToken = window.sessionStorage.getItem(COMVIA_IMPERSONATION_TOKEN_KEY);
  if (impersonationToken) return impersonationToken;

  return (
    window.localStorage.getItem(COMVIA_ACCESS_TOKEN_KEY) ??
    window.sessionStorage.getItem(COMVIA_ACCESS_TOKEN_KEY)
  );
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;

  clearImpersonationSession();
  window.localStorage.removeItem(COMVIA_ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(COMVIA_USER_KEY);
  window.sessionStorage.removeItem(COMVIA_ACCESS_TOKEN_KEY);
  window.sessionStorage.removeItem(COMVIA_USER_KEY);
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;

  const impersonationUser = window.sessionStorage.getItem(COMVIA_IMPERSONATION_USER_KEY);
  if (impersonationUser) {
    try {
      return JSON.parse(impersonationUser) as StoredUser;
    } catch {
      // rơi về phiên thường bên dưới nếu JSON hỏng
    }
  }

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
  if (r === "ADMIN") return "/app/workspaces";
  if (r === "STAFF") return "/staff";
  return "/app/workspaces";
}
