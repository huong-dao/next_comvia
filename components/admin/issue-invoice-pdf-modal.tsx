"use client";

import { useEffect, useState } from "react";
import { HiOutlineCloudArrowUp } from "react-icons/hi2";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleTable } from "@/components/ui/simple-table";
import { labelInvoiceMismatchField } from "@/lib/admin-invoice-mismatch-labels";
import { ComviaApiError, comviaMultipartFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";

const MAX_BYTES = 10 * 1024 * 1024;

export type VerifyIssuePdfMismatch = {
  field: string;
  severity?: string;
  expected?: unknown;
  found?: unknown;
  note?: string;
};

export type VerifyIssuePdfFailBody = {
  ok?: false;
  code?: string;
  invoiceId?: string;
  mismatches?: VerifyIssuePdfMismatch[];
  extractedPreview?: Record<string, unknown>;
  message?: string;
};

export type VerifyIssuePdfSuccessBody = {
  ok: true;
  invoice?: {
    id?: string;
    status?: string;
    invoiceNumber?: string;
    issueDate?: string;
    invoicePdfUrl?: string;
  };
};

function fmtCell(v: unknown) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function IssueInvoicePdfModal(props: {
  open: boolean;
  invoiceId: string;
  onClose: () => void;
  onIssued?: () => void;
}) {
  const { open, invoiceId, onClose, onIssued } = props;

  const [file, setFile] = useState<File | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [verifyFail, setVerifyFail] = useState<VerifyIssuePdfFailBody | null>(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setInvoiceNumber("");
    setIssueDate("");
    setFormError(null);
    setVerifyFail(null);
    setBusy(false);
  }, [open, invoiceId]);

  async function submit() {
    setFormError(null);
    setVerifyFail(null);
    const token = getAccessToken();
    if (!token) {
      setFormError("Chưa đăng nhập.");
      return;
    }
    if (!file) {
      setFormError("Vui lòng chọn file PDF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setFormError("PDF tối đa 10MB.");
      return;
    }
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      setFormError("Chỉ chấp nhận file PDF.");
      return;
    }

    const fd = new FormData();
    fd.append("file", file);
    if (invoiceNumber.trim()) fd.append("invoiceNumber", invoiceNumber.trim());
    if (issueDate.trim()) fd.append("issueDate", issueDate.trim());
    fd.append("idempotencyKey", crypto.randomUUID());

    setBusy(true);
    try {
      const res = await comviaMultipartFetch<VerifyIssuePdfSuccessBody>(
        `/admin/invoices/${invoiceId}/verify-issue-pdf`,
        { token, formData: fd, method: "POST" },
      );
      if (res?.ok === true) {
        onIssued?.();
        onClose();
        return;
      }
      setFormError("Phản hồi không hợp lệ (thiếu ok: true).");
    } catch (e) {
      if (e instanceof ComviaApiError && e.statusCode === 422) {
        const d = e.details as VerifyIssuePdfFailBody | null;
        if (d?.mismatches || d?.code === "INVOICE_PDF_VERIFICATION_FAILED") {
          setVerifyFail(d);
          return;
        }
      }
      const msg =
        e instanceof ComviaApiError ? e.message : typeof e === "object" && e && "message" in e ? String((e as Error).message) : "Không upload được.";
      setFormError(msg);
    } finally {
      setBusy(false);
    }
  }

  const mismatches = verifyFail?.mismatches ?? [];

  return (
    <Modal
      open={open}
      title="Xuất chứng hóa đơn (PDF)"
      onClose={() => (!busy ? onClose() : undefined)}
      footer={
        <>
          <Button variant="ghost" type="button" disabled={busy} onClick={() => (!busy ? onClose() : undefined)}>
            Đóng
          </Button>
          <Button type="button" disabled={busy} icon={<HiOutlineCloudArrowUp className="size-4" />} onClick={() => void submit()}>
            {busy ? "Đang xử lý…" : "Gửi xác minh & phát hành"}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">
        Sau khi xuất hóa đơn bên phần mềm kế toán, tải file PDF và gửi lên. Backend sẽ đối chiếu với dữ liệu billing của hệ thống và chuyển trạng thái sang{" "}
        <strong>ISSUED</strong> nếu khớp.
      </p>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="issue-pdf-file">
          File PDF <span className="text-secondary">*</span>
        </label>
        <input
          id="issue-pdf-file"
          type="file"
          accept="application/pdf,.pdf"
          className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-2 file:text-sm file:font-medium"
          onChange={(ev) => {
            const f = ev.target.files?.[0];
            setFile(f ?? null);
            setVerifyFail(null);
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="issue-inv-num">
            Số HĐ (sau khi xuất ngoài — tùy chọn)
          </label>
          <Input
            id="issue-inv-num"
            value={invoiceNumber}
            onChange={(ev) => setInvoiceNumber(ev.target.value)}
            placeholder="VD 1K25TZZ00001"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="issue-date">
            Ngày phát hành (YYYY-MM-DD — tùy chọn)
          </label>
          <Input id="issue-date" type="date" value={issueDate} onChange={(ev) => setIssueDate(ev.target.value)} />
        </div>
      </div>

      {formError ? <p role="alert" className="text-sm font-medium text-danger">{formError}</p> : null}

      {verifyFail ? (
        <div className="space-y-3 rounded-xl border border-border bg-surface-muted/40 p-4">
          <p className="text-sm font-semibold text-foreground">{verifyFail.message ?? "Đối chiếu PDF không thành công"}</p>
          {verifyFail.code ? <p className="text-xs text-muted-foreground">Mã: {verifyFail.code}</p> : null}
          {mismatches.length ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Chi tiết lệch</p>
              <SimpleTable
                rows={mismatches}
                getRowKey={(r, i) => `${r.field}-${i}`}
                columns={[
                  {
                    key: "field",
                    header: "Trường",
                    cell: (r) => <span className="font-medium">{labelInvoiceMismatchField(r.field)}</span>,
                  },
                  {
                    key: "expected",
                    header: "Dữ liệu hệ thống",
                    cell: (r) => <span className="whitespace-pre-wrap break-all text-xs tabular-nums">{fmtCell(r.expected)}</span>,
                  },
                  {
                    key: "found",
                    header: "Trên PDF",
                    cell: (r) => <span className="whitespace-pre-wrap break-all text-xs tabular-nums">{fmtCell(r.found)}</span>,
                  },
                  {
                    key: "note",
                    header: "Ghi chú",
                    cell: (r) => <span className="text-xs text-muted-foreground">{r.note ?? "—"}</span>,
                  },
                ]}
              />
            </div>
          ) : null}
          {verifyFail.extractedPreview && Object.keys(verifyFail.extractedPreview).length > 0 ? (
            <details className="text-xs">
              <summary className="cursor-pointer font-medium text-muted-foreground">Xem preview trích xuất từ PDF</summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-background p-2">
                {JSON.stringify(verifyFail.extractedPreview, null, 2)}
              </pre>
            </details>
          ) : null}
          <p className="text-xs text-muted-foreground">Sửa file hoặc dữ liệu nguồn rồi chọn PDF khác và thử lại.</p>
        </div>
      ) : null}
    </Modal>
  );
}
