import { ComviaApiError } from "@/lib/comviaFetch";

/** Type theo `fe-quickref-2026-11-23.md` mục A7 / guide 9B / admin map 8A. */
export type CurrentSubscriptionStatus = "NONE" | "ACTIVE" | "EXPIRED";
export type SubscriptionState = "ACTIVE" | "UPCOMING" | "EXPIRED" | "CANCELLED";
export type WorkspaceSubscriptionStatus = "ACTIVE" | "CANCELLED";
export type SubscriptionPurchaseStatus = "PENDING" | "PAID" | "FAILED";
export type OrderType = "TOPUP" | "SUBSCRIPTION";
export type SubscriptionSource = "PURCHASE" | "ADMIN_GRANT";
export type CampaignPauseReason = "OA_DISCONNECTED" | "SUBSCRIPTION_EXPIRED" | null;

export type PaginatedMeta = { page: number; limit: number; total: number; totalPages: number };
export type Paginated<T> = { data: T[]; meta: PaginatedMeta };

/** `GET /subscriptions/current` — guide 9B.2. */
export type CurrentSubscription = {
  status: CurrentSubscriptionStatus;
  canSend: boolean;
  plan: { id: string; code: string; name: string } | null;
  startsAt: string | null;
  endsAt: string | null;
  daysRemaining: number | null;
  expiredAt: string | null;
};

/** Gói đang bán — `GET /subscription-plans` và `GET/POST/PATCH /admin/subscription-plans`. */
export type SubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  durationYears: number;
  priceExclVat: number;
  vatPercent: number;
  vatAmount: number;
  totalAmountInclVat: number;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

/** Đơn mua gói — response 9B.3/9B.4/9B.5. `expected*` chỉ có ở bước tạo, `order/startsAt/endsAt` chỉ có ở lịch sử. */
export type SubscriptionPurchase = {
  id: string;
  purchaseCode: string;
  planId: string;
  planName: string;
  durationYears: number;
  amountExclVat: number;
  vatPercent: number;
  vatAmount: number;
  amountInclVat: number;
  status: SubscriptionPurchaseStatus;
  qrCodeUrl: string | null;
  paidAt: string | null;
  createdAt: string;
  expectedStartsAt?: string;
  expectedEndsAt?: string;
  order?: { id: string; orderCode: string } | null;
  startsAt?: string | null;
  endsAt?: string | null;
};

/** Phần tử `GET /admin/subscriptions` (cùng shape với PATCH và cấp tay). */
export type AdminSubscription = {
  id: string;
  workspace: {
    id: string;
    name?: string;
    slug?: string;
    status?: string;
    owner?: { id?: string; email?: string; fullName?: string } | null;
  };
  plan: { id: string; code: string; name: string; durationYears?: number };
  orderId?: string | null;
  order?: { id: string; orderCode: string } | null;
  purchaseId: string | null;
  source: SubscriptionSource;
  startsAt: string;
  endsAt: string;
  durationDays: number;
  status: WorkspaceSubscriptionStatus;
  state: SubscriptionState;
  daysRemaining: number;
  note: string | null;
};

/** Ngưỡng Pay2S: gói có tổng sau VAT thấp hơn mức này tạo được nhưng owner không mua được. */
export const MIN_PAY2S_AMOUNT = 10_000;

/** Gợi ý UX: banner "sắp hết hạn" khi còn không quá số ngày này. */
export const EXPIRING_SOON_DAYS = 7;

export const SUBSCRIPTION_ERROR_CODES = ["SUBSCRIPTION_REQUIRED", "SUBSCRIPTION_EXPIRED"] as const;

/** Mã lỗi nghiệp vụ trong body 400 (`null` với lỗi thường không có `code`). */
export function apiErrorCode(e: unknown): string | null {
  return e instanceof ComviaApiError ? e.code : null;
}

/** Gửi tin bị chặn vì workspace chưa có gói / gói hết hạn (guide 9B.6). */
export function isSubscriptionBlockedError(e: unknown): boolean {
  const code = apiErrorCode(e);
  return code !== null && (SUBSCRIPTION_ERROR_CODES as readonly string[]).includes(code);
}

const PAY2S_UNAVAILABLE_CODE = "PAY2S_UNAVAILABLE";
/**
 * Trước khi BE deploy `PAY2S_UNAVAILABLE`, lỗi tạo QR là chuỗi tiếng Anh không có `code`
 * ("Failed to create Pay2S collection request: …") — xử lý cả hai dạng (handoff, mục Trạng thái BE).
 */
const LEGACY_PAY2S_FAILURE = /failed to create pay2s/i;

/** Tạo QR Pay2S lỗi (mua gói và nạp ví) → hiện thông báo + nút Thử lại (tạo đơn mới). */
export function isPay2sUnavailableError(e: unknown): boolean {
  if (!(e instanceof ComviaApiError)) return false;
  if (e.code === PAY2S_UNAVAILABLE_CODE) return true;
  return e.code === null && e.statusCode === 400 && LEGACY_PAY2S_FAILURE.test(e.message);
}

/** Thông báo cho lỗi Pay2S: ưu tiên `message` BE, dạng cũ thì thay bằng câu tiếng Việt. */
export function pay2sErrorMessage(e: unknown): string {
  if (e instanceof ComviaApiError && e.code === PAY2S_UNAVAILABLE_CODE && e.message) return e.message;
  return "Cổng thanh toán đang bận, vui lòng thử lại sau.";
}

/** `price + round(price × vat / 100)` — cùng công thức BE (admin map 8A). */
export function calcPlanAmounts(priceExclVat: number, vatPercent: number) {
  const price = Number.isFinite(priceExclVat) ? priceExclVat : 0;
  const percent = Number.isFinite(vatPercent) ? vatPercent : 0;
  const vatAmount = Math.round((price * percent) / 100);
  return { vatAmount, total: price + vatAmount };
}

export const SOURCE_LABELS: Record<SubscriptionSource, string> = {
  PURCHASE: "Khách mua",
  ADMIN_GRANT: "Admin cấp",
};

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  TOPUP: "Nạp ví",
  SUBSCRIPTION: "Mua gói",
};

/** Nhãn loại đơn; giá trị lạ thì trả nguyên văn. */
export function orderTypeLabel(type?: string | null): string | null {
  if (!type) return null;
  return ORDER_TYPE_LABELS[type as OrderType] ?? type;
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("vi-VN");
}

export function formatDateOnly(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("vi-VN");
}

/** ISO → giá trị cho `<input type="datetime-local">` (giờ máy). */
export function isoToLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Giá trị `<input type="datetime-local">` → ISO; rỗng/không hợp lệ → `null`. */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Header `x-workspace-id` cho các API workspace ngoài path `:workspaceId` (guide 9B). */
export function workspaceHeader(workspaceId: string): Record<string, string> {
  return { "x-workspace-id": workspaceId };
}
