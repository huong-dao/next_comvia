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
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { SimpleTable } from "@/components/ui/simple-table";
import { TablePagination } from "@/components/ui/table-pagination";
import { comviaFetch } from "@/lib/comviaFetch";
import { TEMPLATE_STATUS_LABELS } from "@/lib/status-labels";
import { useClientPagination } from "@/lib/use-client-pagination";
import { useComviaQuery } from "@/lib/use-comvia-query";

/** Số OA nạp cho ô chọn — đủ phủ danh sách hiện tại mà không kéo cả bảng về client. */
const OA_OPTIONS_LIMIT = 200;

type TemplateRow = {
  id: string;
  name?: string;
  code?: string;
  status?: string;
  workspace?: { id?: string; name?: string };
  oaConnection?: { id?: string; oaId?: string; oaName?: string; name?: string };
  updatedAt?: string;
};

type TemplateListResponse = { items?: TemplateRow[]; data?: TemplateRow[]; total?: number } | TemplateRow[];

type WsRow = { id: string; name?: string; slug?: string };
/** `GET /admin/workspaces` trả `{ data, meta }` — giống trang Đơn hàng / Lịch sử hoạt động. */
type WsListResponse = { data?: WsRow[]; meta?: unknown };

type OaRow = {
  id: string;
  name?: string;
  code?: string;
  workspace?: { id?: string; name?: string };
  connection?: { oaId?: string; oaName?: string };
};
type OaListResponse = { items?: OaRow[]; data?: OaRow[] } | OaRow[];

type Filters = { status: string; workspaceId: string; oaId: string; keyword: string; limit: string };
const initialFilters = (): Filters => ({ status: "", workspaceId: "", oaId: "", keyword: "", limit: "50" });

export default function AdminTemplatesPage() {
  const [draft, setDraft] = useState<Filters>(initialFilters);
  const [applied, setApplied] = useState<Filters>(initialFilters);

  const wsFetcher = useCallback((token: string) => comviaFetch<WsListResponse>("/admin/workspaces", { token }), []);
  const { data: wsData, loading: wsLoading } = useComviaQuery(true, wsFetcher);

  const oaFetcher = useCallback(
    (token: string) => comviaFetch<OaListResponse>("/admin/oa-connections?limit=" + OA_OPTIONS_LIMIT, { token }),
    [],
  );
  const { data: oaData, loading: oaLoading } = useComviaQuery(true, oaFetcher);

  const oaRows = useMemo(() => (Array.isArray(oaData) ? oaData : oaData?.items ?? oaData?.data ?? []), [oaData]);

  const workspaceOptions = useMemo<SearchableSelectOption[]>(
    () => (wsData?.data ?? []).map((w) => ({ value: w.id, label: w.name || w.slug || w.id })),
    [wsData],
  );

  /** Đã chọn workspace thì chỉ gợi ý OA của workspace đó. */
  const oaOptions = useMemo<SearchableSelectOption[]>(
    () =>
      oaRows
        .filter((oa) => !draft.workspaceId || oa.workspace?.id === draft.workspaceId)
        .map((oa) => ({
          value: oa.id,
          label: oa.connection?.oaName || oa.name || oa.code || oa.id,
          description: oa.workspace?.name,
        })),
    [oaRows, draft.workspaceId],
  );

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: applied.limit });
    if (applied.status) params.set("status", applied.status);
    if (applied.workspaceId.trim()) params.set("workspaceId", applied.workspaceId.trim());
    if (applied.keyword.trim()) params.set("keyword", applied.keyword.trim());
    return params.toString();
  }, [applied]);
  const fetcher = useCallback(
    (token: string) => comviaFetch<TemplateListResponse>("/admin/templates?" + queryString, { token }),
    [queryString],
  );
  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);
  const allRows = useMemo(() => (Array.isArray(data) ? data : data?.items ?? data?.data ?? []), [data]);

  /**
   * Lọc OA chạy ở client trên dữ liệu đã trả về: một OA có thể được tham chiếu
   * bằng id bản ghi kết nối hoặc bằng chính `oaId` của Zalo, nên khớp cả hai để
   * không phụ thuộc vào quy ước id của riêng một endpoint.
   */
  const visibleRows = useMemo(() => {
    if (!applied.oaId) return allRows;
    const picked = oaRows.find((oa) => oa.id === applied.oaId);
    const aliases = new Set(
      [applied.oaId, picked?.id, picked?.connection?.oaId, picked?.code].filter(Boolean) as string[],
    );
    return allRows.filter((row) => {
      const oa = row.oaConnection;
      return Boolean((oa?.id && aliases.has(oa.id)) || (oa?.oaId && aliases.has(oa.oaId)));
    });
  }, [allRows, applied.oaId, oaRows]);

  const { rows, page, totalPages, total, pageSize, setPage } = useClientPagination(visibleRows);

  /** Đổi workspace thì bỏ OA đang chọn, vì OA đó có thể không thuộc workspace mới. */
  function patchDraft(patch: Partial<Filters>) {
    setDraft((value) => {
      const next = { ...value, ...patch };
      if (patch.workspaceId !== undefined && patch.workspaceId !== value.workspaceId) next.oaId = "";
      return next;
    });
  }

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
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor="tpl-filter-keyword">Từ khóa</label>
                <Input id="tpl-filter-keyword" value={draft.keyword} onChange={(event) => patchDraft({ keyword: event.target.value })} placeholder="Tên hoặc mã mẫu tin" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor="tpl-filter-status">Trạng thái</label>
                <Select id="tpl-filter-status" value={draft.status} onChange={(event) => patchDraft({ status: event.target.value })}>
                  <option value="">Tất cả</option>
                  {Object.entries(TEMPLATE_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor="tpl-filter-ws">Workspace</label>
                <SearchableSelect
                  id="tpl-filter-ws"
                  aria-label="Lọc theo workspace"
                  options={workspaceOptions}
                  value={draft.workspaceId}
                  onValueChange={(value) => patchDraft({ workspaceId: value })}
                  placeholder="Tất cả workspace"
                  emptyText="Không có workspace."
                  matchValue={false}
                  disabled={wsLoading}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor="tpl-filter-oa">Zalo OA</label>
                <SearchableSelect
                  id="tpl-filter-oa"
                  aria-label="Lọc theo Zalo OA"
                  options={oaOptions}
                  value={draft.oaId}
                  onValueChange={(value) => patchDraft({ oaId: value })}
                  placeholder="Tất cả OA"
                  emptyText={draft.workspaceId ? "Workspace này chưa có OA." : "Không có OA."}
                  matchValue={false}
                  disabled={oaLoading}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor="tpl-filter-limit">Số dòng</label>
                <Select id="tpl-filter-limit" value={draft.limit} onChange={(event) => patchDraft({ limit: event.target.value })}><option value="20">20</option><option value="50">50</option><option value="100">100</option></Select>
              </div>
              <div className="flex items-end gap-2">
                <Button size="lg" type="button" variant="outline" onClick={() => { setApplied({ ...draft }); setPage(1); }}>Áp dụng</Button
                ><Button size="lg" type="button" variant="ghost" onClick={() => void refetch()}>Làm mới</Button>
              </div>
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
              { key: "status", header: "Trạng thái", cell: (row) => row.status ? <EntityStatusBadge value={row.status} label={TEMPLATE_STATUS_LABELS[row.status.toUpperCase()]} /> : "—" },
              { key: "updated", header: "Cập nhật", cell: (row) => row.updatedAt ? new Date(row.updatedAt).toLocaleString("vi-VN") : "—" },
            ]}
          />
          <TablePagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            unitLabel="mẫu tin"
            ariaLabel="Phân trang danh sách mẫu tin"
          />
        </div>
      ) : null}
    </AdminRoleGate>
  );
}
