"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";
import { workspacePath } from "@/lib/paths";
import { HiOutlineDocumentCheck, HiOutlineDocumentArrowUp, HiOutlinePlus, HiOutlineTrash, HiOutlineXMark } from "react-icons/hi2";

type CreateTemplateResponse = {
  id: string;
  code?: string;
  name?: string;
};

type PlaceholderRow = {
  id: string;
  slug: string;
  defaultValue: string;
};

function newRow(): PlaceholderRow {
  return { id: crypto.randomUUID(), slug: "", defaultValue: "" };
}

function slugLooksValid(slug: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(slug);
}

function rowsToPlaceholders(rows: PlaceholderRow[]):
  | { ok: true; data: Record<string, string> }
  | { ok: false; message: string } {
  const data: Record<string, string> = {};
  const seen = new Set<string>();

  for (const row of rows) {
    const slug = row.slug.trim();
    if (!slug) {
      if (row.defaultValue.trim()) {
        return { ok: false, message: "Mỗi trường phải có slug (tên biến) khi đã có giá trị mặc định." };
      }
      continue;
    }
    if (!slugLooksValid(slug)) {
      return {
        ok: false,
        message: `Slug "${slug}" không hợp lệ. Dùng chữ, số, gạch dưới; ký tự đầu không được là số.`,
      };
    }
    if (seen.has(slug)) {
      return { ok: false, message: `Trùng slug: "${slug}".` };
    }
    seen.add(slug);
    data[slug] = row.defaultValue;
  }

  return { ok: true, data };
}

/** Preview đơn giản: thay {{key}} bằng giá trị mẫu từ object placeholders. */
function previewContent(content: string, placeholders: Record<string, string>) {
  let out = content;
  for (const [key, sample] of Object.entries(placeholders)) {
    const re = new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`, "g");
    out = out.replace(re, sample || `{{${key}}}`);
  }
  return out;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function NewTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [placeholderRows, setPlaceholderRows] = useState<PlaceholderRow[]>(() => [newRow()]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const contentSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const placeholdersParsed = useMemo(() => rowsToPlaceholders(placeholderRows), [placeholderRows]);
  const preview = useMemo(() => {
    if (!placeholdersParsed.ok) return content;
    return previewContent(content, placeholdersParsed.data);
  }, [content, placeholdersParsed]);

  const filledSlugs = useMemo(() => {
    return placeholderRows
      .map((r) => r.slug.trim())
      .filter((s) => s.length > 0 && slugLooksValid(s));
  }, [placeholderRows]);

  const insertPlaceholder = useCallback((slug: string) => {
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
  }, [content]);

  function validatePayload():
    | { ok: true; name: string; content: string; placeholders: Record<string, string> }
    | { ok: false; message: string } {
    const ph = rowsToPlaceholders(placeholderRows);
    if (!ph.ok) return ph;
    if (!name.trim() || !content.trim()) {
      return { ok: false, message: "Tên và nội dung là bắt buộc." };
    }
    return { ok: true, name: name.trim(), content, placeholders: ph.data };
  }

  async function createTemplate(): Promise<CreateTemplateResponse> {
    const v = validatePayload();
    if (!v.ok) {
      setError(v.message);
      throw new Error(v.message);
    }
    const token = getAccessToken();
    if (!token) {
      router.replace("/auth/login");
      throw new Error("Chưa đăng nhập");
    }

    return comviaFetch<CreateTemplateResponse>(`/workspaces/${workspaceId}/templates`, {
      method: "POST",
      token,
      body: JSON.stringify({
        name: v.name,
        content: v.content,
        placeholdersJson: v.placeholders,
      }),
    });
  }

  async function handleSaveOnly() {
    setError(null);
    setLoading(true);
    try {
      await createTemplate();
      router.push(workspacePath(workspaceId, "templates"));
    } catch (err) {
      if (err instanceof ComviaApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        if (err.message === "Chưa đăng nhập") return;
        setError(err.message);
      } else {
        setError("Không lưu được template.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAndSubmit() {
    setError(null);
    setLoading(true);
    try {
      const created = await createTemplate();
      const token = getAccessToken();
      if (!token) {
        router.replace("/auth/login");
        return;
      }
      await comviaFetch(`/workspaces/${workspaceId}/templates/${created.id}/submit`, {
        method: "POST",
        token,
      });
      router.push(workspacePath(workspaceId, "templates", created.id));
    } catch (err) {
      setError(err instanceof ComviaApiError ? err.message : "Không lưu hoặc submit được template.");
    } finally {
      setLoading(false);
    }
  }

  function updateRow(id: string, patch: Partial<Pick<PlaceholderRow, "slug" | "defaultValue">>) {
    setPlaceholderRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    setPlaceholderRows((rows) => {
      const next = rows.filter((r) => r.id !== id);
      return next.length > 0 ? next : [newRow()];
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow="Templates"
        title="Tạo mẫu tin nhắn mới"
        // description="Backend tự sinh mã template (code) khi tạo — không nhập code ở đây."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tên mẫu
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nội dung
            </label>
            <Textarea
              ref={contentRef}
              rows={10}
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
              required
            />
            {filledSlugs.length > 0 ? (
              <div className="mt-2 space-y-2">
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
              <p className="mt-2 text-xs text-muted-foreground">
                Thêm slug hợp lệ ở phần Placeholders bên dưới để hiện nút chèn vào nội dung.
              </p>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Placeholders — trường trong mẫu
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<HiOutlinePlus className="size-4" />}
                onClick={() => setPlaceholderRows((rows) => [...rows, newRow()])}
              >
                Thêm trường
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Mỗi dòng: tên biến (slug, ví dụ <code className="rounded bg-surface-muted px-1">name</code>) và giá trị
              mẫu để xem preview.
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
                      Giá trị mặc định (preview)
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
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
            <Button icon={<HiOutlineDocumentCheck className="size-4" />} type="button" disabled={loading} onClick={() => void handleSaveOnly()}>
              {loading ? "Đang xử lý…" : "Lưu template"}
            </Button>
            <Button icon={<HiOutlineDocumentArrowUp className="size-4" />} type="button" variant="accent" disabled={loading} onClick={() => void handleSaveAndSubmit()}>
              Lưu và gửi duyệt
            </Button>
            <Button icon={<HiOutlineXMark className="size-4" />} variant="outline" asChild>
              <Link href={workspacePath(workspaceId, "templates")}>Hủy</Link>
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preview</p>
          <p className="text-xs text-muted-foreground">
            Thử thay thế dạng <code className="rounded bg-surface-muted px-1">{"{{slug}}"}</code> theo các trường đã khai
            báo.
          </p>
          <pre className="max-h-[min(480px,70vh)] flex-1 overflow-auto rounded-xl bg-surface-muted p-4 text-xs whitespace-pre-wrap text-foreground">
            {preview || "—"}
          </pre>
          {placeholdersParsed.ok && Object.keys(placeholdersParsed.data).length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Khóa: {Object.keys(placeholdersParsed.data).join(", ")}
            </p>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
