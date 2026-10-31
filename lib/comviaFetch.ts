import { clearAuthSession, getAccessToken, getRefreshToken, isImpersonating, updateTokenPair } from "@/lib/auth";

export type ComviaApiErrorBody = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};

export class ComviaApiError extends Error {
  readonly statusCode: number;
  readonly body: ComviaApiErrorBody | null;
  /** Payload JSON đầy đủ khi có (vd. body lỗi verify PDF 422 với mismatches). */
  readonly details: unknown | null;

  constructor(message: string, statusCode: number, body: ComviaApiErrorBody | null, details: unknown | null = null) {
    super(message);
    this.name = "ComviaApiError";
    this.statusCode = statusCode;
    this.body = body;
    this.details = details ?? body;
  }
}

function readJsonSafe<T>(res: Response): Promise<T | null> {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return Promise.resolve(null);
  return res.json().catch(() => null);
}

function parseErrorMessage(data: ComviaApiErrorBody | null, fallback: string) {
  if (!data) return fallback;
  const msg = data.message;
  if (typeof msg === "string" && msg) return msg;
  if (Array.isArray(msg) && msg.length) return msg.join(", ");
  if (typeof data.error === "string" && data.error) return data.error;
  return fallback;
}

/** Cùng quy ước với trang auth: ưu tiên env, dev fallback localhost backend Nest mặc định. */
export function getComviaApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:3000";
  const baseUrl = configured.replace(/\/$/, "");
  return /\/api\/v\d+$/.test(baseUrl) ? baseUrl : `${baseUrl}/api/v1`;
}

/**
 * Domain gốc của backend (KHÔNG gồm global prefix `/api/v1`) — dùng để ghép với các path
 * tĩnh backend trả về dạng tương đối (vd `/public/oa/<wsId>/<file>`), vì các path này được
 * serve ở gốc domain, không nằm dưới `/api/v1` như các endpoint API.
 */
export function getComviaOriginUrl() {
  return getComviaApiBaseUrl().replace(/\/$/, "").replace(/\/api\/v\d+$/, "");
}

/**
 * Ghép domain gốc (không phải base URL của API) với path tĩnh tương đối backend trả về
 * (vd `avatarUrl`/`logoLightUrl` dạng `/public/...`). URL tuyệt đối giữ nguyên.
 */
export function resolvePublicAssetUrl(url?: string | null): string | null {
  const u = url?.trim();
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const origin = getComviaOriginUrl();
  return `${origin}${u.startsWith("/") ? u : `/${u}`}`;
}

type RefreshResponse = { accessToken: string; refreshToken: string };

/** Làm mới access token trước khi hết hạn khoảng này, để user không gặp 401 → refresh → retry. */
const REFRESH_AHEAD_MS = 5 * 60_000;
const REFRESH_LOCK_NAME = "comvia-auth-refresh";

/** Đọc `exp` (epoch ms) từ JWT; trả null nếu không đọc được (token không phải JWT). */
function getTokenExpiresAt(token: string): number | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isExpiringSoon(token: string) {
  const expiresAt = getTokenExpiresAt(token);
  return expiresAt !== null && expiresAt - Date.now() <= REFRESH_AHEAD_MS;
}

/**
 * ISSUE-003 — warmup phiên 30 ngày. `refreshPromise` gộp các request cùng lúc trong một tab
 * thành một lần gọi `/auth/refresh`. Web Locks gộp thêm giữa các tab cùng origin: refresh token
 * bị rotate mỗi lần dùng, nên tab thứ hai dùng token cũ sẽ bị BE coi là bị lộ và thu hồi cả chuỗi.
 */
let refreshPromise: Promise<string | null> | null = null;

async function runExclusiveRefresh<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator === "undefined" || !navigator.locks) return task();

  let result!: T;
  await navigator.locks.request(REFRESH_LOCK_NAME, async () => {
    result = await task();
  });
  return result;
}

/**
 * Lấy access token mới thay cho `failedToken` (vừa bị 401 hoặc sắp hết hạn).
 * Trả null khi không còn phiên dùng được — lúc đó phiên đã bị xóa.
 */
function refreshAccessToken(failedToken: string): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = runExclusiveRefresh(() => refreshWithStoredToken(failedToken)).finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function refreshWithStoredToken(failedToken: string): Promise<string | null> {
  // Tab khác có thể vừa refresh xong trong lúc chờ khóa: dùng luôn token mới, không gọi refresh lần nữa.
  const current = getAccessToken();
  if (current && current !== failedToken && !isExpiringSoon(current)) return current;

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    // Phiên đăng nhập từ trước khi có warmup không có refresh token: không gia hạn được, buộc đăng nhập lại.
    clearAuthSession();
    return null;
  }

  try {
    const baseUrl = getComviaApiBaseUrl();
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      // Refresh token hết hạn/bị rotate/tài khoản khóa/đổi mật khẩu — không retry, buộc đăng nhập lại.
      clearAuthSession();
      return null;
    }

    const data = (await res.json()) as RefreshResponse;
    updateTokenPair({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.accessToken;
  } catch {
    return null;
  }
}

/** Token "đăng nhập hộ" (ISSUE-002) không có refreshToken — hết hạn là phải đăng nhập lại, không được lẫn sang refresh token của phiên admin thật đang nằm chung storage. */
function canAttemptRefresh(path: string, hadToken: boolean) {
  return hadToken && path !== "/auth/refresh" && !isImpersonating();
}

/** Token dùng cho request: nếu sắp hết hạn thì làm mới trước (warmup chủ động). */
async function resolveRequestToken(path: string, token: string | undefined): Promise<string | undefined> {
  if (!token || !canAttemptRefresh(path, true) || !isExpiringSoon(token)) return token;
  return (await refreshAccessToken(token)) ?? token;
}

export async function comviaFetch<T>(
  path: string,
  init?: RequestInit & { apiKey?: string; token?: string },
): Promise<T> {
  const baseUrl = getComviaApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

  function buildHeaders(token?: string) {
    const headers = new Headers(init?.headers);
    if (!headers.has("Content-Type") && init?.body != null) {
      headers.set("Content-Type", "application/json");
    }
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (init?.apiKey) headers.set("x-api-key", init.apiKey);
    return headers;
  }

  const requestToken = await resolveRequestToken(path, init?.token);
  let res = await fetch(url, { ...init, headers: buildHeaders(requestToken) });

  if (res.status === 401 && requestToken && canAttemptRefresh(path, true)) {
    const newToken = await refreshAccessToken(requestToken);
    if (newToken) {
      res = await fetch(url, { ...init, headers: buildHeaders(newToken) });
    }
  }

  if (!res.ok) {
    const data = await readJsonSafe<ComviaApiErrorBody>(res);
    const message = parseErrorMessage(data, `HTTP ${res.status}`);
    throw new ComviaApiError(message, res.status, data, data as unknown);
  }

  if (res.status === 204) return undefined as T;

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return undefined as T;

  return (await res.json()) as T;
}

/**
 * POST FormData — không được set `Content-Type` thủ công để boundary được set đúng.
 */
export async function comviaMultipartFetch<T>(
  path: string,
  init: Omit<RequestInit, "body"> & { token: string; formData: FormData },
): Promise<T> {
  const { token, formData, headers: hdrs, ...rest } = init;
  const baseUrl = getComviaApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

  async function send(authToken: string) {
    const headers = new Headers(hdrs);
    if (headers.has("Content-Type")) {
      headers.delete("Content-Type");
    }
    headers.set("Authorization", `Bearer ${authToken}`);
    return fetch(url, { ...rest, method: init.method ?? "POST", body: formData, headers });
  }

  const requestToken = (await resolveRequestToken(path, token)) ?? token;
  let res = await send(requestToken);

  if (res.status === 401 && canAttemptRefresh(path, true)) {
    const newToken = await refreshAccessToken(requestToken);
    if (newToken) {
      res = await send(newToken);
    }
  }

  const parsed = await readJsonSafe<T>(res);

  if (!res.ok) {
    const asBody =
      parsed && typeof parsed === "object" ? (parsed as ComviaApiErrorBody) : null;
    const message = parseErrorMessage(asBody, `HTTP ${res.status}`);
    throw new ComviaApiError(message, res.status, asBody, parsed);
  }

  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return undefined as T;
  return parsed as T;
}
