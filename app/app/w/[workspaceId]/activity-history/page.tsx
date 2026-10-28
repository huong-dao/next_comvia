"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { HiOutlineClipboardDocumentList } from "react-icons/hi2";
import { AuditLogsTable, type AuditLogRow } from "@/components/audit/audit-logs-table";
import { FilterCard, FilterField } from "@/components/app/filter-card";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageForbidden, PageLoading } from "@/components/app/page-state";
import { isWorkspaceOwner, useWorkspaceContext } from "@/components/workspace/workspace-gate";
import { Button } from "@/components/ui/button";
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

          <FilterCard onApply={applyFilters} onRefresh={() => void refetch()}>
            <FilterField label="Action (tuỳ chọn)" htmlFor="activity-action" className="grow">
              <Input
                id="activity-action"
                placeholder="VD member.invited"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="max-w-md"
              />
            </FilterField>
            <FilterField label="Limit (1–200, mặc định 50)" htmlFor="activity-limit">
              <Input
                id="activity-limit"
                value={limitDraft}
                onChange={(e) => setLimitDraft(e.target.value)}
                type="number"
                min={1}
                max={200}
                className="max-w-[120px]"
              />
            </FilterField>
          </FilterCard>

          <AuditLogsTable rows={rows} showWorkspaceColumn={false} />
        </div>
      ) : null}
    </div>
  );
}
