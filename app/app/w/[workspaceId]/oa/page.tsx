"use client";

import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { isWorkspaceOwner, useWorkspaceContext } from "@/components/workspace/workspace-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";
import { useComviaQuery } from "@/lib/use-comvia-query";
import { HiCheck, HiMiniXCircle } from "react-icons/hi2";

type OaStatus = {
  status?: string;
  oaId?: string;
  oaName?: string;
  tokenExpiredAt?: string;
};

export default function OaPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { role } = useWorkspaceContext();
  const owner = isWorkspaceOwner(role);

  const fetcher = useCallback(
    (token: string) => comviaFetch<OaStatus>(`/workspaces/${workspaceId}/oa/status`, { token }),
    [workspaceId],
  );

  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId), fetcher);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function connect() {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      await comviaFetch(`/workspaces/${workspaceId}/oa/connect`, { method: "POST", token });
      setMsg("Đã gọi connect (mock OAuth backend).");
      void refetch();
    } catch (e) {
      setMsg(e instanceof ComviaApiError ? e.message : "Lỗi kết nối.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      await comviaFetch(`/workspaces/${workspaceId}/oa/disconnect`, { method: "POST", token });
      setMsg("Đã ngắt kết nối OA.");
      void refetch();
    } catch (e) {
      setMsg(e instanceof ComviaApiError ? e.message : "Lỗi disconnect.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageLoading />;
  if (error && !data) return <PageError message={error} onRetry={() => void refetch()} />;

  return (
    <div>
      <PageHeader
        eyebrow="Zalo OA"
        title="Kết nối Official Account"
        description="Trạng thái lấy từ API OA (mock). Chỉ Owner kết nối/ngắt."
      />

      <Card className="max-w-xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Trạng thái</span>
          <EntityStatusBadge value={(data?.status ?? "NOT_CONNECTED").toUpperCase()} />
        </div>
        {data?.oaName ? (
          <p className="text-sm text-foreground">
            <span className="text-muted-foreground">OA: </span>
            {data.oaName}
          </p>
        ) : null}
        {data?.oaId ? (
          <p className="text-xs text-muted-foreground">ID: {data.oaId}</p>
        ) : null}
        {data?.tokenExpiredAt ? (
          <p className="text-xs text-muted-foreground">
            Token hết hạn: {new Date(data.tokenExpiredAt).toLocaleString()}
          </p>
        ) : null}

        {owner ? (
          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
            <Button icon={<HiCheck className="size-4" />} type="button" disabled={busy} onClick={() => void connect()}>
              Kết nối OA
            </Button>
            <Button icon={<HiMiniXCircle className="size-4" />} type="button" variant="outline" disabled={busy} onClick={() => void disconnect()}>
              Ngắt kết nối
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Chỉ Owner mới thao tác kết nối OA.</p>
        )}
        {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      </Card>
    </div>
  );
}
