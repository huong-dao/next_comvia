/**
 * Loại giao dịch ví — Phụ lục A `WalletTransactionType` (FRONTEND_API_GUIDE_NEXTJS.mdc).
 * Hiển thị map nhãn ở client, KHÔNG đổi giá trị enum gửi/nhận.
 */
export type WalletTransactionType =
  | "TOPUP_CREDIT"
  | "MESSAGE_DEBIT"
  | "CAMPAIGN_HOLD"
  | "CAMPAIGN_REFUND"
  | "MANUAL_ADJUSTMENT"
  | "REVERSAL";

export const WALLET_TX_TYPE_LABELS: Record<WalletTransactionType, string> = {
  TOPUP_CREDIT: "Nạp tiền",
  MESSAGE_DEBIT: "Trừ phí gửi tin",
  CAMPAIGN_HOLD: "Tạm giữ chiến dịch",
  CAMPAIGN_REFUND: "Hoàn tiền chiến dịch",
  MANUAL_ADJUSTMENT: "Điều chỉnh thủ công",
  REVERSAL: "Đảo giao dịch",
};

export const WALLET_TX_TYPE_OPTIONS = Object.keys(WALLET_TX_TYPE_LABELS) as WalletTransactionType[];

/** Nhãn hiển thị; enum lạ ngoài hợp đồng thì trả nguyên giá trị gốc (không bịa nhãn). */
export function walletTxTypeLabel(type?: string | null) {
  if (!type) return null;
  return WALLET_TX_TYPE_LABELS[type as WalletTransactionType] ?? type;
}

/**
 * Chiều tiền của một bút toán.
 *
 * `amount` trên `WalletTransaction` LUÔN dương với mọi `type` — kể cả giao dịch trừ tiền
 * (§9.2: "FE muốn hiện dấu/màu theo chiều tiền thì so `balanceAfter` với `balanceBefore`,
 * đừng dựa vào dấu của `amount`"). `MANUAL_ADJUSTMENT` cũng không có field `direction`
 * trong bản ghi, nên đây là cách duy nhất nhận ra admin cộng hay trừ.
 *
 * Trả `null` khi thiếu dữ liệu để so, hoặc số dư không đổi — khi đó hiển thị trung tính,
 * không đoán dấu.
 */
export function walletTxDirection(row: {
  balanceBefore?: string | null;
  balanceAfter?: string | null;
}): "CREDIT" | "DEBIT" | null {
  if (row.balanceBefore == null || row.balanceAfter == null) return null;
  const before = Number(row.balanceBefore);
  const after = Number(row.balanceAfter);
  if (!Number.isFinite(before) || !Number.isFinite(after)) return null;
  if (after > before) return "CREDIT";
  if (after < before) return "DEBIT";
  return null;
}
