import { ComviaApiError, type ComviaApiErrorBody, getComviaApiBaseUrl } from "@/lib/comviaFetch";

function parseErrorMessage(data: ComviaApiErrorBody | null, fallback: string) {
  if (!data) return fallback;
  const msg = data.message;
  if (typeof msg === "string" && msg) return msg;
  if (Array.isArray(msg) && msg.length) return msg.join(", ");
  if (typeof data.error === "string" && data.error) return data.error;
  return fallback;
}

function filenameFromDisposition(header: string | null, fallback: string) {
  if (!header) return fallback;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8?.[1]) return decodeURIComponent(utf8[1].trim());
  const plain = /filename="?([^";]+)"?/i.exec(header);
  if (plain?.[1]) return plain[1].trim();
  return fallback;
}

/** Tải file binary (CSV, …) từ API Comvia. */
export async function comviaDownloadBlob(
  path: string,
  init: { token: string; method?: string; fallbackFilename?: string },
) {
  const baseUrl = getComviaApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${init.token}` },
  });

  if (!res.ok) {
    const ct = res.headers.get("content-type") ?? "";
    let body: ComviaApiErrorBody | null = null;
    if (ct.includes("application/json")) {
      body = await res.json().catch(() => null);
    }
    throw new ComviaApiError(parseErrorMessage(body, `HTTP ${res.status}`), res.status, body, body);
  }

  const blob = await res.blob();
  const name = filenameFromDisposition(
    res.headers.get("content-disposition"),
    init.fallbackFilename ?? "download.csv",
  );
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = name;
  a.click();
  URL.revokeObjectURL(objectUrl);
}
