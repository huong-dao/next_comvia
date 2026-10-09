"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HiQrCode } from "react-icons/hi2";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useAlertModal } from "@/components/ui/alert-modal";
import {
  useTopupStatusPolling,
  type TopupFailedStatus,
  type TopupStatusResponse,
} from "@/lib/use-topup-status";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";
import { formatVND } from "@/lib/utils";
import { cn } from "@/lib/cn";

/** Các mốc nạp tiền 500.000 → 5.000.000, bước 500.000 (ISSUE-005, không nhập tự do). */
const AMOUNT_OPTIONS = Array.from({ length: 10 }, (_, i) => (i + 1) * 500_000);
const DEFAULT_AMOUNT = AMOUNT_OPTIONS[0];

/** Response `POST /topups/create-with-pay2s` — §9.4 FRONTEND_API_GUIDE_NEXTJS.mdc. */
type CreateTopupResponse = {
  topupCode?: string;
  paymentProvider?: string;
  qrCodeUrl?: string;
  amountInclVat?: number;
};

/** Một tài khoản ngân hàng nhận tiền — `GET /public/money-accounts/active-for-topup`. */
type MoneyAccountRow = {
  id?: string;
  accountNumber?: string;
  bankName?: string;
  bankCode?: string;
};

type MoneyAccountsResponse = {
  success: boolean;
  data: MoneyAccountRow[];
  message: string;
};

export type TopupModalProps = {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  /** Gọi ngay sau khi popup tự đóng vì topup `PAID` — nơi cha refetch số dư + danh sách giao dịch (không reload trang). */
  onPaid: () => void;
};

/**
 * Popup nạp tiền 2 bước: bước 1 chọn mốc tiền (500k–5tr) → bước 2 hiện QR + poll trạng thái.
 * Khi `PAID`: đóng popup ngay, gọi `onPaid` (nơi cha refetch số dư/danh sách giao dịch), rồi hiện
 * modal alert dùng chung (`useAlertModal`) báo thành công kèm số tiền thực nhận.
 * `FAILED`/`EXPIRED` → modal alert lỗi; timeout 5 phút → modal alert cảnh báo.
 * Đóng popup làm `topupCode` về null nên polling tự dừng.
 *
 * @see docs/tickets/TICKET-010.md, coding-convention.md mục "Toast/Alert", "Polling trạng thái".
 */
export function TopupModal({ open, onClose, workspaceId, onPaid }: TopupModalProps) {
  const { showAlert } = useAlertModal();

  const [step, setStep] = useState<"select" | "qr">("select");
  const [amount, setAmount] = useState<number>(DEFAULT_AMOUNT);
  const [qr, setQr] = useState<CreateTopupResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [moneyAccounts, setMoneyAccounts] = useState<MoneyAccountRow[]>([]);
  const [moneyAccountId, setMoneyAccountId] = useState("");

  const vat = useMemo(() => Math.round(amount * 0.1), [amount]);
  const incl = useMemo(() => amount + vat, [amount, vat]);

  // Chỉ poll khi popup mở và đang ở bước QR có topupCode — đóng popup → null → hook tự dọn.
  const topupCode = open && step === "qr" ? qr?.topupCode ?? null : null;

  // Reset state nội bộ rồi đóng — mọi đường đóng (nút X, nền, PAID) đều qua đây.
  const close = useCallback(() => {
    setStep("select");
    setQr(null);
    setErr(null);
    setBusy(false);
    onClose();
  }, [onClose]);

  // PAID: đóng popup ngay, gọi onPaid (parent refetch số dư/danh sách giao dịch), rồi hiện
  // modal alert báo thành công kèm số tiền thực nhận từ BE.
  const handlePaid = useCallback(
    (res: TopupStatusResponse) => {
      close();
      onPaid();
      showAlert({
        type: "success",
        title: "Nạp tiền thành công",
        // amountExclVat mới là phần cộng vào ví — VAT được giữ lại để nộp thuế, KHÔNG cộng vào ví.
        message: `Số tiền nạp vào ví: ${formatVND(res.amountExclVat)}\nVAT (10%): ${formatVND(res.vatAmount)}\nTổng đã thanh toán: ${formatVND(res.amountInclVat)}`,
      });
    },
    [close, onPaid, showAlert],
  );

  const handleFailed = useCallback(
    (status: TopupFailedStatus) => {
      close();
      showAlert({
        type: "error",
        title: "Giao dịch không thành công",
        message:
          status === "EXPIRED"
            ? "Mã QR đã hết hạn. Vui lòng tạo lại yêu cầu nạp tiền."
            : "Giao dịch nạp tiền thất bại. Vui lòng thử lại.",
      });
    },
    [close, showAlert],
  );

  const handleTimeout = useCallback(() => {
    close();
    showAlert({
      type: "warning",
      title: "Chưa nhận được thanh toán",
      message: "Chưa nhận được thanh toán sau 5 phút. Vui lòng kiểm tra lại giao dịch.",
    });
  }, [close, showAlert]);

  useTopupStatusPolling(topupCode, {
    workspaceId,
    onPaid: handlePaid,
    onFailed: handleFailed,
    onTimeout: handleTimeout,
  });

  // Lấy danh sách tài khoản ngân hàng khi mở popup (một lần cho mỗi lần mở).
  useEffect(() => {
    if (!open || moneyAccounts.length > 0) return;
    let active = true;
    void (async () => {
      try {
        const res = await comviaFetch<MoneyAccountsResponse>(
          `/public/money-accounts/active-for-topup`,
          { token: getAccessToken() ?? undefined },
        );
        if (!active) return;
        if (!res.success) throw new Error(res.message);
        setMoneyAccounts(res.data);
        setMoneyAccountId(res.data[0]?.id ?? "");
      } catch (e) {
        if (!active) return;
        setErr(
          e instanceof ComviaApiError
            ? e.message
            : "Không lấy được danh sách tài khoản ngân hàng.",
        );
      }
    })();
    return () => {
      active = false;
    };
  }, [open, moneyAccounts.length]);

  const createQr = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    if (!moneyAccountId) {
      setErr("Chưa có tài khoản ngân hàng để nạp tiền.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await comviaFetch<CreateTopupResponse>(`/topups/create-with-pay2s`, {
        method: "POST",
        token,
        headers: {
          "x-workspace-id": workspaceId, // Khớp WorkspaceHeaderGuard — §9.4.
        },
        body: JSON.stringify({ amountExclVat: amount, moneyAccountId }),
      });
      setQr(res);
      setStep("qr");
    } catch (e) {
      setErr(e instanceof ComviaApiError ? e.message : "Không tạo được QR.");
    } finally {
      setBusy(false);
    }
  }, [amount, moneyAccountId, workspaceId]);

  return (
    <Modal
      open={open}
      onClose={close}
      title="Nạp tiền"
      footer={
        step === "select" ? (
          <>
            <Button variant="ghost" onClick={close}>
              Hủy
            </Button>
            <Button
              icon={<HiQrCode className="size-4" />}
              disabled={busy}
              onClick={() => void createQr()}
            >
              {busy ? "Đang tạo…" : "Tạo QR"}
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={close}>
            Đóng
          </Button>
        )
      }
    >
      {step === "select" ? (
        <div className="space-y-5">
          <div>
            <p className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Chọn số tiền nạp (trước VAT)
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {AMOUNT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={amount === opt}
                  onClick={() => setAmount(opt)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-medium tabular-nums transition",
                    amount === opt
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-foreground hover:border-primary/60",
                  )}
                >
                  {formatVND(opt)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tài khoản ngân hàng
            </label>
            <Select
              value={moneyAccountId}
              onChange={(e) => setMoneyAccountId(e.target.value)}
              disabled={moneyAccounts.length === 0}
            >
              {moneyAccounts.length === 0 ? (
                <option value="">Đang tải tài khoản…</option>
              ) : (
                moneyAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.bankCode} - {account.bankName} - {account.accountNumber}
                  </option>
                ))
              )}
            </Select>
          </div>

          <div className="space-y-2 rounded-xl bg-surface-muted p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trước VAT</span>
              <span className="font-medium tabular-nums">{formatVND(amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT 10%</span>
              <span className="font-medium tabular-nums">{formatVND(vat)}</span>
            </div>
            <div className="flex justify-between border-t border-border/60 pt-2 font-semibold">
              <span>Tổng thanh toán</span>
              <span className="tabular-nums">{formatVND(incl)}</span>
            </div>
          </div>

          {err ? <p className="text-sm text-danger">{err}</p> : null}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col items-center justify-center space-y-3 rounded-xl border border-dashed border-border bg-white p-6">
            {qr?.qrCodeUrl ? (
              <div className="relative aspect-square w-60 overflow-hidden rounded-lg border shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element -- QR từ Pay2S, next/image không tối ưu URL ngoài */}
                <img
                  src={qr.qrCodeUrl}
                  alt="QR Code thanh toán"
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex aspect-square w-60 items-center justify-center bg-muted">
                <p className="text-xs text-muted-foreground">Đang tải ảnh QR…</p>
              </div>
            )}
            <p className="text-[10px] italic text-muted-foreground">
              Quét mã qua ứng dụng Ngân hàng hoặc Ví điện tử
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase text-muted-foreground">
                Mã nạp tiền
              </p>
              <p className="font-mono font-semibold text-primary">{qr?.topupCode}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase text-muted-foreground">
                Tổng tiền
              </p>
              <p className="font-bold text-success">{formatVND(qr?.amountInclVat ?? incl)}</p>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Đang chờ thanh toán… Số dư sẽ tự cập nhật sau khi giao dịch hoàn tất.
          </p>
        </div>
      )}
    </Modal>
  );
}
