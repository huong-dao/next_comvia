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
import { formatVND } from "@/lib/utils";

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
    billingSnapshotJson?: {
      companyName?: string;
      fullName?: string;
      address?: string;
      taxCode?: string;
      invoiceEmail?: string;
    };
    invoiceCode?: string;
    status?: string;
    workspaceId?: string;
    orderId?: string;
    updatedAt?: string;
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
              <p className="font-medium tabular-nums">{formatVND(Number(data.totalAmountExclVat))}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">VAT</p>
              <p className="font-medium tabular-nums">{formatVND(Number(data.totalVatAmount))}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Tổng thanh toán</p>
              <p className="font-semibold tabular-nums">{formatVND(Number(data.totalAmountInclVat))}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Ngày thanh toán</p>
              <p className="text-sm">{data.paidAt ? new Date(data.paidAt).toLocaleString("vi-VN") : "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Ngày tạo</p>
              <p className="text-sm">{data.createdAt ? new Date(data.createdAt).toLocaleString("vi-VN") : "—"}</p>
            </div>
          </Card>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hóa đơn</p>
          <SimpleTable
            rows={[data.invoice ?? {}]}
            getRowKey={(r, i) => r.id ?? String(i)}
            columns={[
              { key: "n", header: "Mã hóa đơn", cell: (r) => r.invoiceCode ?? "—" },
              {
                key: "id",
                header: "Thông tin xuất HĐ",
                cell: (r) => {
                  const billingInfo = r.billingSnapshotJson ?? null;
                  return billingInfo && (billingInfo.companyName || billingInfo.fullName) ? (
                    <div>
                      <div className="font-medium">{billingInfo.companyName ?? billingInfo.fullName}</div>
                      {billingInfo.address ? <div className="text-xs text-muted-foreground">Địa chỉ: {billingInfo.address}</div> : null}
                      {billingInfo.taxCode ? <div className="text-xs text-muted-foreground">Mã số thuế: {billingInfo.taxCode}</div> : null}
                      {billingInfo.invoiceEmail ? <div className="text-xs text-muted-foreground">Email: {billingInfo.invoiceEmail}</div> : null}
                    </div>
                  ) : (
                    "—"
                  );
                },
              },
              { key: "p", header: "Tình trạng", cell: (r) => r.status ? <EntityStatusBadge value={r.status} /> : "—" },
              { key: "t", header: "Ngày tạo", cell: (r) => r.updatedAt ? new Date(r.updatedAt).toLocaleString("vi-VN") : "—" },
            ]}
          />
        </div>
      ) : null}
    </AdminRoleGate>
  );
}
