"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { HiOutlineAdjustmentsHorizontal } from "react-icons/hi2";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Input, Select } from "@/components/ui/input";
import { SimpleTable } from "@/components/ui/simple-table";
import { comviaFetch } from "@/lib/comviaFetch";
import { useComviaQuery } from "@/lib/use-comvia-query";

type TemplateRow = {
  id: string;
  name?: string;
  code?: string;
  status?: string;
  workspace?: { id?: string; name?: string };
  oaConnection?: { id?: string; oaName?: string; name?: string };
  updatedAt?: string;
};

type TemplateListResponse = { items?: TemplateRow[]; data?: TemplateRow[]; total?: number } | TemplateRow[];
type Filters = { status: string; workspaceId: string; oaId: string; keyword: string; limit: string };
const initialFilters = (): Filters => ({ status: "", workspaceId: "", oaId: "", keyword: "", limit: "50" });

export default function AdminTemplatesPage() {
  const [draft, setDraft] = useState<Filters>(initialFilters);
  const [applied, setApplied] = useState<Filters>(initialFilters);
  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: applied.limit });
    if (applied.status) params.set("status", applied.status);
    if (applied.workspaceId.trim()) params.set("workspaceId", applied.workspaceId.trim());
    if (applied.oaId.trim()) params.set("oaId", applied.oaId.trim());
    if (applied.keyword.trim()) params.set("keyword", applied.keyword.trim());
    return params.toString();
  }, [applied]);
  const fetcher = useCallback(
    (token: string) => comviaFetch<TemplateListResponse>("/admin/templates?" + queryString, { token }),
    [queryString],
  );
  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);
  const rows = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];

  return (
    <AdminRoleGate>
      {loading && !data ? <PageLoading /> : null}
      {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}
      {data ? (
        <div>
          <PageHeader title="ZBS Templates" description="Danh sách mẫu tin ZBS trên toàn hệ thống." />
          <Card className="mb-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><HiOutlineAdjustmentsHorizontal className="size-5 text-secondary" />Bộ lọc</div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Từ khóa</label>
                <Input value={draft.keyword} onChange={(event) => setDraft((value) => ({ ...value, keyword: event.target.value }))} placeholder="Tên hoặc mã mẫu tin" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Trạng thái</label>
                <Select value={draft.status} onChange={(event) => setDraft((value) => ({ ...value, status: event.target.value }))}>
                  <option value="">Tất cả</option><option value="DRAFT">DRAFT</option><option value="PENDING">PENDING</option><option value="APPROVED">APPROVED</option>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Workspace ID</label>
                <Input value={draft.workspaceId} onChange={(event) => setDraft((value) => ({ ...value, workspaceId: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">OA ID</label>
                <Input value={draft.oaId} onChange={(event) => setDraft((value) => ({ ...value, oaId: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Số dòng</label>
                <Select value={draft.limit} onChange={(event) => setDraft((value) => ({ ...value, limit: event.target.value }))}><option value="20">20</option><option value="50">50</option><option value="100">100</option></Select>
              </div>
              <div className="flex items-end gap-2"><Button type="button" variant="outline" onClick={() => setApplied({ ...draft })}>Áp dụng</Button><Button type="button" variant="ghost" onClick={() => void refetch()}>Làm mới</Button></div>
            </div>
          </Card>
          <SimpleTable
            rows={rows}
            getRowKey={(row) => row.id}
            columns={[
              { key: "name", header: "Mẫu tin", cell: (row) => <Link className="font-medium text-secondary hover:underline" href={"/admin/templates/" + row.id}>{row.name ?? row.code ?? row.id}</Link> },
              { key: "code", header: "Mã", cell: (row) => row.code ?? "—" },
              { key: "workspace", header: "Workspace", cell: (row) => row.workspace?.name ?? row.workspace?.id ?? "—" },
              { key: "oa", header: "Zalo OA", cell: (row) => row.oaConnection?.oaName ?? row.oaConnection?.name ?? row.oaConnection?.id ?? "—" },
              { key: "status", header: "Trạng thái", cell: (row) => row.status ? <EntityStatusBadge value={row.status} /> : "—" },
              { key: "updated", header: "Cập nhật", cell: (row) => row.updatedAt ? new Date(row.updatedAt).toLocaleString("vi-VN") : "—" },
            ]}
          />
        </div>
      ) : null}
    </AdminRoleGate>
  );
}
