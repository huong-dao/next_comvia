"use client";

import { useCallback, useEffect, useState } from "react";
import { HiQrCode } from "react-icons/hi2";
import { ManualTransferInfo, toTransferContent } from "@/components/payment/manual-transfer-info";
import { Button } from "@/components/ui/button";
import { useAlertModal } from "@/components/ui/alert-modal";
import { Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { getAccessToken } from "@/lib/auth";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import {
  MIN_PAY2S_AMOUNT,
  formatDateOnly,
  isPay2sUnavailableError,
  pay2sErrorMessage,
  workspaceHeader,
  type SubscriptionPlan,
  type SubscriptionPurchase,
} from "@/lib/subscription";
import { useSubscriptionPurchasePolling } from "@/lib/use-subscription-purchase-status";
import { formatVND } from "@/lib/utils";

/** Một tài khoản ngân hàng nhận tiền — `GET /public/money-accounts/active-for-topup` (guide 9.3). */
type MoneyAccountRow = { id?: string; accountNumber?: string; bankName?: string; bankCode?: string };
type MoneyAccountsResponse = { success: boolean; data: MoneyAccountRow[]; message: string };

export type SubscriptionPurchaseModalProps = {
  /** Gói đang mua; `null` = modal đóng. */
  plan: SubscriptionPlan | null;
  workspaceId: string;
  onClose: () => void;
  /** Gọi sau khi đơn `PAID`: nơi cha gọi lại `/current` + lịch sử rồi đóng QR. */
  onPaid: () => void;
};

/**
 * Mua gói 2 bước (guide 9B.3–9B.4): chọn tài khoản ngân hàng → tạo đơn → hiện QR và poll theo
 * `purchaseCode`. FE không nhận redirect/callback từ Pay2S: chỉ poll tới `PAID`/`FAILED`.
 * Tạo QR lỗi `PAY2S_UNAVAILABLE` → thông báo + nút "Thử lại" (tạo đơn mới, không dùng lại đơn cũ).
 */
export function SubscriptionPurchaseModal({ plan, workspaceId, onClose, onPaid }: SubscriptionPurchaseModalProps) {
  const { showAlert } = useAlertModal();
  const open = plan !== null;

  const [step, setStep] = useState<"select" | "qr">("select");
  const [purchase, setPurchase] = useState<SubscriptionPurchase | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const [moneyAccounts, setMoneyAccounts] = useState<MoneyAccountRow[]>([]);
  const [moneyAccountId, setMoneyAccountId] = useState("");

  const purchaseCode = open && step === "qr" ? (purchase?.purchaseCode ?? null) : null;

  const close = useCallback(() => {
    setStep("select");
    setPurchase(null);
    setErr(null);
    setRetryable(false);
    setBusy(false);
    onClose();
  }, [onClose]);

  const handlePaid = useCallback(
    (paid: SubscriptionPurchase) => {
      close();
      onPaid();
      showAlert({
        type: "success",
        title: "Mua gói thành công",
        message: `Gói ${paid.planName} (${paid.durationYears} năm) đã được thanh toán ${formatVND(paid.amountInclVat)}.`,
      });
    },
    [close, onPaid, showAlert],
  );

  const handleFailed = useCallback(() => {
    // Đơn FAILED không thanh toán được nữa: về bước chọn để tạo đơn mới.
    setStep("select");
    setPurchase(null);
    setRetryable(true);
    setErr("Đơn mua gói không thành công. Vui lòng thử lại để tạo đơn mới.");
  }, []);

  useSubscriptionPurchasePolling(purchaseCode, { workspaceId, onPaid: handlePaid, onFailed: handleFailed });

  // Tải danh sách tài khoản ngân hàng khi mở modal (một lần).
  const needAccounts = open && moneyAccounts.length === 0;
  useEffect(() => {
    if (!needAccounts) return;
    let active = true;
    void (async () => {
      try {
        const res = await comviaFetch<MoneyAccountsResponse>("/public/money-accounts/active-for-topup", {
          token: getAccessToken() ?? undefined,
        });
        if (!active) return;
        if (!res.success) throw new Error(res.message);
        setMoneyAccounts(res.data);
        setMoneyAccountId(res.data[0]?.id ?? "");
      } catch (e) {
        if (!active) return;
        setErr(e instanceof ComviaApiError ? e.message : "Không lấy được danh sách tài khoản ngân hàng.");
      }
    })();
    return () => {
      active = false;
    };
  }, [needAccounts]);

  const createOrder = useCallback(async () => {
    const token = getAccessToken();
    if (!token || !plan) return;
    if (!moneyAccountId) {
      setErr("Chưa có tài khoản ngân hàng để thanh toán.");
      return;
    }
    setBusy(true);
    setErr(null);
    setRetryable(false);
    try {
      const res = await comviaFetch<SubscriptionPurchase>("/subscriptions/purchase/create-with-pay2s", {
        method: "POST",
        token,
        headers: workspaceHeader(workspaceId),
        body: JSON.stringify({ planId: plan.id, moneyAccountId }),
      });
      setPurchase(res);
      setStep("qr");
    } catch (e) {
      if (isPay2sUnavailableError(e)) {
        setErr(pay2sErrorMessage(e));
        setRetryable(true);
      } else {
        // Lỗi `400` thường (gói không bán, tổng < 10.000đ, tài khoản sai) không có `code`: hiện `message` thô.
        setErr(e instanceof ComviaApiError ? e.message : "Không tạo được đơn mua gói.");
      }
    } finally {
      setBusy(false);
    }
  }, [moneyAccountId, plan, workspaceId]);

  const belowMinimum = plan ? plan.totalAmountInclVat < MIN_PAY2S_AMOUNT : false;

  return (
    <Modal
      open={open}
      onClose={close}
      title={step === "qr" ? "Thanh toán gói" : "Mua gói dịch vụ"}
      footer={
        step === "select" ? (
          <>
            <Button variant="ghost" onClick={close}>
              Hủy
            </Button>
            <Button icon={<HiQrCode className="size-4" />} disabled={busy || belowMinimum} onClick={() => void createOrder()}>
              {busy ? "Đang tạo…" : retryable ? "Thử lại" : "Tạo QR"}
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={close}>
            Đóng
          </Button>
        )
      }
    >
      {plan && step === "select" ? (
        <div className="space-y-5">
          <div className="space-y-2 rounded-xl bg-surface-muted p-4 text-sm">
            <p className="font-semibold">
              {plan.name} · {plan.durationYears} năm
            </p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Giá chưa VAT</span>
              <span className="font-medium tabular-nums">{formatVND(plan.priceExclVat)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT {plan.vatPercent}%</span>
              <span className="font-medium tabular-nums">{formatVND(plan.vatAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-border/60 pt-2 font-semibold">
              <span>Tổng thanh toán</span>
              <span className="tabular-nums">{formatVND(plan.totalAmountInclVat)}</span>
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

          <p className="text-xs text-muted-foreground">
            Mua khi gói còn hạn sẽ được cộng dồn thời hạn. Mua gói không cộng tiền vào ví.
          </p>
          {belowMinimum ? (
            <p className="text-sm text-danger">
              Gói này có tổng thanh toán dưới {formatVND(MIN_PAY2S_AMOUNT)} nên chưa thể mua qua Pay2S.
            </p>
          ) : null}
          {err ? <p className="text-sm text-danger">{err}</p> : null}
        </div>
      ) : null}

      {step === "qr" && purchase ? (
        <div className="space-y-5">
          <div className="flex flex-col items-center justify-center space-y-3 rounded-xl border border-dashed border-border bg-white p-6">
            {purchase.qrCodeUrl ? (
              <div className="relative aspect-square w-60 overflow-hidden rounded-lg border shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element -- QR từ backend (URL gốc, không có /api/v1), next/image không tối ưu URL ngoài */}
                <img src={purchase.qrCodeUrl} alt="QR Code thanh toán" className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="flex aspect-square w-60 items-center justify-center bg-muted">
                <p className="text-xs text-muted-foreground">Đang tải ảnh QR…</p>
              </div>
            )}
            <p className="text-[10px] italic text-muted-foreground">Quét mã qua ứng dụng Ngân hàng hoặc Ví điện tử</p>

            <ManualTransferInfo
              account={moneyAccounts.find((a) => a.id === moneyAccountId)}
              amount={purchase.amountInclVat}
              transferContent={toTransferContent(purchase.purchaseCode, "COMVIASUB")}
              note="Nhập chính xác số tiền và nội dung chuyển khoản để hệ thống tự kích hoạt gói."
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase text-muted-foreground">Mã đơn</p>
              <p className="font-mono font-semibold text-primary">{purchase.purchaseCode}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase text-muted-foreground">Tổng tiền</p>
              <p className="font-bold text-success">{formatVND(purchase.amountInclVat)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase text-muted-foreground">Gói</p>
              <p className="font-medium">
                {purchase.planName} · {purchase.durationYears} năm
              </p>
            </div>
            {purchase.expectedStartsAt && purchase.expectedEndsAt ? (
              <div className="space-y-1">
                <p className="text-[10px] font-medium uppercase text-muted-foreground">Dự kiến hiệu lực</p>
                <p className="font-medium">
                  {formatDateOnly(purchase.expectedStartsAt)} – {formatDateOnly(purchase.expectedEndsAt)}
                </p>
              </div>
            ) : null}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Đang chờ thanh toán… Trạng thái gói sẽ tự cập nhật sau khi giao dịch hoàn tất. Ngày hiệu lực thật được tính
            lại lúc nhận tiền.
          </p>
        </div>
      ) : null}
    </Modal>
  );
}
