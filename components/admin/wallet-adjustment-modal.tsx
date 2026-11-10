"use client";

import { useState } from "react";
import { HiOutlineExclamationTriangle, HiOutlineMinusCircle, HiOutlinePlusCircle } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatVND } from "@/lib/utils";

/** Workspace đang được điều chỉnh — lấy từ một dòng của `GET /admin/workspaces`. */
export type WalletAdjustmentTarget = {
  id: string;
  name?: string;
  ownerUserId?: string;
};

/** Response `POST /admin/workspaces/:workspaceId/wallet-adjustment` — §14.1. Tiền là string (Decimal VND). */
export type WalletAdjustmentResult = {
  walletTransactionId: string;
  ownerUserId: string;
  workspaceId: string;
  direction: "CREDIT" | "DEBIT";
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  type: "MANUAL_ADJUSTMENT";
};

type Direction = "CREDIT" | "DEBIT";

const DIRECTION_OPTIONS: { value: Direction; label: string; hint: string }[] = [
  { value: "CREDIT", label: "Cộng tiền", hint: "Tăng số dư ví" },
  { value: "DEBIT", label: "Trừ tiền", hint: "Giảm số dư ví" },
];

/** Phân cách hàng nghìn kiểu vi-VN ngay trên chuỗi chữ số — không qua Number nên số rất dài vẫn hiển thị đúng. */
function groupDigits(digits: string) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Popup ADMIN điều chỉnh số dư ví thủ công (ISSUE-006, §14.1).
 *
 * Ba ràng buộc nghiệp vụ được phản ánh thẳng vào UI:
 * 1. Ví gắn ở cấp OWNER, không cấp workspace — owner nhiều workspace thì dùng chung một ví.
 *    Cảnh báo này hiện thường trực trên form, không ẩn sau tooltip.
 * 2. Backend không có trần số tiền và không có bước duyệt → bắt buộc qua bước xác nhận
 *    hiển thị lại số tiền đã format, và khoá nút trong lúc request chạy.
 * 3. Không có hoàn tác — sửa nhầm phải tạo một lệnh chiều ngược lại, và lệnh trừ đảo chiều
 *    có thể bị chặn bởi `Insufficient credit` nếu owner đã tiêu. Vì vậy KHÔNG có nút Undo.
 *
 * Component được mount lại theo `key={workspace.id}` ở phía cha nên state luôn sạch cho
 * mỗi lần mở — không cần effect reset.
 */
export function WalletAdjustmentModal({
  workspace,
  onClose,
  onAdjusted,
}: {
  workspace: WalletAdjustmentTarget;
  onClose: () => void;
  /** Gọi sau khi điều chỉnh thành công — nơi cha hiện thông báo và refetch danh sách. */
  onAdjusted: (result: WalletAdjustmentResult) => void;
}) {
  const [direction, setDirection] = useState<Direction>("CREDIT");
  const [amountInput, setAmountInput] = useState("");
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = amountInput.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  const parsed = digits ? Number(digits) : null;
  // `amount` phải là int ≥ 1 (§14.1). Quá Number.MAX_SAFE_INTEGER thì không gửi được chính xác.
  const amount = parsed != null && Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
  const amountTooLarge = digits.length > 0 && amount == null;
  const trimmedNote = note.trim();
  const directionLabel = direction === "CREDIT" ? "Cộng tiền" : "Trừ tiền";

  const canSubmit = amount != null && trimmedNote.length > 0;

  async function submit() {
    if (amount == null || !trimmedNote || submitting) return;
    const token = getAccessToken();
    if (!token) {
      // Phiên hết hạn giữa lúc mở form và lúc bấm xác nhận — báo rõ, không im lặng không làm gì.
      setError("Phiên đăng nhập đã hết hạn. Đăng nhập lại rồi thử lại.");
      setConfirming(false);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await comviaFetch<WalletAdjustmentResult>(
        `/admin/workspaces/${workspace.id}/wallet-adjustment`,
        {
          method: "POST",
          token,
          body: JSON.stringify({ direction, amount, note: trimmedNote }),
        },
      );
      onAdjusted(result);
    } catch (e) {
      // Hiển thị đúng message backend trả về (bảng lỗi §14.1: "Insufficient credit",
      // "Cannot adjust the wallet of a non-active workspace", "Workspace not found"...).
      setError(e instanceof ComviaApiError ? e.message : "Không điều chỉnh được số dư ví.");
      setConfirming(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Modal
        open
        size="md"
        title="Điều chỉnh số dư ví"
        onClose={onClose}
        footer={
          <>
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Hủy
            </Button>
            <Button
              variant="primary"
              disabled={!canSubmit || submitting}
              icon={
                direction === "CREDIT" ? (
                  <HiOutlinePlusCircle className="size-4" />
                ) : (
                  <HiOutlineMinusCircle className="size-4" />
                )
              }
              onClick={() => {
                setError(null);
                setConfirming(true);
              }}
            >
              Tiếp tục
            </Button>
          </>
        }
      >
        <div className="rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm">
          <p className="font-semibold text-foreground">{workspace.name ?? workspace.id}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            Workspace: {workspace.id}
            {workspace.ownerUserId ? ` · Owner: ${workspace.ownerUserId}` : null}
          </p>
        </div>

        {/* Ràng buộc #1 — ví cấp owner, dùng chung giữa các workspace cùng owner. */}
        <div className="flex gap-3 rounded-xl border border-amber-400/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <HiOutlineExclamationTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="space-y-1">
            <p className="font-semibold">Ví gắn với Owner, không gắn với workspace.</p>
            <p>
              Nếu owner này sở hữu nhiều workspace thì tất cả dùng chung một ví. Cộng &ldquo;cho workspace
              này&rdquo; làm tăng số dư mà các workspace khác cùng owner cũng tiêu được. Workspace ở đây chỉ
              là ngữ cảnh ghi nhận bút toán.
            </p>
          </div>
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-foreground">Chiều điều chỉnh</span>
          <div className="grid grid-cols-2 gap-2">
            {DIRECTION_OPTIONS.map((opt) => {
              const active = direction === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setDirection(opt.value)}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left transition",
                    active
                      ? "border-primary bg-surface-muted"
                      : "border-border hover:border-primary/60 hover:bg-surface-muted/60",
                  )}
                >
                  <span
                    className={cn(
                      "block text-sm font-semibold",
                      active
                        ? opt.value === "CREDIT"
                          ? "text-success"
                          : "text-danger"
                        : "text-foreground",
                    )}
                  >
                    {opt.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{opt.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="wallet-adjust-amount" className="mb-2 block text-sm font-medium text-foreground">
            Số tiền (VND)
          </label>
          <Input
            id="wallet-adjust-amount"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ví dụ: 500000"
            value={groupDigits(digits)}
            invalid={amountTooLarge}
            errorMessage={amountTooLarge ? "Số tiền quá lớn." : undefined}
            onChange={(e) => setAmountInput(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {amount != null ? (
              <span className="font-semibold text-foreground">{formatVND(amount)}</span>
            ) : (
              "Số nguyên dương, không có trần — kiểm tra kỹ số chữ số trước khi xác nhận."
            )}
          </p>
        </div>

        <div>
          <label htmlFor="wallet-adjust-note" className="mb-2 block text-sm font-medium text-foreground">
            Lý do điều chỉnh <span className="text-danger">*</span>
          </label>
          <Textarea
            id="wallet-adjust-note"
            rows={3}
            placeholder="Ví dụ: Khách chuyển khoản trực tiếp 500k ngày 10/11"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Bắt buộc. Lý do được lưu vào bút toán và hiển thị cho chủ ví trong lịch sử giao dịch.
          </p>
        </div>

        {error ? (
          <p className="rounded-xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>
        ) : null}
      </Modal>

      {/* Ràng buộc #2 — không có trần và không có bước duyệt ở backend, nên bước xác nhận này
          là lớp chặn duy nhất giữa một phím thừa và một bút toán sai gấp 10 lần. */}
      <Modal
        open={confirming}
        size="md"
        title="Xác nhận điều chỉnh số dư"
        onClose={() => {
          if (!submitting) setConfirming(false);
        }}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={submitting}>
              Quay lại
            </Button>
            <Button
              variant="primary"
              className={direction === "DEBIT" ? "bg-red-600 text-white" : undefined}
              disabled={submitting}
              onClick={() => void submit()}
            >
              {submitting ? "Đang xử lý…" : `Xác nhận ${directionLabel.toLowerCase()}`}
            </Button>
          </>
        }
      >
        <dl className="divide-y divide-border rounded-xl border border-border">
          <div className="flex items-start justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-muted-foreground">Workspace</dt>
            <dd className="text-right text-sm font-medium text-foreground">
              {workspace.name ?? workspace.id}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-muted-foreground">Chiều</dt>
            <dd
              className={cn(
                "text-right text-sm font-semibold",
                direction === "CREDIT" ? "text-success" : "text-danger",
              )}
            >
              {directionLabel}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-muted-foreground">Số tiền</dt>
            <dd
              className={cn(
                "text-right text-xl font-bold tabular-nums",
                direction === "CREDIT" ? "text-success" : "text-danger",
              )}
            >
              {direction === "CREDIT" ? "+" : "−"}
              {amount != null ? formatVND(amount) : "—"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 px-4 py-3">
            <dt className="text-sm text-muted-foreground">Lý do</dt>
            <dd className="text-right text-sm text-foreground">{trimmedNote || "—"}</dd>
          </div>
        </dl>

        {/* Ràng buộc #3 — không có hoàn tác. Nói thẳng ở đây, và không dựng nút Undo ở bất kỳ đâu. */}
        <div className="flex gap-3 rounded-xl border border-amber-400/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <HiOutlineExclamationTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="space-y-1">
            <p className="font-semibold">Thao tác này không hoàn tác được.</p>
            <p>
              Nhập nhầm thì phải tạo một lệnh điều chỉnh chiều ngược lại. Nếu owner đã tiêu phần cộng
              nhầm, lệnh trừ đảo chiều sẽ bị chặn bởi lỗi &ldquo;Insufficient credit&rdquo; và không thu
              hồi được.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
