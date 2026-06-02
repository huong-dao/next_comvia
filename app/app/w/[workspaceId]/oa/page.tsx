"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { isWorkspaceOwner, useWorkspaceContext } from "@/components/workspace/workspace-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { formatComviaError } from "@/lib/api-message";
import { getAccessToken } from "@/lib/auth";
import {
  oaOAuthBannerMessage,
  parseOaOAuthCallback,
  parseOaOAuthFlash,
  rememberOaOAuthWorkspace,
  type OaConnectResponse,
  type OaOAuthCallbackResult,
} from "@/lib/oa-oauth";
import { useComviaQuery } from "@/lib/use-comvia-query";
import { HiArrowPath, HiCheck, HiMiniXCircle } from "react-icons/hi2";

type OaStatus = {
  id?: string;
  workspaceId?: string;
  status?: string;
  oaId?: string;
  oaName?: string;
  oaAvatarLight?: string | null;
  oaAvatarDark?: string | null;
  tokenExpiredAt?: string;
  connectedAt?: string;
  hasAccessToken?: boolean;
  hasRefreshToken?: boolean;
};

function needsReconnect(status: string) {
  const s = status.toUpperCase();
  return s === "TOKEN_EXPIRED" || s === "RECONNECT_REQUIRED" || s === "CONNECTION_ERROR";
}

function OaPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
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

  const statusUpper = (data?.status ?? "NOT_CONNECTED").toUpperCase();
  const connected = statusUpper === "CONNECTED";
  const showConnect = owner && (!connected || needsReconnect(statusUpper));
  const showDisconnect = owner && connected;

  useEffect(() => {
    const flash = parseOaOAuthFlash(searchParams);
    const legacy = parseOaOAuthCallback(searchParams);
    const result: OaOAuthCallbackResult | null = legacy ?? (flash ? { status: flash, workspaceId, connected: flash === "success" } : null);

    if (!result) return;

    if (result.status === "success") {
      setMsg(oaOAuthBannerMessage(result));
      void refetch();
    } else {
      setMsg(oaOAuthBannerMessage(result));
    }

    router.replace(`/app/w/${workspaceId}/oa`);
  }, [searchParams, workspaceId, router, refetch]);

  async function connect() {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await comviaFetch<OaConnectResponse>(`/workspaces/${workspaceId}/oa/connect`, {
        method: "POST",
        token,
      });
      if (!res.authorizationUrl) {
        setMsg("API không trả authorizationUrl — kiểm tra cấu hình Zalo OAuth trên backend.");
        setBusy(false);
        return;
      }
      rememberOaOAuthWorkspace(workspaceId);
      window.location.href = res.authorizationUrl;
    } catch (e) {
      setMsg(formatComviaError(e, "Không bắt đầu được luồng kết nối Zalo."));
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
      setMsg("Đã ngắt kết nối Zalo OA.");
      void refetch();
    } catch (e) {
      setMsg(formatComviaError(e, "Không ngắt kết nối được."));
    } finally {
      setBusy(false);
    }
  }

  const connectLabel = useMemo(() => {
    if (statusUpper === "TOKEN_EXPIRED") return "Kết nối lại (token hết hạn)";
    if (statusUpper === "RECONNECT_REQUIRED" || statusUpper === "CONNECTION_ERROR") {
      return "Kết nối lại Zalo OA";
    }
    return "Kết nối Zalo OA";
  }, [statusUpper]);

  if (loading) return <PageLoading />;
  if (error && !data) return <PageError message={error} onRetry={() => void refetch()} />;

  return (
    <div>
      <PageHeader
        title="Kết nối Official Account"
        description="OAuth Zalo — cấp quyền trên trang Zalo, sau đó quay lại Comvia. Chỉ Owner kết nối hoặc ngắt."
      />

      <Card className="max-w-xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Trạng thái</span>
          <EntityStatusBadge value={statusUpper} />
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
        {data?.connectedAt ? (
          <p className="text-xs text-muted-foreground">
            Kết nối lúc: {new Date(data.connectedAt).toLocaleString()}
          </p>
        ) : null}
        {data?.tokenExpiredAt ? (
          <p className="text-xs text-muted-foreground">
            Token hết hạn: {new Date(data.tokenExpiredAt).toLocaleString()}
          </p>
        ) : null}
        {needsReconnect(statusUpper) && owner ? (
          <p className="text-sm text-amber-600">
            OA cần cấp quyền lại — bấm &quot;{connectLabel}&quot; để mở Zalo OAuth.
          </p>
        ) : null}

        {owner ? (
          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
            {showConnect ? (
              <Button
                icon={needsReconnect(statusUpper) ? <HiArrowPath className="size-4" /> : <HiCheck className="size-4" />}
                type="button"
                disabled={busy}
                onClick={() => void connect()}
              >
                {connectLabel}
              </Button>
            ) : null}
            {showDisconnect ? (
              <Button
                icon={<HiMiniXCircle className="size-4" />}
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void disconnect()}
              >
                Ngắt kết nối
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Chỉ Owner mới thao tác kết nối OA.</p>
        )}

        {msg ? (
          <p
            className={
              msg.includes("thất bại") || msg.includes("Lỗi")
                ? "text-sm text-danger"
                : "text-sm text-muted-foreground"
            }
          >
            {msg}
          </p>
        ) : null}

        <p className="border-t border-border/60 pt-4 text-xs text-muted-foreground">
          Backend cần <code className="rounded bg-surface-muted px-1">ZALO_OAUTH_SUCCESS_REDIRECT_URL</code> trỏ tới{" "}
          <code className="rounded bg-surface-muted px-1">/app/settings/oa</code> (hoặc alias{" "}
          <code className="rounded bg-surface-muted px-1">/settings/oa</code>).
        </p>
      </Card>
    </div>
  );
}

export default function OaPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <OaPageContent />
    </Suspense>
  );
}
