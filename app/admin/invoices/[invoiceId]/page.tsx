"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { HiArrowLeft, HiOutlineDocumentCheck } from "react-icons/hi2";
import { IssueInvoicePdfModal } from "@/components/admin/issue-invoice-pdf-modal";
import { AdminStaffRoleGate } from "@/components/admin/role-gate";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { SimpleTable } from "@/components/ui/simple-table";
import { resolveInvoicePdfHref } from "@/lib/invoice-pdf-url";
import { formatVND } from "@/lib/utils";
import { comviaFetch } from "@/lib/comviaFetch";
import { useComviaQuery } from "@/lib/use-comvia-query";

type InvoiceItemRow = {
  id?: string;
  name?: string;
  quantity?: number;
  unitPrice?: number | string;
  vatRate?: number | string;
  vatAmount?: number | string;
  totalAmountExclVat?: number | string;
  totalAmountInclVat?: number | string;
};

type BillingSnap = Record<string, unknown>;

function getSnapString(snap: BillingSnap | undefined, ...keys: string[]) {
  if (!snap) return undefined;
  for (const k of keys) {
    const v = snap[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

function BillingBlock({ billingSnapshotJson, billingType }: { billingSnapshotJson?: BillingSnap; billingType?: string }) {
  const b = billingSnapshotJson;
  const isOrg =
    billingType?.toUpperCase() === "ORGANIZATION" || Boolean(getSnapString(b, "companyName", "company_name"));

  const title = isOrg ? getSnapString(b, "companyName", "company_name") : getSnapString(b, "fullName", "full_name");

  const lines: { label: string; value: string | undefined }[] = [];

  if (isOrg) {
    lines.push(
      { label: "Mã số thuế", value: getSnapString(b, "taxCode", "tax_code") },
      { label: "Địa chỉ", value: getSnapString(b, "address") },
      { label: "Email HĐ", value: getSnapString(b, "invoiceEmail", "invoice_email") },
      { label: "Người đại diện", value: getSnapString(b, "representativeName", "representative_name") },
      { label: "Điện thoại", value: getSnapString(b, "phone") },
    );
  } else {
    lines.push(
      { label: "Họ tên", value: getSnapString(b, "fullName", "full_name") },
      { label: "CCCD", value: getSnapString(b, "citizenId", "citizen_id") },
      { label: "Địa chỉ", value: getSnapString(b, "address") },
      { label: "Email HĐ", value: getSnapString(b, "invoiceEmail", "invoice_email") },
      { label: "Điện thoại", value: getSnapString(b, "phone") },
    );
  }

  const showJson = Boolean(b && Object.keys(b).length && !title);

  return (
    <div className="space-y-2">
      {title ? (
        <>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {lines
              .filter((x) => x.value)
              .map((x) => (
                <div key={x.label}>
                  <dt className="text-xs text-muted-foreground">{x.label}</dt>
                  <dd className="font-medium">{x.value}</dd>
                </div>
              ))}
          </dl>
        </>
      ) : showJson ? (
        <pre className="max-h-52 overflow-auto rounded-lg bg-surface-muted p-3 text-xs">{JSON.stringify(b, null, 2)}</pre>
      ) : (
        <p className="text-sm text-muted-foreground">Không có snapshot billing.</p>
      )}
      {title && b && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground">JSON snapshot đầy đủ</summary>
          <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-surface-muted p-2">{JSON.stringify(b, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}

type AdminInvoiceDetail = {
  id?: string;
  invoiceCode?: string;
  invoiceNumber?: string | null;
  workspaceId?: string;
  orderId?: string;
  billingType?: string;
  billingSnapshotJson?: BillingSnap;
  status?: string;
  issueDate?: string | null;
  invoicePdfUrl?: string | null;
  verificationJson?: unknown;
  createdAt?: string;
  updatedAt?: string;
  totalAmountExclVat?: number | string | null;
  totalVatAmount?: number | string | null;
  totalAmountInclVat?: number | string | null;
  items?: InvoiceItemRow[];
  workspace?: {
    id?: string;
    name?: string;
    slug?: string | null;
    status?: string;
  };
  order?: {
    id?: string;
    orderCode?: string;
    totalAmountInclVat?: number | string;
    paidAt?: string | null;
  };
};

export default function AdminInvoiceDetailPage() {
  const params = useParams();
  const invoiceId = params.invoiceId as string;

  const [issueOpen, setIssueOpen] = useState(false);

  const fetcher = useCallback(
    (token: string) => comviaFetch<AdminInvoiceDetail>(`/admin/invoices/${invoiceId}`, { token }),
    [invoiceId],
  );

  const { data, loading, error, refetch } = useComviaQuery(Boolean(invoiceId), fetcher);

  const pdfHref = resolveInvoicePdfHref(data?.invoicePdfUrl ?? undefined);
  const isPosted = (data?.status ?? "").toUpperCase() === "POSTED";

  if (!invoiceId) return null;

  return (
    <AdminStaffRoleGate>
      {loading ? <PageLoading /> : null}
      {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}
      {data ? (
        <div>
          <PageHeader
            eyebrow="Invoice (staff)"
            title={data.invoiceCode ?? data.id ?? "Chi tiết hóa đơn"}
            description={
              data.workspace?.name ? `Workspace: ${data.workspace.name}` : data.workspaceId ? `Workspace ID: ${data.workspaceId}` : undefined
            }
            actions={
              <div className="flex flex-wrap gap-2">
                {isPosted ? (
                  <Button
                    variant="accent"
                    size="sm"
                    icon={<HiOutlineDocumentCheck className="size-4" />}
                    onClick={() => setIssueOpen(true)}
                  >
                    Phát hành (Issue PDF)
                  </Button>
                ) : null}
                {pdfHref ? (
                  <Button variant="secondary" size="sm" asChild>
                    <a href={pdfHref} target="_blank" rel="noreferrer">
                      Tải PDF
                    </a>
                  </Button>
                ) : null}
                <Button icon={<HiArrowLeft className="size-4" />} variant="outline" size="sm" asChild>
                  <Link href="/admin/invoices">Danh sách hóa đơn</Link>
                </Button>
              </div>
            }
          />

          <Card className="mb-6 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Trạng thái</p>
              <p className="mt-1">{data.status ? <EntityStatusBadge value={data.status} /> : "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Số HĐ</p>
              <p className="font-medium">{data.invoiceNumber ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Loại billing</p>
              <p className="font-medium">{data.billingType ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Ngày phát hành</p>
              <p className="text-sm">{data.issueDate ? new Date(data.issueDate).toLocaleDateString("vi-VN") : "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Trước VAT</p>
              <p className="font-medium tabular-nums">{formatVND(Number(data.totalAmountExclVat ?? 0))}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">VAT</p>
              <p className="font-medium tabular-nums">{formatVND(Number(data.totalVatAmount ?? 0))}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Sau VAT</p>
              <p className="font-semibold tabular-nums">{formatVND(Number(data.totalAmountInclVat ?? 0))}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Đơn hàng liên kết</p>
              {data.order?.id ? (
                <Button variant="ghost" size="sm" className="h-auto px-0 underline-offset-2 hover:underline" asChild>
                  <Link href={`/admin/orders/${data.order.id}`}>{data.order.orderCode ?? data.order.id}</Link>
                </Button>
              ) : (
                <p className="text-sm">—</p>
              )}
            </div>
          </Card>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thông tin xuất hóa đơn (billing)</p>
          <Card className="mb-6 p-5">
            <BillingBlock billingSnapshotJson={data.billingSnapshotJson} billingType={data.billingType} />
          </Card>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dòng hàng</p>
          <SimpleTable
            rows={data.items ?? []}
            getRowKey={(r, i) => r.id ?? String(i)}
            columns={[
              { key: "n", header: "Tên", cell: (r) => r.name ?? "—" },
              {
                key: "q",
                header: "SL",
                cell: (r) => String(r.quantity ?? "—"),
              },
              {
                key: "p",
                header: "Đơn giá",
                cell: (r) => <span className="tabular-nums">{formatVND(Number(r.unitPrice ?? 0))}</span>,
              },
              {
                key: "v",
                header: "VAT%",
                cell: (r) => (
                  <span className="tabular-nums">{r.vatRate === undefined ? "—" : typeof r.vatRate === "number" ? `${r.vatRate}%` : r.vatRate}</span>
                ),
              },
              {
                key: "t",
                header: "Sau VAT",
                cell: (r) => <span className="tabular-nums">{formatVND(Number(r.totalAmountInclVat ?? 0))}</span>,
              },
            ]}
          />

          {data.verificationJson != null && typeof data.verificationJson === "object" && Object.keys(data.verificationJson).length ? (
            <>
              <p className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kết quả xác minh (lần cuối)</p>
              <Card className="p-5">
                <pre className="max-h-64 overflow-auto text-xs">{JSON.stringify(data.verificationJson, null, 2)}</pre>
              </Card>
            </>
          ) : null}

          <IssueInvoicePdfModal
            open={issueOpen}
            invoiceId={invoiceId}
            onClose={() => setIssueOpen(false)}
            onIssued={() => void refetch()}
          />
        </div>
      ) : null}
    </AdminStaffRoleGate>
  );
}
