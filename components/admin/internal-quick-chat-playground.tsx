"use client";

import { useState } from "react";
import {
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlinePaperAirplane,
  HiOutlinePlusCircle,
} from "react-icons/hi2";
import { PageHeader } from "@/components/app/page-header";
import { PageError } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";

type SessionAction = {
  id?: string;
  type?: string;
  label?: string;
  title?: string;
  status?: string;
};

type SessionRecord = Record<string, unknown> & {
  id?: string;
  sessionId?: string;
  actions?: SessionAction[];
  pendingActions?: SessionAction[];
};

function extractActions(session: SessionRecord | null): SessionAction[] {
  if (!session) return [];
  if (Array.isArray(session.pendingActions)) return session.pendingActions;
  if (Array.isArray(session.actions)) return session.actions;
  return [];
}

export function InternalQuickChatPlayground({
  roleLabel,
}: {
  roleLabel: "ADMIN" | "STAFF";
}) {
  const [workspaceId, setWorkspaceId] = useState("");
  const [title, setTitle] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [message, setMessage] = useState("");
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function withToken<T>(fn: (token: string) => Promise<T>) {
    const token = getAccessToken();
    if (!token) throw new Error("Bạn chưa đăng nhập.");
    return fn(token);
  }

  async function loadSession(targetSessionId: string) {
    if (!targetSessionId.trim()) {
      setError("Nhập sessionId để tải session.");
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await withToken((token) =>
        comviaFetch<SessionRecord>(`/internal/quick-chat/sessions/${targetSessionId.trim()}`, { token }),
      );
      setSession(data);
      setSessionId(String(data.id ?? data.sessionId ?? targetSessionId.trim()));
      setSuccess("Đã tải session.");
    } catch (e) {
      setError(e instanceof ComviaApiError ? e.message : "Không tải được session.");
    } finally {
      setBusy(false);
    }
  }

  async function createSession() {
    if (!workspaceId.trim()) {
      setError("Nhập workspaceId để tạo session.");
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await withToken((token) =>
        comviaFetch<SessionRecord>("/internal/quick-chat/sessions", {
          method: "POST",
          token,
          body: JSON.stringify({ workspaceId: workspaceId.trim(), title: title.trim() || undefined }),
        }),
      );
      const nextSessionId = String(data.id ?? data.sessionId ?? "");
      setSession(data);
      setSessionId(nextSessionId);
      setSuccess("Đã tạo session mới.");
    } catch (e) {
      setError(e instanceof ComviaApiError ? e.message : "Tạo session thất bại.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage() {
    if (!sessionId.trim()) {
      setError("Tạo hoặc nhập sessionId trước khi gửi message.");
      return;
    }
    if (!message.trim()) {
      setError("Nhập nội dung message.");
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await withToken((token) =>
        comviaFetch(`/internal/quick-chat/sessions/${sessionId.trim()}/messages`, {
          method: "POST",
          token,
          body: JSON.stringify({ message: message.trim() }),
        }),
      );
      setSuccess("Đã gửi message.");
      setMessage("");
      await loadSession(sessionId.trim());
    } catch (e) {
      setError(e instanceof ComviaApiError ? e.message : "Gửi message thất bại.");
      setBusy(false);
    }
  }

  async function confirmAction(actionId: string) {
    if (!sessionId.trim()) {
      setError("Thiếu sessionId.");
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await withToken((token) =>
        comviaFetch(`/internal/quick-chat/sessions/${sessionId.trim()}/actions/${actionId}/confirm`, {
          method: "POST",
          token,
        }),
      );
      setSuccess(`Đã confirm action ${actionId}.`);
      await loadSession(sessionId.trim());
    } catch (e) {
      setError(e instanceof ComviaApiError ? e.message : "Confirm action thất bại.");
      setBusy(false);
    }
  }

  const actions = extractActions(session);

  return (
    <div>
      <PageHeader
        title="Internal Quick Chat"
        description={`Playground role ${roleLabel}: tạo session theo target workspace, gửi message nội bộ và confirm action theo API /internal/quick-chat/...`}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="space-y-4 p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Tạo session</p>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">workspaceId</label>
              <Input className="mt-1" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} placeholder="WS_ID" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">title (tùy chọn)</label>
              <Input className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Staff review helper" />
            </div>
            <Button type="button" disabled={busy} onClick={() => void createSession()} icon={<HiOutlinePlusCircle className="size-4" />}>
              Tạo session
            </Button>
          </Card>

          <Card className="space-y-4 p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Tải session</p>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">sessionId</label>
              <Input className="mt-1" value={sessionId} onChange={(e) => setSessionId(e.target.value)} placeholder="SESSION_ID" />
            </div>
            <Button type="button" variant="outline" disabled={busy} onClick={() => void loadSession(sessionId)} icon={<HiOutlineArrowPath className="size-4" />}>
              Tải session
            </Button>
          </Card>

          <Card className="space-y-4 p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Gửi message</p>
            <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Nhập nội dung message cho internal quick chat" />
            <Button type="button" disabled={busy || !sessionId.trim()} onClick={() => void sendMessage()} icon={<HiOutlinePaperAirplane className="size-4" />}>
              Gửi message
            </Button>
          </Card>

          {error ? <PageError message={error} /> : null}
          {success ? <p className="text-sm text-muted-foreground">{success}</p> : null}
        </div>

        <div className="space-y-6">
          <Card className="space-y-4 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Pending actions</p>
              {sessionId ? (
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void loadSession(sessionId)} icon={<HiOutlineArrowPath className="size-4" />}>
                  Refresh
                </Button>
              ) : null}
            </div>
            {actions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có action chờ confirm.</p>
            ) : (
              <div className="space-y-2">
                {actions.map((action, index) => {
                  const actionId = action.id ?? String(index);
                  return (
                    <div key={actionId} className="rounded-xl border border-border/70 bg-surface-muted/50 p-3">
                      <p className="text-sm font-semibold text-foreground">
                        {action.title ?? action.label ?? action.type ?? `Action ${index + 1}`}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">actionId: {actionId}</p>
                      {action.status ? <p className="mt-1 text-xs text-muted-foreground">status: {action.status}</p> : null}
                      <div className="mt-3">
                        <Button type="button" size="sm" disabled={busy} onClick={() => void confirmAction(actionId)} icon={<HiOutlineCheckCircle className="size-4" />}>
                          Confirm
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="space-y-3 p-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Session JSON</p>
            <pre className="max-h-[520px] overflow-auto rounded-xl bg-surface-muted p-4 text-xs whitespace-pre-wrap">
              {session ? JSON.stringify(session, null, 2) : "Chưa có session data."}
            </pre>
          </Card>
        </div>
      </div>
    </div>
  );
}
