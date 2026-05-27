import { getComviaApiBaseUrl } from "@/lib/comviaFetch";

/** URL để mở / tải PDF từ `invoicePdfUrl` (đường dẫn tương đối trên backend hoặc URL tuyệt đối). */
export function resolveInvoicePdfHref(url?: string | null): string | null {
  const u = url?.trim();
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const base = getComviaApiBaseUrl().replace(/\/$/, "");
  return `${base}${u.startsWith("/") ? u : `/${u}`}`;
}
