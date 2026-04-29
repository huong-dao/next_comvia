"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { HiChevronLeft, HiChevronRight, HiOutlineAdjustmentsHorizontal, HiOutlineClipboardDocumentList } from "react-icons/hi2";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Input, Select } from "@/components/ui/input";
import { SimpleTable } from "@/components/ui/simple-table";
import { comviaFetch } from "@/lib/comviaFetch";
import { useComviaQuery } from "@/lib/use-comvia-query";

type OrderRow = {
  id: string;
  orderCode?: string;
  workspaceId?: string;
  ownerUserId?: string;
  totalAmountExclVat?: number | string;
  totalVatAmount?: number | string;
  totalAmountInclVat?: number | string;
  status?: string;
  paidAt?: string | null;
  topupRequestId?: string | null;
  createdAt?: string;
};

type OrdersListResponse = {
  data: OrderRow[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type AppliedFilters = {
  limit: number;
  workspaceId: string;
  ownerUserId: string;
  status: string;
  orderCode: string;
  topupRequestId: string;
  paidAtFrom: string;
  paidAtTo: string;
  createdAtFrom: string;
  createdAtTo: string;
};

const initialFilters = (): AppliedFilters => ({
  limit: 30,
  workspaceId: "",
  ownerUserId: "",
  status: "",
  orderCode: "",
  topupRequestId: "",
  paidAtFrom: "",
  paidAtTo: "",
  createdAtFrom: "",
  createdAtTo: "",
});

function fmtAmount(v: number | string | undefined) {
  if (v === undefined || v === null || v === "") return "—";
  return typeof v === "number" ? v.toLocaleString("vi-VN") : String(v);
}

export default function AdminOrdersPage() {
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState<AppliedFilters>(initialFilters);
  const [draft, setDraft] = useState<AppliedFilters>(initialFilters);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    const lim = Math.min(100, Math.max(1, applied.limit));
    p.set("limit", String(lim));
    if (applied.workspaceId.trim()) p.set("workspaceId", applied.workspaceId.trim());
    if (applied.ownerUserId.trim()) p.set("ownerUserId", applied.ownerUserId.trim());
    if (applied.status) p.set("status", applied.status);
    if (applied.orderCode.trim()) p.set("orderCode", applied.orderCode.trim());
    if (applied.topupRequestId.trim()) p.set("topupRequestId", applied.topupRequestId.trim());
    if (applied.paidAtFrom.trim()) p.set("paidAtFrom", applied.paidAtFrom.trim());
    if (applied.paidAtTo.trim()) p.set("paidAtTo", applied.paidAtTo.trim());
    if (applied.createdAtFrom.trim()) p.set("createdAtFrom", applied.createdAtFrom.trim());
    if (applied.createdAtTo.trim()) p.set("createdAtTo", applied.createdAtTo.trim());
    return p.toString();
  }, [page, applied]);

  const fetcher = useCallback(
    (token: string) => comviaFetch<OrdersListResponse>(`/admin/orders?${qs}`, { token }),
    [qs],
  );

  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);
  const rows = data?.data ?? [];
  const meta = data?.meta;

  function patchDraft(patch: Partial<AppliedFilters>) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  function applyFilters() {
    const lim = Math.min(100, Math.max(1, draft.limit || 30));
    setApplied({ ...draft, limit: lim });
    setPage(1);
  }

  return (
    <AdminRoleGate>
      {loading ? <PageLoading /> : null}
      {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}
      {data ? (
        <div>
          <PageHeader
            title="Đơn hàng"
            description="Danh sách đơn toàn hệ thống — GET /admin/orders (phân trang và lọc theo tài liệu API admin)."
          />
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <Card className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tổng bản ghi</p>
              <p className="text-3xl font-semibold text-foreground">{meta?.total ?? rows.length}</p>
            </Card>
            <Card className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Trang hiện tại</p>
              <p className="text-3xl font-semibold text-foreground">
                {meta?.page ?? page} / {meta?.totalPages && meta.totalPages > 0 ? meta.totalPages : 1}
              </p>
            </Card>
            <Card className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Số dòng / trang</p>
              <p className="text-3xl font-semibold text-foreground">{meta?.limit ?? applied.limit}</p>
            </Card>
          </div>

          <Card className="mb-6 space-y-4">
            <div className="flex items-center gap-2">
              <HiOutlineAdjustmentsHorizontal className="size-5 text-secondary" />
              <p className="text-sm font-semibold text-foreground">Bộ lọc</p>
            </div>
            <p className="text-xs text-muted-foreground">Chỉnh giá trị rồi bấm «Áp dụng» để tải dữ liệu; phân trang «Trước/Sau» giữ nguyên bộ lọc đã áp dụng.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">workspaceId</label>
                <Input
                  value={draft.workspaceId}
                  onChange={(e) => patchDraft({ workspaceId: e.target.value })}
                  placeholder="UUID workspace"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">ownerUserId</label>
                <Input
                  value={draft.ownerUserId}
                  onChange={(e) => patchDraft({ ownerUserId: e.target.value })}
                  placeholder="User sở hữu đơn"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">status</label>
                <Select value={draft.status} onChange={(e) => patchDraft({ status: e.target.value })}>
                  <option value="">Tất cả</option>
                  <option value="PAID">PAID</option>
                  <option value="CANCELLED">CANCELLED</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">orderCode</label>
                <Input
                  value={draft.orderCode}
                  onChange={(e) => patchDraft({ orderCode: e.target.value })}
                  placeholder="Mã đơn chính xác"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">topupRequestId</label>
                <Input value={draft.topupRequestId} onChange={(e) => patchDraft({ topupRequestId: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">paidAtFrom (ISO)</label>
                <Input value={draft.paidAtFrom} onChange={(e) => patchDraft({ paidAtFrom: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">paidAtTo (ISO)</label>
                <Input value={draft.paidAtTo} onChange={(e) => patchDraft({ paidAtTo: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">createdAtFrom (ISO)</label>
                <Input value={draft.createdAtFrom} onChange={(e) => patchDraft({ createdAtFrom: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">createdAtTo (ISO)</label>
                <Input value={draft.createdAtTo} onChange={(e) => patchDraft({ createdAtTo: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">limit (1–100)</label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={draft.limit}
                  onChange={(e) => patchDraft({ limit: Number(e.target.value) || 30 })}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void applyFilters()}
                icon={<HiOutlineClipboardDocumentList className="size-4" />}
              >
                Áp dụng
              </Button>
            </div>
          </Card>

          <SimpleTable
            rows={rows}
            getRowKey={(r) => r.id}
            columns={[
              {
                key: "code",
                header: "Mã đơn",
                cell: (r) => (
                  <Button variant="ghost" size="sm" className="h-auto px-2 font-mono text-xs" asChild>
                    <Link href={`/admin/orders/${r.id}`}>{r.orderCode ?? r.id}</Link>
                  </Button>
                ),
              },
              { key: "ws", header: "Workspace", cell: (r) => <span className="font-mono text-xs">{r.workspaceId ?? "—"}</span> },
              { key: "own", header: "Owner", cell: (r) => <span className="font-mono text-xs">{r.ownerUserId ?? "—"}</span> },
              {
                key: "st",
                header: "Trạng thái",
                cell: (r) => (r.status ? <EntityStatusBadge value={r.status} /> : "—"),
              },
              {
                key: "tot",
                header: "Tổng (gồm VAT)",
                cell: (r) => <span className="tabular-nums">{fmtAmount(r.totalAmountInclVat)}</span>,
              },
              {
                key: "paid",
                header: "Paid at",
                cell: (r) => (r.paidAt ? new Date(r.paidAt).toLocaleString("vi-VN") : "—"),
              },
              {
                key: "cr",
                header: "Tạo lúc",
                cell: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString("vi-VN") : "—"),
              },
            ]}
          />

          {meta && meta.totalPages > 1 ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
              <p className="text-sm text-muted-foreground">
                Hiển thị {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} trong {meta.total} đơn
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={meta.page <= 1}
                  icon={<HiChevronLeft className="size-4" />}
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                  }}
                >
                  Trước
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={meta.page >= meta.totalPages}
                  icon={<HiChevronRight className="size-4" />}
                  iconPosition="right"
                  onClick={() => {
                    setPage((p) => p + 1);
                  }}
                >
                  Sau
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </AdminRoleGate>
  );
}
