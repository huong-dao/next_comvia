"use client";

import { HiMiniPlus } from "react-icons/hi2";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { SimpleTable } from "@/components/ui/simple-table";
import { comviaFetch } from "@/lib/comviaFetch";
import { workspacePath } from "@/lib/paths";
import { useComviaQuery } from "@/lib/use-comvia-query";

type TemplateRow = {
  id: string;
  name?: string;
  code?: string;
  status?: string;
  updatedAt?: string;
};

const FILTERS = ["ALL", "DRAFT", "SUBMITTED", "PENDING_ZALO_APPROVAL", "APPROVED", "REJECTED", "DISABLED"] as const;

export default function TemplatesListPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");

  const fetcher = useCallback(
    (token: string) => comviaFetch<TemplateRow[]>(`/workspaces/${workspaceId}/templates`, { token }),
    [workspaceId],
  );

  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId), fetcher);

  const rows = useMemo(() => {
    const list = data ?? [];
    if (filter === "ALL") return list;
    return list.filter((t) => (t.status ?? "").toUpperCase() === filter);
  }, [data, filter]);

  if (loading) return <PageLoading />;
  if (error && !data) return <PageError message={error} onRetry={() => void refetch()} />;

  return (
    <div>
      <PageHeader
        eyebrow="Templates"
        title="Danh sách template"
        description="Lọc theo trạng thái, xem chi tiết và thao tác submit (theo quyền backend)."
        actions={
          <Button icon={<HiMiniPlus className="size-4" />} asChild>
            <Link href={workspacePath(workspaceId, "templates", "new")}>Tạo template</Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f}
            type="button"
            size="sm"
            variant={filter === f ? "primary" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "ALL" ? "Tất cả" : f.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

      <SimpleTable
        rows={rows}
        getRowKey={(r) => r.id}
        columns={[
          {
            key: "name",
            header: "Tên",
            cell: (r) => (
              <Link className="font-medium text-primary hover:underline" href={workspacePath(workspaceId, "templates", r.id)}>
                {r.name ?? r.id}
              </Link>
            ),
          },
          { key: "code", header: "Mã", cell: (r) => r.code ?? "—" },
          {
            key: "status",
            header: "Trạng thái",
            cell: (r) => (r.status ? <EntityStatusBadge value={r.status} /> : "—"),
          },
          {
            key: "updated",
            header: "Cập nhật",
            cell: (r) => (r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "—"),
          },
        ]}
      />
    </div>
  );
}
