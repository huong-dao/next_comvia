"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { SimpleTable } from "@/components/ui/simple-table";
import { comviaFetch } from "@/lib/comviaFetch";
import { workspacePath } from "@/lib/paths";
import { useComviaQuery } from "@/lib/use-comvia-query";

type OrderDetail = {
  id?: string;
  orderCode?: string;
  orderType?: string;
  status?: string;
  totalAmountExclVat?: string;
  totalVatAmount?: string;
  totalAmountInclVat?: string;
  paidAt?: string;
  invoiceId?: string;
  items?: Array<{
    id?: string;
    name?: string;
    quantity?: number;
    unitPrice?: string;
    vatRate?: string;
    totalAmountInclVat?: string;
  }>;
};

export default function OrderDetailPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const orderId = params.orderId as string;

  const fetcher = useCallback(
    (token: string) =>
      comviaFetch<OrderDetail>(`/workspaces/${workspaceId}/orders/${orderId}`, { token }),
    [workspaceId, orderId],
  );

  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId && orderId), fetcher);

  if (loading) return <PageLoading />;
  if (error && !data) return <PageError message={error} onRetry={() => void refetch()} />;
  if (!data) return null;

  const invId = data.invoiceId;

  return (
    <div>
      <PageHeader
        eyebrow="Order"
        title={data.orderCode ?? data.id ?? "Chi tiết đơn"}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href={workspacePath(workspaceId, "orders")}>Danh sách</Link>
          </Button>
        }
      />

      <Card className="mb-6 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Loại</p>
          <p className="font-medium">{data.orderType ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Trạng thái</p>
          <p className="mt-1">{data.status ? <EntityStatusBadge value={data.status} /> : "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Trước VAT</p>
          <p className="font-medium tabular-nums">{data.totalAmountExclVat ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">VAT</p>
          <p className="font-medium tabular-nums">{data.totalVatAmount ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Tổng thanh toán</p>
          <p className="font-semibold tabular-nums">{data.totalAmountInclVat ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-muted-foreground">Paid at</p>
          <p className="text-sm">{data.paidAt ? new Date(data.paidAt).toLocaleString() : "—"}</p>
        </div>
        {invId ? (
          <div className="sm:col-span-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href={workspacePath(workspaceId, "invoices", invId)}>Mở hóa đơn liên kết</Link>
            </Button>
          </div>
        ) : null}
      </Card>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order items</p>
      <SimpleTable
        rows={data.items ?? []}
        getRowKey={(r, i) => r.id ?? String(i)}
        columns={[
          { key: "n", header: "Tên", cell: (r) => r.name ?? "—" },
          { key: "q", header: "SL", cell: (r) => String(r.quantity ?? "—") },
          { key: "p", header: "Đơn giá", cell: (r) => r.unitPrice ?? "—" },
          { key: "v", header: "VAT%", cell: (r) => r.vatRate ?? "—" },
          { key: "t", header: "Tổng", cell: (r) => r.totalAmountInclVat ?? "—" },
        ]}
      />
    </div>
  );
}
