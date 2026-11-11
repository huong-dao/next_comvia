"use client";

import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { HiOutlineChevronLeft, HiOutlineChevronRight } from "react-icons/hi2";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { isWorkspaceOwner, useWorkspaceContext } from "@/components/workspace/workspace-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Select } from "@/components/ui/input";
import { SimpleTable } from "@/components/ui/simple-table";
import { comviaFetch } from "@/lib/comviaFetch";
import { useComviaQuery } from "@/lib/use-comvia-query";
import { formatVND } from "@/lib/utils";
import {
  WALLET_TX_TYPE_LABELS,
  WALLET_TX_TYPE_OPTIONS,
  walletTxDirection,
  walletTxTypeLabel,
} from "@/lib/wallet-transaction";
import { cn } from "@/lib/cn";

type WalletBalance = {
  balance?: string;
  totalTopup?: string;
  totalSpent?: string;
  totalRefund?: string;
};

/**
 * §9.2 — `amount` LUÔN dương với mọi loại giao dịch, nên chiều tiền suy từ `balanceBefore`
 * so với `balanceAfter`. `note` nullable; với `MANUAL_ADJUSTMENT` là lý do admin điều chỉnh.
 */
/** Số giao dịch mỗi trang — khớp mặc định `limit` của backend (§9.2). */
const PAGE_SIZE = 20;

type TxRow = {
  transactionCode?: string;
  type?: string;
  amount?: string;
  balanceBefore?: string;
  balanceAfter?: string;
  note?: string | null;
  createdAt?: string;
};

export default function WalletPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { role } = useWorkspaceContext();
  const owner = isWorkspaceOwner(role);
  const [type, setType] = useState("");
  /** §9.2: endpoint nhận `offset`/`limit` thật, nên phân trang ở server. */
  const [offset, setOffset] = useState(0);

  const balanceFetcher = useCallback(
    (token: string) => comviaFetch<WalletBalance>(`/workspaces/${workspaceId}/wallet/balance`, { token }),
    [workspaceId],
  );

  const { data: bal, loading: lb, error: eb, refetch: rb } = useComviaQuery(Boolean(workspaceId), balanceFetcher);

  const txQuery = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("offset", String(offset));
    qs.set("limit", String(PAGE_SIZE));
    if (type) qs.set("type", type);
    return qs.toString();
  }, [offset, type]);

  const txFetcher = useCallback(
    (token: string) =>
      comviaFetch<TxRow[]>(`/workspaces/${workspaceId}/wallet/transactions?${txQuery}`, { token }),
    [workspaceId, txQuery],
  );

  const {
    data: txs,
    loading: lt,
    error: et,
    refetch: rt,
  } = useComviaQuery(Boolean(workspaceId), txFetcher);

  const txRows = txs ?? [];
  const rangeStart = txRows.length === 0 ? 0 : offset + 1;
  const rangeEnd = offset + txRows.length;
  const hasPrev = offset > 0;
  // Endpoint trả mảng phẳng (không kèm tổng số) → còn trang sau khi trang hiện tại đầy `PAGE_SIZE`.
  const hasNext = txRows.length === PAGE_SIZE;

  if (lb) return <PageLoading />;
  if (eb && !bal) return <PageError message={eb} onRetry={() => void rb()} />;

  return (
    <div>
      <PageHeader
        // eyebrow="Wallet"
        title="Ví tiền"
        description="Số dư và lịch sử giao dịch theo Workspace."
        actions={<EntityStatusBadge value={owner ? "OWNER" : "MEMBER"} />}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm text-muted-foreground">Số dư</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{bal?.balance != null ? formatVND(Number(bal.balance)) : "—"}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Tổng nạp</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{bal?.totalTopup != null ? formatVND(Number(bal.totalTopup)) : "—"}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Đã chi</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{bal?.totalSpent != null ? formatVND(Number(bal.totalSpent)) : "—"}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Hoàn</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{bal?.totalRefund != null ? formatVND(Number(bal.totalRefund)) : "—"}</p>
        </Card>
      </div>

      <div className="mb-4 flex justify-between items-center gap-3">
        {/* Lọc theo `type` (§9.2) — gửi nguyên giá trị enum, chỉ map nhãn khi hiển thị. */}
        <Select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setOffset(0);
          }}
          className="max-w-sm"
        >
          <option value="">Mọi loại giao dịch</option>
          {WALLET_TX_TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {WALLET_TX_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
        <Button className="w-40" type="button" variant="outline" size="sm" onClick={() => void rt()}>
          Làm mới lịch sử
        </Button>
      </div>

      {lt ? <PageLoading message="Đang tải giao dịch…" /> : null}
      {et && !txs ? <PageError message={et} onRetry={() => void rt()} /> : null}

      <SimpleTable
        rows={txRows}
        getRowKey={(r, i) => r.transactionCode ?? String(i)}
        columns={[
          { key: "code", header: "Mã", cell: (r) => r.transactionCode ?? "—" },
          { key: "type", header: "Loại", cell: (r) => walletTxTypeLabel(r.type) ?? "—" },
          {
            key: "amt",
            header: "Số tiền",
            cell: (r) => {
              if (r.amount == null) return "—";
              const direction = walletTxDirection(r);
              return (
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    direction === "CREDIT" && "text-success",
                    direction === "DEBIT" && "text-danger",
                  )}
                >
                  {direction === "CREDIT" ? "+" : direction === "DEBIT" ? "−" : ""}
                  {formatVND(Math.abs(Number(r.amount)))}
                </span>
              );
            },
          },
          { key: "before", header: "Trước", cell: (r) => r.balanceBefore != null ? formatVND(Number(r.balanceBefore)) : "—" },
          { key: "after", header: "Sau", cell: (r) => r.balanceAfter != null ? formatVND(Number(r.balanceAfter)) : "—" },
          {
            key: "note",
            header: "Lý do",
            cell: (r) =>
              r.note ? (
                <span className="block max-w-[260px] whitespace-pre-wrap break-words text-sm">{r.note}</span>
              ) : (
                "—"
              ),
          },
          {
            key: "at",
            header: "Thời gian",
            cell: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"),
          },
        ]}
      />

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 border-t border-border/60 pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="px-2"
          icon={<HiOutlineChevronLeft className="size-4" />}
          disabled={!hasPrev}
          aria-label="Trang trước"
          onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
        />
        <p className="text-sm text-muted-foreground">
          {rangeStart === 0 ? "Chưa có giao dịch" : `Giao dịch ${rangeStart}–${rangeEnd}`}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="px-2"
          icon={<HiOutlineChevronRight className="size-4" />}
          iconPosition="right"
          disabled={!hasNext}
          aria-label="Trang sau"
          onClick={() => setOffset((o) => o + PAGE_SIZE)}
        />
      </div>
    </div>
  );
}
