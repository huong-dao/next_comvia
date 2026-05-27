"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { HiOutlineAdjustmentsHorizontal, HiOutlineClipboardDocumentList } from "react-icons/hi2";
import { AuditLogsTable, type AuditLogRow } from "@/components/audit/audit-logs-table";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageForbidden, PageLoading } from "@/components/app/page-state";
import { isWorkspaceOwner, useWorkspaceContext } from "@/components/workspace/workspace-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { comviaFetch } from "@/lib/comviaFetch";
import { workspacePath } from "@/lib/paths";
import { useComviaQuery } from "@/lib/use-comvia-query";

const DEFAULT_LIMIT = 50;

function clampLimit(raw: string) {
  const n = Number.parseInt(raw.trim(), 10);
  if (Number.isNaN(n)) return DEFAULT_LIMIT;
  return Math.min(200, Math.max(1, n));
}

export default function WorkspaceActivityHistoryPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const { role } = useWorkspaceContext();
  const owner = isWorkspaceOwner(role);

  const [action, setAction] = useState("");
  const [limitDraft, setLimitDraft] = useState(String(DEFAULT_LIMIT));
  const [applied, setApplied] = useState({ action: "", limit: DEFAULT_LIMIT });

  const queryString = useMemo(() => {
    const qs = new URLSearchParams();
    if (applied.action.trim()) qs.set("action", applied.action.trim());
    qs.set("limit", String(applied.limit));
    return qs.toString();
  }, [applied.action, applied.limit]);

  const fetcher = useCallback(
    (token: string) =>
      comviaFetch<AuditLogRow[]>(`/workspaces/${workspaceId}/audit-logs?${queryString}`, {
        token,
        headers: { "x-workspace-id": workspaceId },
      }),
    [workspaceId, queryString],
  );

  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId && owner), fetcher);
  const rows = data ?? [];

  function applyFilters() {
    const lim = clampLimit(limitDraft);
    setApplied({ action: action.trim(), limit: lim });
    setLimitDraft(String(lim));
  }

  if (!owner) {
    return (
      <PageForbidden
        message="Chỉ Owner workspace mới xem được lịch sử hoạt động."
        backHref={workspacePath(workspaceId, "dashboard")}
      />
    );
  }

  return (
    <div>
      {loading && !data ? <PageLoading /> : null}
      {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}

      {!loading || data ? (
        <div>
          <PageHeader
            title="Lịch sử hoạt động"
            description="Hoạt động được ghi tự động (audit log). Dữ liệu thuộc workspace hiện tại."
            actions={
              <Button variant="outline" size="sm" asChild icon={<HiOutlineClipboardDocumentList className="size-4" />}>
                <Link href={workspacePath(workspaceId, "dashboard")}>Về tổng quan</Link>
              </Button>
            }
          />

          <Card className="mb-6 space-y-4">
            <div className="flex items-center gap-2">
              <HiOutlineAdjustmentsHorizontal className="size-5 text-secondary" />
              <p className="text-sm font-semibold text-foreground">Bộ lọc</p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="grow">
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor="activity-action">
                  Action (tuỳ chọn)
                </label>
                <Input
                  id="activity-action"
                  placeholder="VD member.invited"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="max-w-md"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground" htmlFor="activity-limit">
                  Limit (1–200, mặc định 50)
                </label>
                <Input
                  id="activity-limit"
                  value={limitDraft}
                  onChange={(e) => setLimitDraft(e.target.value)}
                  type="number"
                  min={1}
                  max={200}
                  className="max-w-[120px]"
                />
              </div>
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
          </Card>

          <AuditLogsTable rows={rows} showWorkspaceColumn={false} />
        </div>
      ) : null}
    </div>
  );
}
