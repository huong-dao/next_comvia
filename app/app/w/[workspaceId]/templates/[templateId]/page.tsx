"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
import { useComviaQuery } from "@/lib/use-comvia-query";
import { HiOutlineDocumentCheck, HiOutlineDocumentArrowUp, HiLockClosed, HiArrowLeft } from "react-icons/hi2";

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

  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [phJson, setPhJson] = useState("{}");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setName(data.name ?? "");
    setContent(data.content ?? "");
    setPhJson(JSON.stringify(data.placeholdersJson ?? {}, null, 2));
  }, [data]);

  const approved = (data?.status ?? "").toUpperCase() === "APPROVED";
  const editable = Boolean(data && !approved);

  async function savePatch() {
    if (!data || approved) return;
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      let placeholdersJson: Record<string, string> = {};
      try {
        placeholdersJson = JSON.parse(phJson || "{}") as Record<string, string>;
      } catch {
        setMsg("JSON placeholder không hợp lệ.");
        setBusy(false);
        return;
      }
      await comviaFetch(`/workspaces/${workspaceId}/templates/${templateId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({
          name: name || data.name,
          content: content || data.content,
          placeholdersJson,
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

  if (loading) return <PageLoading />;
  if (error && !data) return <PageError message={error} onRetry={() => void refetch()} />;
  if (!data) return null;

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
        <Card className="space-y-4 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nội dung</p>
          {editable ? (
            <Textarea rows={14} value={content} onChange={(e) => setContent(e.target.value)} />
          ) : (
            <pre className="max-h-[420px] overflow-auto rounded-xl bg-surface-muted p-4 text-xs whitespace-pre-wrap">
              {data.content ?? "—"}
            </pre>
          )}
        </Card>

        <Card className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Metadata</p>
          {editable ? (
            <>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Tên</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Placeholders JSON</label>
                <Textarea rows={8} value={phJson} onChange={(e) => setPhJson(e.target.value)} />
              </div>
              <Button className="max-w-100" icon={<HiOutlineDocumentCheck className="size-4" />} type="button" disabled={busy} onClick={() => void savePatch()}>
                Lưu thay đổi
              </Button>
            </>
          ) : (
            <pre className="rounded-xl bg-surface-muted p-3 text-xs">
              {JSON.stringify(data.placeholdersJson ?? {}, null, 2)}
            </pre>
          )}

          <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
            <Button icon={<HiOutlineDocumentArrowUp className="size-4" />} type="button" variant="accent" disabled={busy || approved} onClick={() => void submitTemplate()}>
              Gửi duyệt
            </Button>
            {owner ? (
              <Button icon={<HiLockClosed className="size-4" />} type="button" variant="outline" disabled={busy} onClick={() => void disableTemplate()}>
                Disable (Owner)
              </Button>
            ) : null}
          </div>
          {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
        </Card>
      </div>
    </div>
  );
}
