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
import { getAccessToken } from "@/lib/auth";
import { workspacePath } from "@/lib/paths";
import {
  newPlaceholderRow,
  previewTemplateContent,
  recordToPlaceholderRows,
  rowsToPlaceholders,
  slugLooksValid,
  type PlaceholderRow,
} from "@/lib/template-placeholders";
import { useComviaQuery } from "@/lib/use-comvia-query";
import { HiOutlineDocumentArrowUp, HiOutlineDocumentCheck, HiArrowLeft, HiLockClosed, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";

type TemplateDetail = {
  id: string;
  name?: string;
  code?: string;
  content?: string;
  status?: string;
  placeholdersJson?: Record<string, string>;
  updatedAt?: string;
};

export default function TemplateDetailPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const templateId = params.templateId as string;
  const { role } = useWorkspaceContext();
  const owner = isWorkspaceOwner(role);

  const fetcher = useCallback(
    (token: string) =>
      comviaFetch<TemplateDetail>(`/workspaces/${workspaceId}/templates/${templateId}`, { token }),
    [workspaceId, templateId],
  );

  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId && templateId), fetcher);

  const approved = (data?.status ?? "").toUpperCase() === "APPROVED";
  const editable = Boolean(data && !approved);

  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [placeholderRows, setPlaceholderRows] = useState<PlaceholderRow[]>(() => [newPlaceholderRow()]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const contentSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  useEffect(() => {
    if (!data) return;
    setName(data.name ?? "");
    setContent(data.content ?? "");
    setPlaceholderRows(recordToPlaceholderRows(data.placeholdersJson));
  }, [data]);

  const placeholdersParsed = useMemo(() => rowsToPlaceholders(placeholderRows), [placeholderRows]);
  /** Khi đã duyệt chỉ xem — preview lấy từ dữ liệu server, không phụ thuộc state form có thể chỉnh. */
  const preview = useMemo(() => {
    if (!data) return "";
    if (approved) {
      return previewTemplateContent(data.content ?? "", data.placeholdersJson ?? {});
    }
    if (!placeholdersParsed.ok) return content;
    return previewTemplateContent(content, placeholdersParsed.data);
  }, [data, approved, content, placeholdersParsed]);

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
    if (!data || approved) return;
    const ph = rowsToPlaceholders(placeholderRows);
    if (!ph.ok) {
      setMsg(ph.message);
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

  function updateRow(id: string, patch: Partial<Pick<PlaceholderRow, "slug" | "defaultValue">>) {
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
                  Thêm slug hợp lệ ở cột "Thông tin" để hiện nút chèn.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Template đã duyệt — chỉ xem, không chỉnh sửa nội dung.</p>
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
                  Slug (vd: <code className="rounded bg-surface-muted px-1">name</code>) và giá trị mẫu cho xem trước.
                </p>
                <ul className="space-y-3">
                  {placeholderRows.map((row) => (
                    <li
                      key={row.id}
                      className="grid gap-2 rounded-xl border border-border/60 bg-surface-muted/40 p-3 sm:grid-cols-[1fr_1fr_auto]"
                    >
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Slug</label>
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
              </div>

              <Button className="w-full sm:w-auto" icon={<HiOutlineDocumentCheck className="size-4" />} type="button" disabled={busy} onClick={() => void savePatch()}>
                Lưu thay đổi
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Template đã duyệt — không thêm/sửa/xóa trường placeholder.</p>
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
            </>
          )}

          <div className="mt-auto flex flex-col gap-2 border-t border-border/60 pt-4">
            <Button icon={<HiOutlineDocumentArrowUp className="size-4" />} type="button" variant="accent" disabled={busy || approved} onClick={() => void submitTemplate()}>
              Gửi duyệt
            </Button>
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
