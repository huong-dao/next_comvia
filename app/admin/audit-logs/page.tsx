"use client";

import { useCallback, useMemo, useState } from "react";
import { HiOutlineAdjustmentsHorizontal, HiOutlineClipboardDocumentList } from "react-icons/hi2";
import { AuditLogsTable, type AuditLogRow } from "@/components/audit/audit-logs-table";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { comviaFetch } from "@/lib/comviaFetch";
import { useComviaQuery } from "@/lib/use-comvia-query";

type WsRow = { id: string; name?: string };

const DEFAULT_LIMIT = 50;

function clampLimit(raw: string) {
  const n = Number.parseInt(raw.trim(), 10);
  if (Number.isNaN(n)) return DEFAULT_LIMIT;
  return Math.min(200, Math.max(1, n));
}

export default function AdminAuditLogsPage() {
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

  const [workspaceDraftId, setWorkspaceDraftId] = useState("");
  const [action, setAction] = useState("");
  const [limitDraft, setLimitDraft] = useState(String(DEFAULT_LIMIT));

  const [applied, setApplied] = useState({
    workspaceId: "",
    action: "",
    limit: DEFAULT_LIMIT,
  });

  const queryString = useMemo(() => {
    const qs = new URLSearchParams();
    if (applied.workspaceId.trim()) qs.set("workspaceId", applied.workspaceId.trim());
    if (applied.action.trim()) qs.set("action", applied.action.trim());
    qs.set("limit", String(applied.limit));
    return qs.toString();
  }, [applied.workspaceId, applied.action, applied.limit]);

  const fetcher = useCallback(
    (token: string) => comviaFetch<AuditLogRow[]>(`/admin/audit-logs?${queryString}`, { token }),
    [queryString],
  );

  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);
  const rows = data ?? [];

  function applyFilters() {
    const lim = clampLimit(limitDraft);
    setApplied({
      workspaceId: workspaceDraftId.trim(),
      action: action.trim(),
      limit: lim,
    });
    setLimitDraft(String(lim));
  }

  return (
    <AdminRoleGate>
      {loading && !data ? <PageLoading /> : null}
      {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}
      {!loading || data ? (
        <div>
          <PageHeader
            title="Lịch sử hoạt động"
            description="Audit log toàn hệ thống (ADMIN). Để trống workspace = xem mọi workspace."
          />

          <Card className="mb-6 space-y-4">
            <div className="flex items-center gap-2">
              <HiOutlineAdjustmentsHorizontal className="size-5 text-secondary" />
              <p className="text-sm font-semibold text-foreground">Bộ lọc</p>
            </div>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
              <div className="grow">
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor="audit-filter-ws">
                  Workspace (tuỳ chọn)
                </label>
                <SearchableSelect
                  id="audit-filter-ws"
                  aria-label="Lọc workspace audit"
                  options={workspaceOptions}
                  value={workspaceDraftId}
                  onValueChange={(v) => setWorkspaceDraftId(v)}
                  placeholder="Tất cả workspace"
                  emptyText="Không có workspace."
                  disabled={wsLoading}
                />
              </div>
              <div className="grow">
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor="audit-filter-action">
                  Action (tuỳ chọn)
                </label>
                <Input
                  id="audit-filter-action"
                  placeholder="VD member.invited"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor="audit-filter-limit">
                  Limit (1–200)
                </label>
                <Input
                  id="audit-filter-limit"
                  type="number"
                  min={1}
                  max={200}
                  className="w-[112px]"
                  value={limitDraft}
                  onChange={(e) => setLimitDraft(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2 pb-px">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void applyFilters()}
                  icon={<HiOutlineClipboardDocumentList className="size-4" />}
                >
                  Áp dụng
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => void refetch()}>
                  Làm mới
                </Button>
              </div>
            </div>
          </Card>

          <AuditLogsTable rows={rows} showWorkspaceColumn />
        </div>
      ) : null}
    </AdminRoleGate>
  );
}
