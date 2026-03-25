export type ComviaApiErrorBody = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
};

export class ComviaApiError extends Error {
  readonly statusCode: number;
  readonly body: ComviaApiErrorBody | null;

  constructor(message: string, statusCode: number, body: ComviaApiErrorBody | null) {
    super(message);
    this.name = "ComviaApiError";
    this.statusCode = statusCode;
    this.body = body;
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
    throw new ComviaApiError(message, res.status, data);
  }

  if (res.status === 204) return undefined as T;

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return undefined as T;

  return (await res.json()) as T;
}
