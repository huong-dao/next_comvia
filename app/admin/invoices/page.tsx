"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { HiOutlineAdjustmentsHorizontal, HiOutlineClipboardDocumentList } from "react-icons/hi2";
import { AdminStaffRoleGate } from "@/components/admin/role-gate";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
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

type InvoiceRow = {
  id: string;
  workspaceId?: string;
  orderId?: string;
  invoiceCode?: string;
  invoiceNumber?: string | null;
  status?: string;
  issueDate?: string | null;
  billingType?: string;
  createdAt?: string;
};

type InvoicesListResponse = {
  data: InvoiceRow[];
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
};

type AppliedFilters = {
  workspaceId: string;
  status: string;
  invoiceCode: string;
};

const initialFilters = (): AppliedFilters => ({
  workspaceId: "",
  status: "",
  invoiceCode: "",
});

export default function AdminInvoicesPage() {
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState<AppliedFilters>(initialFilters);
  const [draft, setDraft] = useState<AppliedFilters>(initialFilters);

  const wsFetcher = useCallback((token: string) => comviaFetch<WsRow[]>("/admin/workspaces", { token }), []);
  const { data: wsData, loading: wsLoading } = useComviaQuery(true, wsFetcher);

  const workspaceOptions = useMemo(
    () =>
      (wsData ?? []).map((w) => ({
        value: w.id,
        label: w.name || w.id,
      })),
    [wsData],
  );

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", String(PAGE_SIZE));
    if (applied.workspaceId.trim()) p.set("workspaceId", applied.workspaceId.trim());
    if (applied.status) p.set("status", applied.status);
    if (applied.invoiceCode.trim()) p.set("invoiceCode", applied.invoiceCode.trim());
    return p.toString();
  }, [page, applied]);

  const invoicesFetcher = useCallback(
    (token: string) => comviaFetch<InvoicesListResponse>(`/admin/invoices?${qs}`, { token }),
    [qs],
  );

  const { data, loading, error, refetch } = useComviaQuery(true, invoicesFetcher);
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
    <AdminStaffRoleGate>
      {loading && !data ? <PageLoading /> : null}
      {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}
      {data ? (
        <div>
          <PageHeader title="Hóa đơn" />

          <Card className="mb-6 space-y-4">
            <div className="flex items-center gap-2">
              <HiOutlineAdjustmentsHorizontal className="size-5 text-secondary" />
              <p className="text-sm font-semibold text-foreground">Bộ lọc</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor="inv-filter-code">
                  Mã chứng hóa đơn
                </label>
                <Input
                  id="inv-filter-code"
                  value={draft.invoiceCode}
                  onChange={(e) => patchDraft({ invoiceCode: e.target.value })}
                  placeholder="Khớp chính xác"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor="inv-filter-ws">
                  Workspace
                </label>
                <SearchableSelect
                  id="inv-filter-ws"
                  aria-label="Lọc workspace"
                  options={workspaceOptions}
                  value={draft.workspaceId}
                  onValueChange={(v) => patchDraft({ workspaceId: v })}
                  placeholder="Tất cả"
                  emptyText="Không có workspace."
                  disabled={wsLoading}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor="inv-filter-status">
                  Trạng thái
                </label>
                <Select
                  id="inv-filter-status"
                  value={draft.status}
                  onChange={(e) => patchDraft({ status: e.target.value })}
                >
                  <option value="">Tất cả</option>
                  <option value="POSTED">Đã khởi tạo (POSTED)</option>
                  <option value="ISSUED">Đã phát hành</option>
                  <option value="CANCELLED">Đã hủy</option>
                </Select>
              </div>
              <div className="flex flex-col justify-end">
                <label className="mb-1 block text-xs text-muted-foreground">&emsp;</label>
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
                header: "Mã HĐ",
                cell: (r) => (
                  <Button variant="ghost" size="sm" className="h-auto px-2 text-sm" asChild>
                    <Link href={`/admin/invoices/${r.id}`}>{r.invoiceCode ?? r.id}</Link>
                  </Button>
                ),
              },
              { key: "num", header: "Số HĐ", cell: (r) => r.invoiceNumber ?? "—" },
              {
                key: "st",
                header: "Trạng thái",
                cell: (r) => (r.status ? <EntityStatusBadge value={r.status} /> : "—"),
              },
              {
                key: "bt",
                header: "Loại billing",
                cell: (r) => r.billingType ?? "—",
              },
              {
                key: "iss",
                header: "Ngày phát hành",
                cell: (r) => (r.issueDate ? new Date(r.issueDate).toLocaleDateString("vi-VN") : "—"),
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
              trong {meta?.total ?? 0} hóa đơn
            </p>
            <PaginationBar
              currentPage={page}
              totalPages={meta?.totalPages ?? 0}
              onPageChange={setPage}
              ariaLabel="Phân trang danh sách hóa đơn"
            />
          </div>
        </div>
      ) : null}
    </AdminStaffRoleGate>
  );
}
