"use client";

import { HiMiniPlus, HiOutlineTrash } from "react-icons/hi2";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { formatComviaError } from "@/lib/api-message";
import { getAccessToken } from "@/lib/auth";
import { PageHeader } from "@/components/app/page-header";
import { PageEmpty, PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { SimpleTable } from "@/components/ui/simple-table";
import { TablePagination } from "@/components/ui/table-pagination";
import { comviaFetch } from "@/lib/comviaFetch";
import { workspacePath } from "@/lib/paths";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/status-labels";
import { useClientPagination } from "@/lib/use-client-pagination";
import { useComviaQuery } from "@/lib/use-comvia-query";

type CampaignRow = {
  id: string;
  name?: string;
  status?: string;
  pauseReason?: string | null;
  template?: { name?: string; code?: string };
  lastRunAt?: string;
  createdAt?: string;
  rowCount?: number;
  totalData?: number;
};

const STATUS_FILTERS = ["DRAFT", "READY", "RUNNING", "PAUSED", "COMPLETED", "FAILED", "CANCELLED"];

export default function CampaignsListPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const fetcher = useCallback(
    (token: string) => comviaFetch<CampaignRow[]>(`/workspaces/${workspaceId}/campaigns`, { token }),
    [workspaceId],
  );

  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId), fetcher);
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of data ?? []) {
      const k = (c.status ?? "").toUpperCase();
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return counts;
  }, [data]);
  const allRows = useMemo(
    () => (data ?? []).filter((c) => !statusFilter || (c.status ?? "").toUpperCase() === statusFilter),
    [data, statusFilter],
  );
  const { rows, page, totalPages, total, pageSize, setPage } = useClientPagination(allRows);

  /** DELETE /campaigns/:id: DRAFT xóa hẳn; campaign đã chạy chuyển CANCELLED. */
  async function removeCampaign(c: CampaignRow) {
    const isDraft = (c.status ?? "").toUpperCase() === "DRAFT";
    const label = c.name ?? c.id;
    const message = isDraft
      ? `Xóa chiến dịch "${label}"? Không thể hoàn tác.`
      : `Hủy chiến dịch "${label}"?`;
    if (!window.confirm(message)) return;
    const token = getAccessToken();
    if (!token) return;
    setBusyId(c.id);
    setActionError(null);
    try {
      await comviaFetch(`/workspaces/${workspaceId}/campaigns/${c.id}`, { method: "DELETE", token });
      await refetch();
    } catch (e) {
      setActionError(formatComviaError(e, isDraft ? "Không xóa được chiến dịch." : "Không hủy được chiến dịch."));
    } finally {
      setBusyId(null);
    }
  }

  const filterOptions = [
    { value: "", label: "Tất cả", count: (data ?? []).length },
    ...STATUS_FILTERS.filter((v) => statusCounts[v]).map((v) => ({
      value: v,
      label: CAMPAIGN_STATUS_LABELS[v] ?? v,
      count: statusCounts[v],
    })),
  ];

  if (loading) return <PageLoading />;
  if (error && !data) return <PageError message={error} onRetry={() => void refetch()} />;

  return (
    <div>
      <PageHeader
        title="Chiến dịch Zalo"
        description="Gửi tin ZBS hàng loạt theo mẫu đã duyệt."
        actions={
          <Button icon={<HiMiniPlus className="size-4" />} asChild>
            <Link href={workspacePath(workspaceId, "campaigns", "new")}>Tạo chiến dịch</Link>
          </Button>
        }
      />

      {actionError ? <p className="mb-3 text-sm text-red-600">{actionError}</p> : null}

      {(data ?? []).length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {filterOptions.map((f) => (
            <Button
              key={f.value || "all"}
              type="button"
              size="sm"
              variant={statusFilter === f.value ? "primary" : "outline"}
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
            >
              {f.label} ({f.count})
            </Button>
          ))}
        </div>
      ) : null}

      {total === 0 ? (
        (data ?? []).length === 0 ? (
          <PageEmpty title="Chưa có chiến dịch" description="Tạo chiến dịch mới để gửi tin ZNS hàng loạt." />
        ) : (
          <PageEmpty title="Không có chiến dịch" description="Không có chiến dịch nào ở trạng thái này." />
        )
      ) : (
        <SimpleTable
          rows={rows}
          getRowKey={(r) => r.id}
          columns={[
            {
              key: "name",
              header: "Tên chiến dịch",
              cell: (r) => (
                <Link
                  className="font-medium text-primary hover:underline"
                  href={workspacePath(workspaceId, "campaigns", r.id)}
                >
                  {r.name ?? r.id}
                </Link>
              ),
            },
            {
              key: "template",
              header: "Mẫu tin",
              cell: (r) => r.template?.name ?? r.template?.code ?? "—",
            },
            {
              key: "status",
              header: "Trạng thái",
              cell: (r) =>
                r.status ? (
                  <div className="space-y-1">
                    <EntityStatusBadge value={r.status} label={CAMPAIGN_STATUS_LABELS[r.status.toUpperCase()]} />
                    {r.status.toUpperCase() === "PAUSED" && r.pauseReason === "OA_DISCONNECTED" ? (
                      <p className="text-xs text-danger">OA mất kết nối — vào chi tiết để tiếp tục</p>
                    ) : null}
                  </div>
                ) : (
                  "—"
                ),
            },
            {
              key: "rows",
              header: "Số dòng",
              cell: (r) => String(r.rowCount ?? r.totalData ?? "—"),
            },
            {
              key: "lastRun",
              header: "Gửi gần nhất",
              cell: (r) => (r.lastRunAt ? new Date(r.lastRunAt).toLocaleString() : "—"),
            },
            {
              key: "actions",
              header: "",
              cell: (r) => {
                const st = (r.status ?? "").toUpperCase();
                if (st === "CANCELLED") return null;
                return (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    icon={<HiOutlineTrash className="size-4" />}
                    disabled={busyId === r.id}
                    onClick={() => void removeCampaign(r)}
                  >
                    {st === "DRAFT" ? "Xóa" : "Hủy"}
                  </Button>
                );
              },
            },
            {
              key: "created",
              header: "Tạo lúc",
              cell: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"),
            },
          ]}
        />
      )}
      {total > 0 ? (
        <TablePagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          unitLabel="chiến dịch"
          ariaLabel="Phân trang danh sách chiến dịch"
        />
      ) : null}
    </div>
  );
}
