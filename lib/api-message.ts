import { ComviaApiError } from "@/lib/comviaFetch";

/** Chuỗi lỗi hiển thị — hỗ trợ `message` object từ ZNS/campaign. */
export function formatComviaError(e: unknown, fallback = "Đã xảy ra lỗi.") {
  if (!(e instanceof ComviaApiError)) return fallback;
  const raw = e.body?.message ?? e.message;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw.join(", ");
  if (raw && typeof raw === "object" && "message" in raw) {
    const inner = (raw as { message?: string }).message;
    if (typeof inner === "string") return inner;
  }
  return e.message || fallback;
}
