"use client";

import { HiMiniPlus } from "react-icons/hi2";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageEmpty, PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { SimpleTable } from "@/components/ui/simple-table";
import { comviaFetch } from "@/lib/comviaFetch";
import { workspacePath } from "@/lib/paths";
import { useComviaQuery } from "@/lib/use-comvia-query";

type CampaignRow = {
  id: string;
  name?: string;
  status?: string;
  template?: { name?: string; code?: string };
  lastRunAt?: string;
  createdAt?: string;
  rowCount?: number;
  totalData?: number;
};

export default function CampaignsListPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const fetcher = useCallback(
    (token: string) => comviaFetch<CampaignRow[]>(`/workspaces/${workspaceId}/campaigns`, { token }),
    [workspaceId],
  );

  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId), fetcher);
  const rows = useMemo(() => data ?? [], [data]);

  if (loading) return <PageLoading />;
  if (error && !data) return <PageError message={error} onRetry={() => void refetch()} />;

  return (
    <div>
      <PageHeader
        title="Chiến dịch Zalo"
        description="Gửi tin ZNS hàng loạt theo mẫu đã duyệt — tải CSV, upload danh sách và thực hiện gửi."
        actions={
          <Button icon={<HiMiniPlus className="size-4" />} asChild>
            <Link href={workspacePath(workspaceId, "campaigns", "new")}>Tạo chiến dịch</Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <PageEmpty title="Chưa có chiến dịch" description="Tạo chiến dịch mới để gửi tin ZNS hàng loạt." />
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
              cell: (r) => (r.status ? <EntityStatusBadge value={r.status} /> : "—"),
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
              key: "created",
              header: "Tạo lúc",
              cell: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"),
            },
          ]}
        />
      )}
    </div>
  );
}
