"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { isWorkspaceOwner, useWorkspaceContext } from "@/components/workspace/workspace-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Input, Textarea } from "@/components/ui/input";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken, getStoredUser } from "@/lib/auth";
import { formatVND } from "@/lib/utils";
import { workspacePath } from "@/lib/paths";
import {
  newPlaceholderRow,
  previewTemplateContent,
  recordToPlaceholderRows,
  rowsToPlaceholderLabels,
  rowsToPlaceholders,
  slugLooksValid,
  type PlaceholderRow,
} from "@/lib/template-placeholders";
import { useComviaQuery } from "@/lib/use-comvia-query";
import { TemplateCtaFields } from "@/components/template/template-cta-fields";
import { ctaTypeLabel, normalizeCtaButtons, validateCtaButtons, type TemplateCtaButton, type TemplateCtaDraft } from "@/lib/template-cta";
import { HiOutlineDocumentArrowUp, HiOutlineDocumentCheck, HiArrowLeft, HiLockClosed, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";

type TemplateDetail = {
  id: string;
  name?: string;
  code?: string;
  content?: string;
  status?: string;
  requiresOwnerRevision?: boolean;
  revisionReason?: string | null;
  returnedForRevisionAt?: string | null;
  placeholdersJson?: Record<string, string>;
  placeholderLabels?: Record<string, string> | null;
  unitPricePerMessage?: number | string | null;
  ctaButtons?: TemplateCtaButton[];
  updatedAt?: string;
};

export default function TemplateDetailPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const templateId = params.templateId as string;
  const { role } = useWorkspaceContext();
  const owner = isWorkspaceOwner(role);
  const isAppAdmin = (getStoredUser()?.role ?? "").toUpperCase() === "ADMIN";

  const fetcher = useCallback(
    (token: string) =>
      comviaFetch<TemplateDetail>(`/workspaces/${workspaceId}/templates/${templateId}`, { token }),
    [workspaceId, templateId],
  );

  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId && templateId), fetcher);

  const status = (data?.status ?? "").toUpperCase();
  const requiresOwnerRevision = Boolean(data?.requiresOwnerRevision);
  const editable = Boolean(data && (status === "DRAFT" || (status === "SUBMITTED" && requiresOwnerRevision)));
  const canSubmit = owner && editable;

  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [placeholderRows, setPlaceholderRows] = useState<PlaceholderRow[]>(() => [newPlaceholderRow()]);
  const [unitPrice, setUnitPrice] = useState("");
  const [ctaButtons, setCtaButtons] = useState<TemplateCtaDraft[]>([]);
  const [ctaUnitPrices, setCtaUnitPrices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const contentSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  useEffect(() => {
    if (!data) return;
    setName(data.name ?? "");
    setContent(data.content ?? "");
    setPlaceholderRows(recordToPlaceholderRows(data.placeholdersJson, data.placeholderLabels));
    setUnitPrice(
      data.unitPricePerMessage != null && data.unitPricePerMessage !== ""
        ? String(data.unitPricePerMessage)
        : "",
    );
    setCtaButtons(
      (data.ctaButtons ?? []).map(({ id, type, label, target, position }) => ({ id, type, label: label ?? "", target: target ?? "", position })),
    );
    if (isAppAdmin) {
      setCtaUnitPrices(
        Object.fromEntries((data.ctaButtons ?? []).map((button) => [button.id, button.unitPrice == null ? "" : String(button.unitPrice)])),
      );
    } else {
      setCtaUnitPrices({});
    }
  }, [data, isAppAdmin]);

  const placeholdersParsed = useMemo(() => rowsToPlaceholders(placeholderRows), [placeholderRows]);
  /** Khi đã duyệt chỉ xem — preview lấy từ dữ liệu server, không phụ thuộc state form có thể chỉnh. */
  const preview = useMemo(() => {
    if (!data) return "";
    if (!editable) {
      return previewTemplateContent(data.content ?? "", data.placeholdersJson ?? {});
    }
    if (!placeholdersParsed.ok) return content;
    return previewTemplateContent(content, placeholdersParsed.data);
  }, [data, editable, content, placeholdersParsed]);

  const filledSlugs = useMemo(() => {
    return placeholderRows
      .map((r) => r.slug.trim())
      .filter((s) => s.length > 0 && slugLooksValid(s));
  }, [placeholderRows]);

  const insertPlaceholder = useCallback(
    (slug: string) => {
      const token = `{{${slug.trim()}}}`;
      const el = contentRef.current;
      const { start, end } = contentSelectionRef.current;
      const before = content.slice(0, start);
      const after = content.slice(end);
      const next = before + token + after;
      setContent(next);
      const caret = start + token.length;
      contentSelectionRef.current = { start: caret, end: caret };
      queueMicrotask(() => {
        el?.focus();
        el?.setSelectionRange(caret, caret);
      });
    },
    [content],
  );

  async function savePatch() {
    if (!data || !editable) return;
    const ph = rowsToPlaceholders(placeholderRows);
    if (!ph.ok) {
      setMsg(ph.message);
      return;
    }
    const ctaError = validateCtaButtons(ctaButtons, filledSlugs);
    if (ctaError) {
      setMsg(ctaError);
      return;
    }
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      await comviaFetch(`/workspaces/${workspaceId}/templates/${templateId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          name: name || data.name,
          content: content || data.content,
          placeholdersJson: ph.data,
          placeholderLabels: rowsToPlaceholderLabels(placeholderRows),
          ctaButtons: normalizeCtaButtons(ctaButtons),
        }),
      });
      setMsg("Đã cập nhật.");
      void refetch();
    } catch (e) {
      setMsg(e instanceof ComviaApiError ? e.message : "Lỗi cập nhật.");
    } finally {
      setBusy(false);
    }
  }

  async function submitTemplate() {
    if (!canSubmit) return;
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      await comviaFetch(`/workspaces/${workspaceId}/templates/${templateId}/submit`, {
        method: "POST",
        token,
      });
      setMsg("Đã gửi duyệt.");
      void refetch();
    } catch (e) {
      setMsg(e instanceof ComviaApiError ? e.message : "Không submit được.");
    } finally {
      setBusy(false);
    }
  }

  async function saveUnitPrice() {
    if (!isAppAdmin || !data) return;
    const token = getAccessToken();
    if (!token) return;
    const raw = unitPrice.trim();
    const payload =
      raw === ""
        ? { unitPricePerMessage: null }
        : { unitPricePerMessage: Math.round(Number(raw)) };
    if (raw !== "" && (!Number.isFinite(payload.unitPricePerMessage as number) || (payload.unitPricePerMessage as number) < 0)) {
      setMsg("Nhập đơn giá hợp lệ (VND/tin).");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await comviaFetch(`/workspaces/${workspaceId}/templates/${templateId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(payload),
      });
      setMsg("Đã cập nhật đơn giá tin.");
      void refetch();
    } catch (e) {
      setMsg(e instanceof ComviaApiError ? e.message : "Không lưu đơn giá.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCtaUnitPrice(ctaButtonId: string) {
    if (!isAppAdmin) return;
    const token = getAccessToken();
    if (!token) return;
    const raw = (ctaUnitPrices[ctaButtonId] ?? "").trim();
    const value = Number(raw);
    if (!raw || !Number.isInteger(value) || value < 0) {
      setMsg("Nhập đơn giá CTA hợp lệ (VND, số nguyên không âm).");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await comviaFetch(
        `/workspaces/${workspaceId}/templates/${templateId}/cta-buttons/${ctaButtonId}/unit-price`,
        { method: "PATCH", token, body: JSON.stringify({ unitPrice: value }) },
      );
      setMsg("Đã cập nhật đơn giá CTA.");
      void refetch();
    } catch (e) {
      setMsg(e instanceof ComviaApiError ? e.message : "Không lưu được đơn giá CTA.");
    } finally {
      setBusy(false);
    }
  }

  async function disableTemplate() {
    if (!owner) return;
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      await comviaFetch(`/workspaces/${workspaceId}/templates/${templateId}/disable`, {
        method: "POST",
        token,
      });
      setMsg("Đã disable template.");
      void refetch();
    } catch (e) {
      setMsg(e instanceof ComviaApiError ? e.message : "Không disable được.");
    } finally {
      setBusy(false);
    }
  }

  function updateRow(id: string, patch: Partial<Pick<PlaceholderRow, "label" | "slug" | "defaultValue">>) {
    setPlaceholderRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    setPlaceholderRows((rows) => {
      const next = rows.filter((r) => r.id !== id);
      return next.length > 0 ? next : [newPlaceholderRow()];
    });
  }

  if (loading) return <PageLoading />;
  if (error && !data) return <PageError message={error} onRetry={() => void refetch()} />;
  if (!data) return null;

  const readOnlyPlaceholders = Object.entries(data.placeholdersJson ?? {});

  return (
    <div>
      <PageHeader
        eyebrow="Template"
        title={data.name ?? data.code ?? data.id}
        description={data.code ? `Mã: ${data.code}` : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {data.status ? <EntityStatusBadge value={data.status} /> : null}
            <Button icon={<HiArrowLeft className="size-4" />} variant="outline" asChild size="sm">
              <Link href={workspacePath(workspaceId, "templates")}>Danh sách Template</Link>
            </Button>
          </div>
        }
      />

      {requiresOwnerRevision ? (
        <Card className="mb-6 border-border bg-surface-muted/60 p-4">
          <p className="font-semibold text-foreground">Zalo yêu cầu chỉnh sửa mẫu tin</p>
          <p className="mt-1 text-sm text-muted-foreground">{data.revisionReason || "Staff đã trả mẫu tin về để bạn điều chỉnh."}</p>
          {data.returnedForRevisionAt ? (
            <p className="mt-1 text-xs text-muted-foreground">Trả về lúc {new Date(data.returnedForRevisionAt).toLocaleString("vi-VN")}</p>
          ) : null}
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex min-h-0 flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nội dung</p>
          {editable ? (
            <>
              <Textarea
                ref={contentRef}
                rows={14}
                className="min-h-[280px] flex-1"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onSelect={(e) => {
                  contentSelectionRef.current = {
                    start: e.currentTarget.selectionStart,
                    end: e.currentTarget.selectionEnd,
                  };
                }}
                onBlur={(e) => {
                  contentSelectionRef.current = {
                    start: e.currentTarget.selectionStart,
                    end: e.currentTarget.selectionEnd,
                  };
                }}
              />
              {filledSlugs.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Chèn biến vào vị trí con trỏ:</p>
                  <div className="flex flex-wrap gap-2">
                    {filledSlugs.map((slug) => (
                      <Button
                        key={slug}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="font-mono text-xs"
                        onClick={() => insertPlaceholder(slug)}
                      >
                        {`{{${slug}}}`}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Thêm biến hợp lệ ở cột Thông tin để hiện nút chèn.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Mẫu tin đang được Staff hoặc Zalo xử lý — chỉ xem, không chỉnh sửa nội dung.</p>
              <pre className="max-h-[min(520px,70vh)] min-h-[280px] flex-1 overflow-auto rounded-xl bg-surface-muted p-4 text-xs whitespace-pre-wrap">
                {data.content ?? "—"}
              </pre>
            </>
          )}
        </Card>

        <Card className="flex min-h-0 flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Thông tin</p>
          {editable ? (
            <>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Tên</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-amber-600 tracking-wider">
                    Các trường thông tin
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<HiOutlinePlus className="size-4" />}
                    onClick={() => setPlaceholderRows((rows) => [...rows, newPlaceholderRow()])}
                  >
                    Thêm trường
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mỗi dòng gồm nhãn hiển thị, biến (vd: <code className="rounded bg-surface-muted px-1">name</code>)
                  và giá trị mẫu cho xem trước.
                </p>
                <ul className="space-y-3">
                  {placeholderRows.map((row) => (
                    <li
                      key={row.id}
                      className="grid gap-2 rounded-xl border border-border/60 bg-surface-muted/40 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                    >
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Nhãn</label>
                        <Input
                          value={row.label}
                          onChange={(e) => updateRow(row.id, { label: e.target.value })}
                          placeholder="vd: Họ và tên"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Biến</label>
                        <Input
                          value={row.slug}
                          onChange={(e) => updateRow(row.id, { slug: e.target.value })}
                          placeholder="vd: name"
                          className="font-mono text-sm"
                          aria-invalid={row.slug.trim().length > 0 && !slugLooksValid(row.slug.trim())}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">
                          Giá trị mẫu
                        </label>
                        <Input
                          value={row.defaultValue}
                          onChange={(e) => updateRow(row.id, { defaultValue: e.target.value })}
                          placeholder="vd: Nguyễn Văn A"
                        />
                      </div>
                      <div className="flex items-end justify-end sm:justify-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 px-2 text-muted-foreground hover:text-danger"
                          title="Xóa trường"
                          aria-label="Xóa trường"
                          icon={<HiOutlineTrash className="size-4" />}
                          onClick={() => removeRow(row.id)}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
                {!placeholdersParsed.ok ? (
                  <p className="text-xs text-danger">{placeholdersParsed.message}</p>
                ) : null}
                <TemplateCtaFields buttons={ctaButtons} onChange={setCtaButtons} disabled={busy} />
              </div>

              <Button className="w-full sm:w-auto" icon={<HiOutlineDocumentCheck className="size-4" />} type="button" disabled={busy} onClick={() => void savePatch()}>
                Lưu thay đổi
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Mẫu tin đang được Staff hoặc Zalo xử lý — không thêm/sửa/xóa trường thông tin.</p>
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Tên</p>
                <p className="rounded-xl border border-border/60 bg-surface-muted px-3 py-2 text-sm text-foreground">
                  {data.name ?? "—"}
                </p>
              </div>
              {readOnlyPlaceholders.length > 0 ? (
                <ul className="max-h-[min(400px,55vh)] space-y-2 overflow-y-auto rounded-xl bg-surface-muted p-3 text-xs">
                  {readOnlyPlaceholders.map(([key, val]) => (
                    <li key={key} className="flex flex-col gap-0.5 border-b border-border/40 pb-2 last:border-0 last:pb-0">
                      <span className="font-mono font-medium text-foreground">{key}</span>
                      <span className="text-muted-foreground">{String(val ?? "")}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Không có placeholder.</p>
              )}
              {(data.ctaButtons ?? []).length > 0 ? (
                <div className="space-y-2 rounded-xl bg-surface-muted p-3 text-xs">
                  <p className="font-semibold text-foreground">Nút CTA</p>
                  {(data.ctaButtons ?? []).map((button) => (
                    <p key={button.id} className="text-muted-foreground">
                      {button.position + 1}. {button.label || ctaTypeLabel(button.type)}{button.target ? ` · ${button.target}` : ""}
                    </p>
                  ))}
                </div>
              ) : null}
            </>
          )}

          {isAppAdmin ? (
            <div className="space-y-2 border-t border-border/60 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Đơn giá tin (ADMIN)
              </p>
              <p className="text-xs text-muted-foreground">
                VND cho mỗi tin ZNS. Để trống = dùng giá mặc định hệ thống.
                {data.unitPricePerMessage != null
                  ? ` Hiện tại: ${formatVND(Number(data.unitPricePerMessage))}.`
                  : ""}
              </p>
              <Input
                type="number"
                min={0}
                step={1}
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="VD: 400"
              />
              <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void saveUnitPrice()}>
                Lưu đơn giá
              </Button>
            </div>
          ) : null}

          {isAppAdmin && (data.ctaButtons ?? []).length > 0 ? (
            <div className="space-y-3 border-t border-border/60 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Đơn giá nút CTA (ADMIN)</p>
              {(data.ctaButtons ?? []).map((button) => (
                <div key={button.id} className="flex flex-wrap items-end gap-2">
                  <label className="min-w-0 flex-1 text-xs text-muted-foreground">
                    <span className="mb-1 block truncate">{button.label || ctaTypeLabel(button.type)}</span>
                    <Input type="number" min={0} step={1} value={ctaUnitPrices[button.id] ?? ""} onChange={(event) => setCtaUnitPrices((prices) => ({ ...prices, [button.id]: event.target.value }))} placeholder="VD: 100" />
                  </label>
                  <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void saveCtaUnitPrice(button.id)}>Lưu giá</Button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-auto flex flex-col gap-2 border-t border-border/60 pt-4">
            {canSubmit ? (
              <Button icon={<HiOutlineDocumentArrowUp className="size-4" />} type="button" variant="accent" disabled={busy} onClick={() => void submitTemplate()}>
                {requiresOwnerRevision ? "Gửi lại Staff xử lý" : "Gửi Staff xử lý"}
              </Button>
            ) : null}
            {owner ? (
              <Button icon={<HiLockClosed className="size-4" />} type="button" variant="outline" disabled={busy} onClick={() => void disableTemplate()}>
                Khóa (Chủ Workspace)
              </Button>
            ) : null}
          </div>
          {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
        </Card>

        <Card className="flex min-h-0 flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Xem trước</p>
          <p className="text-xs text-muted-foreground">
            Thay thế <code className="rounded bg-surface-muted px-1">{"{{slug}}"}</code> theo giá trị mẫu đã khai báo.
          </p>
          <pre className="max-h-[min(520px,70vh)] min-h-[280px] flex-1 overflow-auto rounded-xl bg-surface-muted p-4 text-xs whitespace-pre-wrap text-foreground">
            {preview || "—"}
          </pre>
        </Card>
      </div>
    </div>
  );
}
