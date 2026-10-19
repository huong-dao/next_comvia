"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HiOutlineDocumentCheck, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import { PageError, PageLoading } from "@/components/app/page-state";
import { TemplateCtaFields } from "@/components/template/template-cta-fields";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { getAccessToken } from "@/lib/auth";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { newPlaceholderRow, recordToPlaceholderRows, rowsToPlaceholders, slugLooksValid, type PlaceholderRow } from "@/lib/template-placeholders";
import { normalizeCtaButtons, validateCtaButtons, type TemplateCtaButton, type TemplateCtaDraft } from "@/lib/template-cta";
import { useComviaQuery } from "@/lib/use-comvia-query";

type EditableTemplate = {
  id: string;
  name?: string;
  content?: string;
  status?: string;
  placeholdersJson?: Record<string, string>;
  ctaButtons?: TemplateCtaButton[];
};

export function TemplateEditForm({
  workspaceId,
  templateId,
  onSaved,
}: {
  workspaceId: string;
  templateId: string;
  onSaved: () => void;
}) {
  const fetcher = useCallback(
    (token: string) => comviaFetch<EditableTemplate>(`/workspaces/${workspaceId}/templates/${templateId}`, { token }),
    [workspaceId, templateId],
  );
  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId && templateId), fetcher);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [placeholderRows, setPlaceholderRows] = useState<PlaceholderRow[]>(() => [newPlaceholderRow()]);
  const [ctaButtons, setCtaButtons] = useState<TemplateCtaDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setName(data.name ?? "");
    setContent(data.content ?? "");
    setPlaceholderRows(recordToPlaceholderRows(data.placeholdersJson));
    setCtaButtons(
      (data.ctaButtons ?? []).map(({ id, type, label, target, position }) => ({
        id,
        type,
        label: label ?? "",
        target: target ?? "",
        position,
      })),
    );
  }, [data]);

  const placeholdersParsed = useMemo(() => rowsToPlaceholders(placeholderRows), [placeholderRows]);
  const filledSlugs = useMemo(
    () => placeholderRows.map((row) => row.slug.trim()).filter((slug) => slug.length > 0 && slugLooksValid(slug)),
    [placeholderRows],
  );
  const approved = (data?.status ?? "").toUpperCase() === "APPROVED";

  function updateRow(id: string, patch: Partial<Pick<PlaceholderRow, "label" | "slug" | "defaultValue">>) {
    setPlaceholderRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    setPlaceholderRows((rows) => {
      const next = rows.filter((row) => row.id !== id);
      return next.length > 0 ? next : [newPlaceholderRow()];
    });
  }

  async function save() {
    if (!data || approved) return;
    const placeholders = rowsToPlaceholders(placeholderRows);
    if (!placeholders.ok) {
      setMessage(placeholders.message);
      return;
    }
    const ctaError = validateCtaButtons(ctaButtons, filledSlugs);
    if (ctaError) {
      setMessage(ctaError);
      return;
    }
    const token = getAccessToken();
    if (!token) return;

    setSaving(true);
    setMessage(null);
    try {
      await comviaFetch(`/workspaces/${workspaceId}/templates/${templateId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          name: name.trim() || data.name,
          content: content.trim() || data.content,
          placeholdersJson: placeholders.data,
          ctaButtons: normalizeCtaButtons(ctaButtons),
        }),
      });
      onSaved();
    } catch (saveError) {
      setMessage(saveError instanceof ComviaApiError ? saveError.message : "Không cập nhật được mẫu tin.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoading message="Đang tải mẫu tin…" />;
  if (error && !data) return <PageError message={error} onRetry={() => void refetch()} />;
  if (!data) return null;
  if (approved) {
    return <p className="pb-4 text-sm text-muted-foreground">Mẫu tin đã duyệt chỉ có thể xem, không thể chỉnh sửa.</p>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tên mẫu tin</label>
          <Input value={name} disabled={saving} onChange={(event) => setName(event.target.value)} />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nội dung</label>
          <Textarea rows={15} value={content} disabled={saving} onChange={(event) => setContent(event.target.value)} />
        </div>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Các trường thông tin</p>
          <Button type="button" variant="outline" size="sm" icon={<HiOutlinePlus className="size-4" />} disabled={saving} onClick={() => setPlaceholderRows((rows) => [...rows, newPlaceholderRow()])}>
            Thêm trường
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Mỗi dòng gồm nhãn hiển thị, biến (ví dụ: <code className="rounded bg-surface-muted px-1">name</code>) và giá trị mẫu để xem trước.</p>
        <ul className="space-y-3">
          {placeholderRows.map((row) => (
            <li key={row.id} className="grid gap-2 rounded-xl border border-border/60 bg-surface-muted/40 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Nhãn</label>
                <Input value={row.label} disabled={saving} onChange={(event) => updateRow(row.id, { label: event.target.value })} placeholder="vd: Họ và tên" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Biến</label>
                <Input value={row.slug} disabled={saving} onChange={(event) => updateRow(row.id, { slug: event.target.value })} placeholder="vd: name" className="font-mono text-sm" aria-invalid={row.slug.trim().length > 0 && !slugLooksValid(row.slug.trim())} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Giá trị mẫu</label>
                <Input value={row.defaultValue} disabled={saving} onChange={(event) => updateRow(row.id, { defaultValue: event.target.value })} placeholder="vd: Nguyễn Văn A" />
              </div>
              <div className="flex items-end justify-end sm:justify-center">
                <Button type="button" variant="ghost" size="sm" disabled={saving} className="shrink-0 px-2 text-muted-foreground hover:text-danger" title="Xóa trường" aria-label="Xóa trường" icon={<HiOutlineTrash className="size-4" />} onClick={() => removeRow(row.id)} />
              </div>
            </li>
          ))}
        </ul>
        {!placeholdersParsed.ok ? <p className="text-xs text-danger">{placeholdersParsed.message}</p> : null}
        <TemplateCtaFields buttons={ctaButtons} onChange={setCtaButtons} disabled={saving} />
        {message ? <p className="text-sm text-danger">{message}</p> : null}
        <Button type="button" icon={<HiOutlineDocumentCheck className="size-4" />} disabled={saving} onClick={() => void save()}>
          {saving ? "Đang lưu…" : "Lưu thay đổi"}
        </Button>
      </Card>
    </div>
  );
}
