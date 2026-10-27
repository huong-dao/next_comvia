"use client";

import { useCallback, useMemo, useState } from "react";
import { HiOutlineAdjustmentsHorizontal } from "react-icons/hi2";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Input, Select } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SimpleTable } from "@/components/ui/simple-table";
import { comviaFetch } from "@/lib/comviaFetch";
import { useComviaQuery } from "@/lib/use-comvia-query";

const OA_STATUSES = [
  "NOT_CONNECTED",
  "CONNECTED",
  "TOKEN_EXPIRED",
  "CONNECTION_ERROR",
  "RECONNECT_REQUIRED",
  "DISCONNECTED",
] as const;

type OaRow = {
  id: string;
  name?: string;
  code?: string;
  workspace?: { id: string; name?: string; owner?: { email?: string; fullName?: string } };
  connection?: { oaId?: string; oaName?: string; status?: string; connectedAt?: string; tokenExpiredAt?: string };
};

type OaListResponse = { items: OaRow[]; page: number; limit: number; total: number };

type Filters = { workspaceId: string; status: string; keyword: string; limit: string };
const initialFilters = (): Filters => ({ workspaceId: "", status: "", keyword: "", limit: "50" });

export default function AdminOaConnectionsPage() {
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Filters>(initialFilters);
  const [applied, setApplied] = useState<Filters>(initialFilters);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: applied.limit });
    if (applied.workspaceId.trim()) params.set("workspaceId", applied.workspaceId.trim());
    if (applied.status) params.set("status", applied.status);
    if (applied.keyword.trim()) params.set("keyword", applied.keyword.trim());
    return params.toString();
  }, [page, applied]);

  const fetcher = useCallback(
    (token: string) => comviaFetch<OaListResponse>("/admin/oa-connections?" + queryString, { token }),
    [queryString],
  );
  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 0;

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
          <PageHeader title="Zalo OAs" description="Danh sách kết nối Zalo OA của toàn hệ thống." />
          <Card className="mb-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <HiOutlineAdjustmentsHorizontal className="size-5 text-secondary" />
              Bộ lọc
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Từ khóa</label>
                <Input value={draft.keyword} onChange={(event) => setDraft((value) => ({ ...value, keyword: event.target.value }))} placeholder="Tên OA hoặc mã OA" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Workspace ID</label>
                <Input value={draft.workspaceId} onChange={(event) => setDraft((value) => ({ ...value, workspaceId: event.target.value }))} placeholder="Tất cả workspace" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Trạng thái</label>
                <Select value={draft.status} onChange={(event) => setDraft((value) => ({ ...value, status: event.target.value }))}>
                  <option value="">Tất cả</option>
                  {OA_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Số dòng</label>
                <Select value={draft.limit} onChange={(event) => setDraft((value) => ({ ...value, limit: event.target.value }))}>
                  <option value="20">20</option><option value="50">50</option><option value="100">100</option>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button type="button" variant="outline" onClick={applyFilters}>Áp dụng</Button>
                <Button type="button" variant="ghost" onClick={() => void refetch()}>Làm mới</Button>
              </div>
            </div>
          </Card>
          <SimpleTable
            rows={data.items}
            getRowKey={(row) => row.id}
            columns={[
              { key: "oa", header: "Zalo OA", cell: (row) => <div><p className="font-medium">{row.connection?.oaName ?? row.name ?? "—"}</p><p className="text-xs text-muted-foreground">{row.connection?.oaId ?? row.code ?? "—"}</p></div> },
              { key: "workspace", header: "Workspace", cell: (row) => <div><p>{row.workspace?.name ?? "—"}</p><p className="text-xs text-muted-foreground">{row.workspace?.owner?.fullName ?? row.workspace?.owner?.email ?? ""}</p></div> },
              { key: "status", header: "Trạng thái", cell: (row) => row.connection?.status ? <EntityStatusBadge value={row.connection.status} /> : "—" },
              { key: "connected", header: "Kết nối lúc", cell: (row) => row.connection?.connectedAt ? new Date(row.connection.connectedAt).toLocaleString("vi-VN") : "—" },
              { key: "expires", header: "Token hết hạn", cell: (row) => row.connection?.tokenExpiredAt ? new Date(row.connection.tokenExpiredAt).toLocaleString("vi-VN") : "—" },
            ]}
          />
          <div className="mt-4"><PaginationBar currentPage={page} totalPages={totalPages} onPageChange={setPage} ariaLabel="Phân trang Zalo OA" /></div>
        </div>
      ) : null}
    </AdminRoleGate>
  );
}
