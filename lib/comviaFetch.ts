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
  return process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:3000";
}

export async function comviaFetch<T>(
  path: string,
  init?: RequestInit & { apiKey?: string; token?: string },
): Promise<T> {
  const baseUrl = getComviaApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body != null) {
    headers.set("Content-Type", "application/json");
  }

  if (init?.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (init?.apiKey) headers.set("x-api-key", init.apiKey);

  const res = await fetch(url, {
    ...init,
    headers,
  });

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
 * @see `docs/FRONTEND_ADMIN_ROUTER_API_MAP.mdc` Issue hóa đơn qua PDF.
 */
export async function comviaMultipartFetch<T>(
  path: string,
  init: Omit<RequestInit, "body"> & { token: string; formData: FormData },
): Promise<T> {
  const { token, formData, headers: hdrs, ...rest } = init;
  const baseUrl = getComviaApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(hdrs);
  if (headers.has("Content-Type")) {
    headers.delete("Content-Type");
  }
  headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, {
    ...rest,
    method: init.method ?? "POST",
    body: formData,
    headers,
  });

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
