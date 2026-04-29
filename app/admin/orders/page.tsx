"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { HiOutlineAdjustmentsHorizontal, HiOutlineClipboardDocumentList } from "react-icons/hi2";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Input, Select } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SimpleTable } from "@/components/ui/simple-table";
import { comviaFetch } from "@/lib/comviaFetch";
import { useComviaQuery } from "@/lib/use-comvia-query";

const PAGE_SIZE = 30;

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
  workspace?: {
    name?: string;
    slug?: string;
  };
  owner?: {
    fullName?: string;
    email?: string;
  };
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

type WsRow = {
  id: string;
  name?: string;
  slug?: string;
};

type UserRow = {
  id: string;
  email?: string;
  fullName?: string;
  role?: string;
};

type AppliedFilters = {
  workspaceId: string;
  ownerUserId: string;
  status: string;
  orderCode: string;
};

const initialFilters = (): AppliedFilters => ({
  workspaceId: "",
  ownerUserId: "",
  status: "",
  orderCode: "",
});

function isEndUserRole(role?: string) {
  const r = (role ?? "").toUpperCase();
  return r !== "ADMIN" && r !== "STAFF";
}

function fmtAmount(v: number | string | undefined) {
  if (v === undefined || v === null || v === "") return "—";
  return typeof v === "number" ? v.toLocaleString("vi-VN") : String(v);
}

export default function AdminOrdersPage() {
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState<AppliedFilters>(initialFilters);
  const [draft, setDraft] = useState<AppliedFilters>(initialFilters);

  const wsFetcher = useCallback((token: string) => comviaFetch<WsRow[]>("/admin/workspaces", { token }), []);
  const usersFetcher = useCallback((token: string) => comviaFetch<UserRow[]>("/admin/users", { token }), []);

  const { data: wsData, loading: wsLoading } = useComviaQuery(true, wsFetcher);
  const { data: usersData, loading: usersLoading } = useComviaQuery(true, usersFetcher);

  const workspaceOptions = useMemo(
    () =>
      (wsData ?? []).map((w) => ({
        value: w.id,
        label: w.name || w.id,
        // description: w.id,
      })),
    [wsData],
  );

  const endUserOptions = useMemo(() => {
    return (usersData ?? [])
      .filter((u) => isEndUserRole(u.role))
      .map((u) => ({
        value: u.id,
        label: u.fullName || u.email || u.id,
        description: u.email && u.fullName ? u.email : u.email ? undefined : u.id,
      }));
  }, [usersData]);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", String(PAGE_SIZE));
    if (applied.workspaceId.trim()) p.set("workspaceId", applied.workspaceId.trim());
    if (applied.ownerUserId.trim()) p.set("ownerUserId", applied.ownerUserId.trim());
    if (applied.status) p.set("status", applied.status);
    if (applied.orderCode.trim()) p.set("orderCode", applied.orderCode.trim());
    return p.toString();
  }, [page, applied]);

  const ordersFetcher = useCallback(
    (token: string) => comviaFetch<OrdersListResponse>(`/admin/orders?${qs}`, { token }),
    [qs],
  );

  const { data, loading, error, refetch } = useComviaQuery(true, ordersFetcher);
  const rows = data?.data ?? [];
  const meta = data?.meta;

  function patchDraft(patch: Partial<AppliedFilters>) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  function applyFilters() {
    setApplied({ ...draft });
    setPage(1);
  }

  return (
    <AdminRoleGate>
      {loading && !data ? <PageLoading /> : null}
      {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}
      {data ? (
        <div>
          <PageHeader
            title="Đơn hàng"
            // description="Danh sách đơn toàn hệ thống — GET /admin/orders."
          />

          <Card className="mb-6 space-y-4">
            <div className="flex items-center gap-2">
              <HiOutlineAdjustmentsHorizontal className="size-5 text-secondary" />
              <p className="text-sm font-semibold text-foreground">Bộ lọc</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor="orders-filter-code">
                  Mã đơn
                </label>
                <Input
                  id="orders-filter-code"
                  value={draft.orderCode}
                  onChange={(e) => patchDraft({ orderCode: e.target.value })}
                  placeholder="Nhập mã đơn"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor="orders-filter-ws">
                  Workspace
                </label>
                <SearchableSelect
                  id="orders-filter-ws"
                  aria-label="Lọc workspace"
                  options={workspaceOptions}
                  value={draft.workspaceId}
                  onValueChange={(v) => patchDraft({ workspaceId: v })}
                  placeholder="Tất cả workspace"
                  emptyText="Không có workspace."
                  disabled={wsLoading}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor="orders-filter-user">
                  Người dùng
                </label>
                <SearchableSelect
                  id="orders-filter-user"
                  aria-label="Lọc người dùng (không gồm admin/staff)"
                  options={endUserOptions}
                  value={draft.ownerUserId}
                  onValueChange={(v) => patchDraft({ ownerUserId: v })}
                  placeholder="Tất cả người dùng"
                  emptyText="Không có người dùng phù hợp."
                  disabled={usersLoading}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor="orders-filter-status">
                  Trạng thái
                </label>
                <Select
                  id="orders-filter-status"
                  value={draft.status}
                  onChange={(e) => patchDraft({ status: e.target.value })}
                >
                  <option value="">Tất cả</option>
                  <option value="PAID">Đã thanh toán</option>
                  <option value="CANCELLED">Đã hủy</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor="orders-filter-user">&ensp;</label>
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
                  <Button variant="ghost" size="sm" className="h-auto px-2 text-sm" asChild>
                    <Link href={`/admin/orders/${r.id}`}>{r.orderCode ?? r.id}</Link>
                  </Button>
                ),
              },
              { key: "ws", header: "Workspace", cell: (r) => r.workspace?.name ?? "—" },
              { key: "own", header: "Người dùng", cell: (r) => r.owner?.fullName ?? "—" },
              {
                key: "st",
                header: "Trạng thái",
                cell: (r) => (r.status ? <EntityStatusBadge value={r.status} /> : "—"),
              },
              {
                key: "tot",
                header: "Tổng cộng",
                cell: (r) => <span className="tabular-nums">{fmtAmount(r.totalAmountInclVat)}</span>,
              },
              {
                key: "paid",
                header: "Thanh toán lúc",
                cell: (r) => (r.paidAt ? new Date(r.paidAt).toLocaleString("vi-VN") : "—"),
              },
              {
                key: "cr",
                header: "Tạo lúc",
                cell: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString("vi-VN") : "—"),
              },
            ]}
          />

          <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
            <p className="text-center text-sm text-muted-foreground">
              Hiển thị{" "}
              {meta && meta.total > 0
                ? `${(meta.page - 1) * meta.limit + 1}–${Math.min(meta.page * meta.limit, meta.total)}`
                : "0"}{" "}
              trong {meta?.total ?? 0} đơn
            </p>
            <PaginationBar
              currentPage={page}
              totalPages={meta?.totalPages ?? 0}
              onPageChange={setPage}
              ariaLabel="Phân trang danh sách đơn"
            />
          </div>
        </div>
      ) : null}
    </AdminRoleGate>
  );
}
