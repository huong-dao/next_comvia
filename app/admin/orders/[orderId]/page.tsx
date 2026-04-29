"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback } from "react";
import { HiArrowLeft } from "react-icons/hi2";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { SimpleTable } from "@/components/ui/simple-table";
import { comviaFetch } from "@/lib/comviaFetch";
import { useComviaQuery } from "@/lib/use-comvia-query";

type OrderItemRow = {
  id?: string;
  name?: string;
  quantity?: number;
  unitPrice?: number | string;
  vatRate?: number | string;
  totalAmountInclVat?: number | string;
};

type AdminOrderDetail = {
  id?: string;
  orderCode?: string;
  orderType?: string;
  workspaceId?: string;
  workspace?: {
    name?: string;
    slug?: string;
  };
  owner?: {
    fullName?: string;
    email?: string;
  };
  topupRequest?: {
    id?: string;
    topupCode?: string;
  };
  ownerUserId?: string;
  status?: string;
  totalAmountExclVat?: number | string;
  totalVatAmount?: number | string;
  totalAmountInclVat?: number | string;
  paidAt?: string | null;
  topupRequestId?: string | null;
  createdAt?: string;
  items?: OrderItemRow[];
  invoice?: {
    id?: string;
    invoiceCode?: string;
    status?: string;
    workspaceId?: string;
    orderId?: string;
  } | null;
};

function fmt(v: number | string | undefined) {
  if (v === undefined || v === null || v === "") return "—";
  return typeof v === "number" ? v.toLocaleString("vi-VN") : String(v);
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  const fetcher = useCallback(
    (token: string) => comviaFetch<AdminOrderDetail>(`/admin/orders/${orderId}`, { token }),
    [orderId],
  );

  const { data, loading, error, refetch } = useComviaQuery(Boolean(orderId), fetcher);

  if (!orderId) return null;

  return (
    <AdminRoleGate>
      {loading ? <PageLoading /> : null}
      {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}
      {data ? (
        <div>
          <PageHeader
            eyebrow="Order (admin)"
            title={data.orderCode ?? data.id ?? "Chi tiết đơn"}
            description={data.workspaceId ? `Workspace: ${data.workspace?.name ?? "—"}` : undefined}
            actions={
              <Button icon={<HiArrowLeft className="size-4" />} variant="outline" size="sm" asChild>
                <Link href="/admin/orders">Danh sách đơn</Link>
              </Button>
            }
          />

          <Card className="mb-6 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Trạng thái</p>
              <p className="mt-1">{data.status ? <EntityStatusBadge value={data.status} /> : "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Loại đơn</p>
              <p className="font-medium">{data.orderType ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Người dùng</p>
              <p className="text-sm">{data.owner?.fullName ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Mã Topup</p>
              <p className="text-sm">{data.topupRequest?.topupCode ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Trước VAT</p>
              <p className="font-medium tabular-nums">{fmt(data.totalAmountExclVat)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">VAT</p>
              <p className="font-medium tabular-nums">{fmt(data.totalVatAmount)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Tổng thanh toán</p>
              <p className="font-semibold tabular-nums">{fmt(data.totalAmountInclVat)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Paid at</p>
              <p className="text-sm">{data.paidAt ? new Date(data.paidAt).toLocaleString("vi-VN") : "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Tạo lúc</p>
              <p className="text-sm">{data.createdAt ? new Date(data.createdAt).toLocaleString("vi-VN") : "—"}</p>
            </div>
          </Card>

          {data.invoice?.id ? (
            <Card className="mb-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hóa đơn liên kết</p>
              <p className="text-sm">{data.invoice.invoiceCode ?? data.invoice.id}</p>
              {data.invoice.status ? (
                <p className="mt-1">
                  <EntityStatusBadge value={data.invoice.status} />
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">Chi tiết hóa đơn admin: GET /admin/invoices/:invoiceId (khi có trang tương ứng).</p>
            </Card>
          ) : null}

          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dòng đơn</p>
          <SimpleTable
            rows={data.items ?? []}
            getRowKey={(r, i) => r.id ?? String(i)}
            columns={[
              { key: "n", header: "Tên", cell: (r) => r.name ?? "—" },
              { key: "q", header: "SL", cell: (r) => String(r.quantity ?? "—") },
              { key: "p", header: "Đơn giá", cell: (r) => fmt(r.unitPrice) },
              { key: "v", header: "VAT%", cell: (r) => fmt(r.vatRate) },
              { key: "t", header: "Tổng", cell: (r) => fmt(r.totalAmountInclVat) },
            ]}
          />
        </div>
      ) : null}
    </AdminRoleGate>
  );
}
