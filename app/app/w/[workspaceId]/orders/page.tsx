"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { SimpleTable } from "@/components/ui/simple-table";
import { TablePagination } from "@/components/ui/table-pagination";
import { comviaFetch } from "@/lib/comviaFetch";
import { workspacePath } from "@/lib/paths";
import { orderTypeLabel } from "@/lib/subscription";
import { useClientPagination } from "@/lib/use-client-pagination";
import { useComviaQuery } from "@/lib/use-comvia-query";
import { formatVNDOrDash } from "@/lib/utils";

type OrderRow = {
  id?: string;
  orderCode?: string;
  /** `TOPUP` | `SUBSCRIPTION`. */
  type?: string;
  /** Decimal → thường là string. */
  totalAmountInclVat?: string | number;
  status?: string;
  paidAt?: string;
};

export default function OrdersListPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const fetcher = useCallback(
    (token: string) => comviaFetch<OrderRow[]>(`/workspaces/${workspaceId}/orders`, { token }),
    [workspaceId],
  );

  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId), fetcher);
  const allRows = useMemo(() => data ?? [], [data]);
  const { rows, page, totalPages, total, pageSize, setPage } = useClientPagination(allRows);

  if (loading) return <PageLoading />;
  if (error && !data) return <PageError message={error} onRetry={() => void refetch()} />;

  return (
    <div>
      <PageHeader eyebrow="Billing" title="Đơn hàng" description="Danh sách order theo workspace." />

      <SimpleTable
        rows={rows}
        getRowKey={(r, i) => r.id ?? r.orderCode ?? String(i)}
        columns={[
          {
            key: "code",
            header: "Mã đơn",
            cell: (r) =>
              r.id ? (
                <Link className="font-medium text-primary hover:underline" href={workspacePath(workspaceId, "orders", r.id)}>
                  {r.orderCode ?? r.id}
                </Link>
              ) : (
                r.orderCode ?? "—"
              ),
          },
          { key: "type", header: "Loại", cell: (r) => orderTypeLabel(r.type) ?? "—" },
          {
            key: "total",
            header: "Tổng (gồm VAT)",
            cell: (r) => <span className="tabular-nums">{formatVNDOrDash(r.totalAmountInclVat)}</span>,
          },
          {
            key: "st",
            header: "Trạng thái",
            cell: (r) => (r.status ? <EntityStatusBadge value={r.status} /> : "—"),
          },
          {
            key: "paid",
            header: "Thanh toán",
            cell: (r) => (r.paidAt ? new Date(r.paidAt).toLocaleString() : "—"),
          },
        ]}
      />
      <TablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        unitLabel="đơn"
        ariaLabel="Phân trang danh sách đơn hàng"
      />
    </div>
  );
}
