"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { SimpleTable } from "@/components/ui/simple-table";
import { comviaFetch } from "@/lib/comviaFetch";
import { workspacePath } from "@/lib/paths";
import { useComviaQuery } from "@/lib/use-comvia-query";

type InvoiceDetail = {
  id?: string;
  invoiceCode?: string;
  invoiceNumber?: string;
  status?: string;
  issueDate?: string;
  pdfUrl?: string;
  billingSnapshot?: Record<string, unknown>;
  items?: Array<{
    id?: string;
    name?: string;
    quantity?: number;
    unitPrice?: string;
    vatRate?: string;
    totalAmountInclVat?: string;
  }>;
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const invoiceId = params.invoiceId as string;

  const fetcher = useCallback(
    (token: string) =>
      comviaFetch<InvoiceDetail>(`/workspaces/${workspaceId}/invoices/${invoiceId}`, { token }),
    [workspaceId, invoiceId],
  );

  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId && invoiceId), fetcher);

  if (loading) return <PageLoading />;
  if (error && !data) return <PageError message={error} onRetry={() => void refetch()} />;
  if (!data) return null;

  return (
    <div>
      <PageHeader
        eyebrow="Invoice"
        title={data.invoiceCode ?? data.id ?? "Hóa đơn"}
        actions={
          <div className="flex flex-wrap gap-2">
            {data.pdfUrl ? (
              <Button variant="secondary" size="sm" asChild>
                <a href={data.pdfUrl} target="_blank" rel="noreferrer">
                  Tải PDF
                </a>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <Link href={workspacePath(workspaceId, "invoices")}>Danh sách</Link>
            </Button>
          </div>
        }
      />

      <Card className="mb-6 space-y-3">
        <div className="flex flex-wrap gap-3">
          {data.status ? <EntityStatusBadge value={data.status} /> : null}
          <span className="text-sm text-muted-foreground">Số HĐ: {data.invoiceNumber ?? "—"}</span>
        </div>
        {data.issueDate ? (
          <p className="text-sm text-muted-foreground">
            Ngày phát hành: {new Date(data.issueDate).toLocaleDateString()}
          </p>
        ) : null}
        {data.billingSnapshot ? (
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Billing snapshot</p>
            <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-surface-muted p-3 text-xs">
              {JSON.stringify(data.billingSnapshot, null, 2)}
            </pre>
          </div>
        ) : null}
      </Card>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dòng hàng</p>
      <SimpleTable
        rows={data.items ?? []}
        getRowKey={(r, i) => r.id ?? String(i)}
        columns={[
          { key: "n", header: "Tên", cell: (r) => r.name ?? "—" },
          { key: "q", header: "SL", cell: (r) => String(r.quantity ?? "—") },
          { key: "p", header: "Đơn giá", cell: (r) => r.unitPrice ?? "—" },
          { key: "v", header: "VAT%", cell: (r) => r.vatRate ?? "—" },
          { key: "t", header: "Tổng", cell: (r) => r.totalAmountInclVat ?? "—" },
        ]}
      />
    </div>
  );
}
