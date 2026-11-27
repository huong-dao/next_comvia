"use client";

import { useEffect, useState } from "react";
import { HiCheck, HiOutlineClipboardDocument } from "react-icons/hi2";
import { formatVND } from "@/lib/utils";
import { cn } from "@/lib/cn";

/** Tài khoản nhận tiền — `GET /public/money-accounts/active-for-topup`. */
export type ManualTransferAccount = {
  accountNumber?: string;
  /** Admin nhập ở ô "Tên tài khoản" (app/admin/money-accounts) — thực chất là chủ tài khoản. */
  bankName?: string;
  bankCode?: string;
};

/**
 * Nội dung chuyển khoản để webhook Pay2S khớp đơn khi khách chuyển tay
 * (docs/architecture/modules/subscription/component-design.md):
 * - topup `COMVIA_TOPUP_<8hex>` → `COMVIA<8hex>`
 * - mua gói `COMVIA_SUB_<8hex>` → `COMVIASUB<8hex>`
 */
export function toTransferContent(code: string | undefined, prefix: "COMVIA" | "COMVIASUB"): string | null {
  const hex = code?.split("_").pop();
  return hex ? `${prefix}${hex}` : null;
}

/** Một dòng thông tin; `copyValue` khác `value` khi cần copy dạng thô (vd số tiền không dấu chấm). */
function TransferInfoRow({
  label,
  value,
  copyValue,
  emphasize,
}: {
  label: string;
  value: string;
  copyValue?: string;
  emphasize?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(copyValue ?? value);
      setCopied(true);
    } catch {
      // Clipboard bị chặn (quyền/môi trường) — bỏ qua, không chặn UI.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={cn(
            "break-all text-right font-semibold tabular-nums",
            emphasize && "font-mono text-primary",
          )}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label={`Sao chép ${label.toLowerCase()}`}
          title={copied ? "Đã sao chép" : "Sao chép"}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
        >
          {copied ? (
            <HiCheck className="size-4 text-success" />
          ) : (
            <HiOutlineClipboardDocument className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}

/**
 * Khối "Hoặc chuyển khoản thủ công" đặt dưới ảnh QR Pay2S (popup nạp tiền, popup mua gói).
 * Không render gì khi thiếu tài khoản hoặc nội dung chuyển khoản.
 */
export function ManualTransferInfo({
  account,
  amount,
  transferContent,
  note,
}: {
  account: ManualTransferAccount | undefined;
  amount: number;
  transferContent: string | null;
  note: string;
}) {
  if (!account || !transferContent) return null;

  return (
    <div className="w-full border-t border-border/60 pt-3 text-sm">
      <p className="mb-1 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Hoặc chuyển khoản thủ công
      </p>
      <div className="divide-y divide-border/60">
        {account.bankCode ? <TransferInfoRow label="Ngân hàng" value={account.bankCode} /> : null}
        {account.bankName ? <TransferInfoRow label="Chủ tài khoản" value={account.bankName} /> : null}
        {account.accountNumber ? (
          <TransferInfoRow label="Số tài khoản" value={account.accountNumber} />
        ) : null}
        <TransferInfoRow label="Số tiền" value={formatVND(amount)} copyValue={String(amount)} />
        <TransferInfoRow label="Nội dung chuyển khoản" value={transferContent} emphasize />
      </div>
      <p className="mt-2 text-center text-xs text-amber-600">{note}</p>
    </div>
  );
}
