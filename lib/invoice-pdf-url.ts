import { resolvePublicAssetUrl } from "@/lib/comviaFetch";

/** URL để mở / tải PDF từ `invoicePdfUrl` (đường dẫn tương đối trên backend hoặc URL tuyệt đối). */
export function resolveInvoicePdfHref(url?: string | null): string | null {
  return resolvePublicAssetUrl(url);
}
