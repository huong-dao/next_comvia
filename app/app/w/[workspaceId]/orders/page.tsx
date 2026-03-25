"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { SimpleTable } from "@/components/ui/simple-table";
import { comviaFetch } from "@/lib/comviaFetch";
import { workspacePath } from "@/lib/paths";
import { useComviaQuery } from "@/lib/use-comvia-query";

type OrderRow = {
  id?: string;
  orderCode?: string;
  orderType?: string;
  totalAmountInclVat?: string;
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
  const rows = data ?? [];

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
          { key: "type", header: "Loại", cell: (r) => r.orderType ?? "—" },
          { key: "total", header: "Tổng (gồm VAT)", cell: (r) => r.totalAmountInclVat ?? "—" },
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
    </div>
  );
}
