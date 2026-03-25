"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";
import { workspacePath } from "@/lib/paths";
import { HiOutlineDocumentCheck, HiOutlineDocumentArrowUp, HiOutlineXMark } from "react-icons/hi2";

type CreateTemplateResponse = {
  id: string;
  code?: string;
  name?: string;
};

function parsePlaceholders(raw: string): { ok: true; data: Record<string, string> } | { ok: false; message: string } {
  try {
    const parsed = JSON.parse(raw || "{}") as unknown;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, message: "Placeholders phải là JSON object." };
    }
    return { ok: true, data: parsed as Record<string, string> };
  } catch {
    return { ok: false, message: "Placeholders phải là JSON object hợp lệ." };
  }
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
  const [placeholdersJson, setPlaceholdersJson] = useState('{\n  "name": "string"\n}');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const placeholdersParsed = useMemo(() => parsePlaceholders(placeholdersJson), [placeholdersJson]);
  const preview = useMemo(() => {
    if (!placeholdersParsed.ok) return content;
    return previewContent(content, placeholdersParsed.data);
  }, [content, placeholdersParsed]);

  function validatePayload():
    | { ok: true; name: string; content: string; placeholders: Record<string, string> }
    | { ok: false; message: string } {
    const ph = parsePlaceholders(placeholdersJson);
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

  return (
    <div>
      <PageHeader
        eyebrow="Templates"
        title="Tạo template mới"
        description="Backend tự sinh mã template (code) khi tạo — không nhập code ở đây."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tên template
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nội dung
            </label>
            <Textarea rows={10} value={content} onChange={(e) => setContent(e.target.value)} required />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Placeholders (JSON object)
            </label>
            <Textarea rows={8} value={placeholdersJson} onChange={(e) => setPlaceholdersJson(e.target.value)} />
            {!placeholdersParsed.ok ? (
              <p className="mt-1 text-xs text-danger">{placeholdersParsed.message}</p>
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
            Thử thay thế dạng <code className="rounded bg-surface-muted px-1">{"{{key}}"}</code> theo các khóa trong JSON.
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
