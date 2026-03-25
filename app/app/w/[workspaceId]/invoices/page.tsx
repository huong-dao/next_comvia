"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { SimpleTable } from "@/components/ui/simple-table";
import { comviaFetch } from "@/lib/comviaFetch";
import { workspacePath } from "@/lib/paths";
import { useComviaQuery } from "@/lib/use-comvia-query";

type InvRow = {
  id?: string;
  invoiceCode?: string;
  invoiceNumber?: string;
  status?: string;
  issueDate?: string;
  createdAt?: string;
};

export default function InvoicesListPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const fetcher = useCallback(
    (token: string) => comviaFetch<InvRow[]>(`/workspaces/${workspaceId}/invoices`, { token }),
    [workspaceId],
  );

  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId), fetcher);
  const rows = data ?? [];

  if (loading) return <PageLoading />;
  if (error && !data) return <PageError message={error} onRetry={() => void refetch()} />;

  return (
    <div>
      <PageHeader eyebrow="Billing" title="Hóa đơn" description="Theo snapshot billing & order." />

      <SimpleTable
        rows={rows}
        getRowKey={(r, i) => r.id ?? r.invoiceCode ?? String(i)}
        columns={[
          {
            key: "code",
            header: "Mã HĐ",
            cell: (r) =>
              r.id ? (
                <Link className="font-medium text-primary hover:underline" href={workspacePath(workspaceId, "invoices", r.id)}>
                  {r.invoiceCode ?? r.id}
                </Link>
              ) : (
                r.invoiceCode ?? "—"
              ),
          },
          { key: "num", header: "Số HĐ", cell: (r) => r.invoiceNumber ?? "—" },
          {
            key: "st",
            header: "Trạng thái",
            cell: (r) => (r.status ? <EntityStatusBadge value={r.status} /> : "—"),
          },
          {
            key: "issue",
            header: "Ngày phát hành",
            cell: (r) => (r.issueDate ? new Date(r.issueDate).toLocaleDateString() : "—"),
          },
          {
            key: "cr",
            header: "Tạo lúc",
            cell: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"),
          },
        ]}
      />
    </div>
  );
}
