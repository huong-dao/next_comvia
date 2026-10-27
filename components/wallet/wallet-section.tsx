"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  HiOutlineArrowTrendingDown,
  HiOutlineArrowTrendingUp,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineCreditCard,
  HiOutlineDocumentText,
  HiOutlineFunnel,
  HiOutlineWallet,
} from "react-icons/hi2";
import { useParams } from "next/navigation";
import { StatBlock, type StatBlockDelta } from "@/components/app/stat-block";
import { isWorkspaceOwner, useWorkspaceContext } from "@/components/workspace/workspace-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { PageError, PageLoading } from "@/components/app/page-state";
import { SimpleTable } from "@/components/ui/simple-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { TopupModal } from "@/components/wallet/topup-modal";
import { comviaFetch } from "@/lib/comviaFetch";
import { workspacePath } from "@/lib/paths";
import { useComviaQuery } from "@/lib/use-comvia-query";
import { formatDate, formatVND } from "@/lib/utils";
import { cn } from "@/lib/cn";

/** Chỉ số tháng — `monthly.toppedUp`/`monthly.used` (BR-06). `value` number; `changePercent` nullable. */
type WalletMonthlyMetric = { value: number; changePercent: number | null };

/**
 * Số dư ví — `GET /workspaces/:id/wallet/balance` (§9.1 bản backend, BR-06).
 * Field tiền (`balance`/`totalTopup`/...) là Decimal → về JSON dạng chuỗi số (parse number khi hiển thị).
 * `monthly` tách số liệu "đã nạp / đã dùng" trong tháng + % so tháng trước.
 * Workspace chưa có ví → toàn bộ response `null` (data = null) → hiển thị "—".
 */
type WalletBalance = {
  balance?: string;
  totalTopup?: string;
  totalSpent?: string;
  totalRefund?: string;
  monthly?: {
    toppedUp: WalletMonthlyMetric;
    used: WalletMonthlyMetric;
  } | null;
};

/** Enum loại giao dịch — Phụ lục A `WalletTransactionType`. Hiển thị map nhãn, KHÔNG đổi giá trị enum. */
type WalletTransactionType =
  | "TOPUP_CREDIT"
  | "MESSAGE_DEBIT"
  | "CAMPAIGN_HOLD"
  | "CAMPAIGN_REFUND"
  | "MANUAL_ADJUSTMENT"
  | "REVERSAL";

const TX_TYPE_LABELS: Record<WalletTransactionType, string> = {
  TOPUP_CREDIT: "Nạp tiền",
  MESSAGE_DEBIT: "Trừ phí gửi tin",
  CAMPAIGN_HOLD: "Tạm giữ chiến dịch",
  CAMPAIGN_REFUND: "Hoàn tiền chiến dịch",
  MANUAL_ADJUSTMENT: "Điều chỉnh thủ công",
  REVERSAL: "Đảo giao dịch",
};

const TX_TYPE_OPTIONS = Object.keys(TX_TYPE_LABELS) as WalletTransactionType[];

/**
 * Enum trạng thái giao dịch — `status` (BR-11, §9.2 bản backend). Hiển thị map nhãn, KHÔNG đổi giá trị enum.
 * Hiện dữ liệu backend 100% `SUCCESS`; `PENDING`/`FAILED` là giá trị dành sẵn — UI vẫn map đủ 3 nhãn.
 */
type WalletTransactionStatus = "SUCCESS" | "PENDING" | "FAILED";

const TX_STATUS_LABELS: Record<WalletTransactionStatus, string> = {
  SUCCESS: "Thành công",
  PENDING: "Đang xử lý",
  FAILED: "Thất bại",
};

const TX_STATUS_OPTIONS = Object.keys(TX_STATUS_LABELS) as WalletTransactionStatus[];

/** Màu badge theo pattern sẵn có (StatusBadge): xanh/vàng/đỏ. */
const TX_STATUS_TONE: Record<WalletTransactionStatus, "active" | "pending" | "error"> = {
  SUCCESS: "active",
  PENDING: "pending",
  FAILED: "error",
};

/**
 * Một dòng giao dịch — `GET /workspaces/:id/wallet/transactions` (§9.2 bản backend, BR-11).
 * `amount` là Decimal → chuỗi số, có thể âm (parse number khi hiển thị).
 * `status` (BR-11 đảo ngược): giao dịch ví CÓ trạng thái → render cột "Trạng thái".
 */
type TxRow = {
  transactionCode?: string;
  type?: string;
  status?: string;
  amount?: string;
  createdAt?: string;
};

/** Số bản ghi mỗi trang (query `limit`, mặc định backend = 20). */
const PAGE_SIZE = 20;

/** `changePercent` null (tháng trước = 0 / chưa có ví) → ẩn badge; ngược lại tính chiều tăng/giảm. */
const toDelta = (changePercent: number | null | undefined): StatBlockDelta | undefined =>
  changePercent == null
    ? undefined
    : { percent: changePercent, direction: changePercent >= 0 ? "up" : "down" };

/**
 * Section "Thông tin Ví" trên dashboard (ISSUE-005, TICKET-011 + tích hợp TICKET-017):
 * - Box trái: số dư + nút Nạp tiền (mở popup, `onPaid` refetch số dư + danh sách giao dịch, không reload) + Xem lịch sử
 *   + "Tổng quan tháng này" (2 stat block từ `monthly` thật, BR-06; BỎ "Sắp hết hạn").
 * - Box phải: danh sách giao dịch thật (đủ 6 enum loại + cột Trạng thái map nhãn tiếng Việt) + filter
 *   loại/trạng thái/ngày server-side (BR-07/BR-11: `type`/`status`/`fromDate`/`toDate`)
 *   + phân trang server-side (`offset`/`limit`).
 */
export function WalletSection() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { role } = useWorkspaceContext();
  const owner = isWorkspaceOwner(role);

  const [topupOpen, setTopupOpen] = useState(false);

  // --- Số dư ví + số liệu tháng ---
  const balanceFetcher = useCallback(
    (token: string) => comviaFetch<WalletBalance>(`/workspaces/${workspaceId}/wallet/balance`, { token }),
    [workspaceId],
  );
  const {
    data: bal,
    loading: loadingBalance,
    error: errorBalance,
    refetch: refetchBalance,
  } = useComviaQuery(Boolean(workspaceId), balanceFetcher);

  const monthly = bal?.monthly ?? null;

  // --- Danh sách giao dịch (filter + phân trang server-side, BR-07) ---
  // Input filter (gõ/chọn) tách khỏi filter đã áp dụng: dùng nút "Lọc" để commit ngày; đổi loại áp dụng ngay.
  const [typeInput, setTypeInput] = useState("");
  const [statusInput, setStatusInput] = useState("");
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [appliedType, setAppliedType] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [offset, setOffset] = useState(0);

  const applyFilters = (nextType: string, nextStatus: string, nextFrom: string, nextTo: string) => {
    setAppliedType(nextType);
    setAppliedStatus(nextStatus);
    setAppliedFrom(nextFrom);
    setAppliedTo(nextTo);
    setOffset(0); // Đổi filter → về trang đầu.
  };

  const txFetcher = useCallback(
    (token: string) => {
      const query = new URLSearchParams();
      query.set("offset", String(offset));
      query.set("limit", String(PAGE_SIZE));
      if (appliedType) query.set("type", appliedType);
      if (appliedStatus) query.set("status", appliedStatus); // BR-11: SUCCESS|PENDING|FAILED (sai giá trị → 400).
      if (appliedFrom) query.set("fromDate", appliedFrom); // YYYY-MM-DD → backend neo 00:00:00 giờ VN.
      if (appliedTo) query.set("toDate", appliedTo); // YYYY-MM-DD → backend neo 23:59:59 giờ VN.
      return comviaFetch<TxRow[]>(
        `/workspaces/${workspaceId}/wallet/transactions?${query.toString()}`,
        { token },
      );
    },
    [workspaceId, offset, appliedType, appliedStatus, appliedFrom, appliedTo],
  );
  const {
    data: txs,
    loading: loadingTx,
    error: errorTx,
    refetch: refetchTx,
  } = useComviaQuery(Boolean(workspaceId), txFetcher);

  const rows = txs ?? [];
  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const rangeStart = rows.length === 0 ? 0 : offset + 1;
  const rangeEnd = offset + rows.length;
  const hasPrev = offset > 0;
  // Endpoint trả mảng phẳng (không kèm tổng số) → còn trang sau khi trang hiện tại đầy `PAGE_SIZE`.
  const hasNext = rows.length === PAGE_SIZE;

  return (
    <section className="mb-6">
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Box trái: số dư + hành động + tổng quan tháng */}
        <Card className="lg:col-span-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <HiOutlineWallet className="size-5 text-primary" aria-hidden />
            Ví Credit
          </h2>

          {loadingBalance && !bal ? (
            <div className="mt-4">
              <PageLoading message="Đang tải số dư…" />
            </div>
          ) : errorBalance && !bal ? (
            <div className="mt-4">
              <PageError message={errorBalance} onRetry={() => void refetchBalance()} />
            </div>
          ) : (
            <>
              <p className="mt-4 text-sm text-muted-foreground">Số dư khả dụng</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-primary">
                {bal?.balance != null ? formatVND(Number(bal.balance)) : "—"}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {owner ? (
                  <Button
                    icon={<HiOutlineCreditCard className="size-4" />}
                    onClick={() => setTopupOpen(true)}
                  >
                    Nạp tiền
                  </Button>
                ) : null}
                <Button icon={<HiOutlineDocumentText className="size-4" />} variant="outline" asChild>
                  <Link href={workspacePath(workspaceId, "wallet")}>Xem lịch sử</Link>
                </Button>
              </div>

              <div className="mt-6">
                <p className="mb-3 text-sm font-semibold">Tổng quan tháng này</p>
                <div className="grid gap-3">
                  <StatBlock
                    icon={<HiOutlineArrowTrendingUp className="size-5 text-success" />}
                    value={monthly ? formatVND(monthly.toppedUp.value) : "—"}
                    label="Đã nạp tháng này"
                    delta={monthly ? toDelta(monthly.toppedUp.changePercent) : undefined}
                  />
                  <StatBlock
                    icon={<HiOutlineArrowTrendingDown className="size-5 text-danger" />}
                    value={monthly ? formatVND(monthly.used.value) : "—"}
                    label="Đã sử dụng"
                    delta={monthly ? toDelta(monthly.used.changePercent) : undefined}
                  />
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Box phải: danh sách giao dịch + filter + phân trang */}
        <Card className="lg:col-span-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <HiOutlineDocumentText className="size-5 text-primary" aria-hidden />
            Danh sách giao dịch
          </h2>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex-1 min-w-[140px] text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Từ ngày</span>
              <Input type="date" value={fromInput} onChange={(e) => setFromInput(e.target.value)} />
            </label>
            <label className="flex-1 min-w-[140px] text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Đến ngày</span>
              <Input type="date" value={toInput} onChange={(e) => setToInput(e.target.value)} />
            </label>
            <label className="flex-1 min-w-[160px] text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Loại giao dịch</span>
              <Select
                value={typeInput}
                onChange={(e) => {
                  // Đổi loại áp dụng ngay (giữ nguyên ngày/trạng thái đang áp dụng ở input).
                  setTypeInput(e.target.value);
                  applyFilters(e.target.value, statusInput, fromInput, toInput);
                }}
              >
                <option value="">Tất cả giao dịch</option>
                {TX_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {TX_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex-1 min-w-[150px] text-sm">
              <span className="mb-1 block text-xs text-muted-foreground">Trạng thái</span>
              <Select
                value={statusInput}
                onChange={(e) => {
                  // Đổi trạng thái áp dụng ngay (giữ nguyên ngày/loại đang áp dụng ở input).
                  setStatusInput(e.target.value);
                  applyFilters(typeInput, e.target.value, fromInput, toInput);
                }}
              >
                <option value="">Mọi trạng thái</option>
                {TX_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {TX_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </label>
            <Button
              icon={<HiOutlineFunnel className="size-4" />}
              onClick={() => applyFilters(typeInput, statusInput, fromInput, toInput)}
            >
              Lọc
            </Button>
          </div>

          <div className="mt-4">
            {loadingTx && !txs ? (
              <PageLoading message="Đang tải giao dịch…" />
            ) : errorTx && !txs ? (
              <PageError message={errorTx} onRetry={() => void refetchTx()} />
            ) : (
              <SimpleTable
                rows={rows}
                getRowKey={(r, i) => r.transactionCode ?? String(i)}
                emptyMessage="Chưa có giao dịch nào"
                columns={[
                  {
                    key: "code",
                    header: "Mã GD",
                    cell: (r) => <span className="font-mono text-xs">{r.transactionCode ?? "—"}</span>,
                  },
                  {
                    key: "at",
                    header: "Thời gian",
                    cell: (r) => (r.createdAt ? formatDate(r.createdAt, "DD/MM/YYYY HH:mm") : "—"),
                  },
                  {
                    key: "type",
                    header: "Loại giao dịch",
                    cell: (r) =>
                      r.type ? TX_TYPE_LABELS[r.type as WalletTransactionType] ?? r.type : "—",
                  },
                  {
                    key: "status",
                    header: "Trạng thái",
                    cell: (r) => {
                      if (!r.status) return "—";
                      const s = r.status as WalletTransactionStatus;
                      const label = TX_STATUS_LABELS[s];
                      // Enum ngoài 3 giá trị hợp đồng (không bịa): badge neutral + text gốc.
                      if (!label) return <StatusBadge tone="neutral">{r.status}</StatusBadge>;
                      return <StatusBadge tone={TX_STATUS_TONE[s]}>{label}</StatusBadge>;
                    },
                  },
                  {
                    key: "amt",
                    header: "Số tiền",
                    cell: (r) =>
                      r.amount != null ? (
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            Number(r.amount) < 0 ? "text-danger" : "text-success",
                          )}
                        >
                          {formatVND(Number(r.amount))}
                        </span>
                      ) : (
                        "—"
                      ),
                  },
                ]}
              />
            )}
          </div>

          {rows.length > 0 || hasPrev ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                Hiển thị {rangeStart} - {rangeEnd} giao dịch
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<HiOutlineChevronLeft className="size-4" />}
                  disabled={!hasPrev}
                  onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                  aria-label="Trang trước"
                />
                <span className="px-2 tabular-nums">Trang {pageNumber}</span>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<HiOutlineChevronRight className="size-4" />}
                  disabled={!hasNext}
                  onClick={() => setOffset((o) => o + PAGE_SIZE)}
                  aria-label="Trang sau"
                />
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      <TopupModal
        open={topupOpen}
        onClose={() => setTopupOpen(false)}
        workspaceId={workspaceId}
        onPaid={() => {
          void refetchBalance();
          void refetchTx();
        }}
      />
    </section>
  );
}
