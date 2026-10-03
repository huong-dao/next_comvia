"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import {
  HiArrowPath,
  HiMiniCheck,
  HiMiniCheckCircle,
  HiMiniXCircle,
  HiOutlineChatBubbleLeftRight,
  HiOutlineClipboard,
  HiOutlineLink,
  HiOutlinePencilSquare,
  HiOutlinePhoto,
  HiOutlinePlus,
} from "react-icons/hi2";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ComviaApiError, comviaFetch, getComviaApiBaseUrl } from "@/lib/comviaFetch";
import { formatComviaError } from "@/lib/api-message";
import { getAccessToken } from "@/lib/auth";
import { useComviaQuery } from "@/lib/use-comvia-query";
import { isWorkspaceOwner, useWorkspaceContext } from "@/components/workspace/workspace-gate";
import {
  rememberOaOAuthWorkspace,
  type OaConnectResponse,
} from "@/lib/oa-oauth";
import { OaRecordModal, type OaRecord } from "@/components/oa/oa-record-modal";

/** Các trạng thái kết nối cần cấp quyền lại (reconnect) — đồng bộ với oa/page.tsx. */
function needsReconnect(status: string) {
  const s = status.toUpperCase();
  return s === "TOKEN_EXPIRED" || s === "RECONNECT_REQUIRED" || s === "CONNECTION_ERROR";
}

/** Ghép base URL cho path ảnh public backend (`/public/oa/<wsId>/<file>`). URL tuyệt đối giữ nguyên. */
function resolveOaImageUrl(url?: string | null): string | null {
  const u = url?.trim();
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const base = getComviaApiBaseUrl().replace(/\/$/, "");
  return `${base}${u.startsWith("/") ? u : `/${u}`}`;
}

export function OaInfoBox({ className }: { className?: string }) {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { role } = useWorkspaceContext();
  const owner = isWorkspaceOwner(role);

  // Record thật + connection nhúng — GET /oa (§6.5). Chưa có record ⇒ 404/null → null.
  const fetcher = useCallback(
    async (token: string): Promise<OaRecord | null> => {
      try {
        return await comviaFetch<OaRecord>(`/workspaces/${workspaceId}/oa`, { token });
      } catch (e) {
        // Chưa tạo OA → backend 404; coi là "chưa có record", không phải lỗi màn hình.
        if (e instanceof ComviaApiError && e.statusCode === 404) return null;
        throw e;
      }
    },
    [workspaceId],
  );
  const { data: record, loading, error, refetch } = useComviaQuery(Boolean(workspaceId), fetcher);

  const hasRecord = record !== null && record !== undefined;
  const connection = record?.connection;
  const statusUpper = (connection?.status ?? "NOT_CONNECTED").toUpperCase();
  const connected = statusUpper === "CONNECTED";

  const avatarUrl = useMemo(() => resolveOaImageUrl(record?.avatarUrl), [record?.avatarUrl]);

  // Popup tạo/sửa record (TICKET-012/019).
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");

  // OAuth connect/disconnect.
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Copy mã OA.
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  function openCreate() {
    setModalMode("create");
    setModalOpen(true);
  }

  function openEdit() {
    setModalMode("edit");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    // Lấy lại record: bắt được cả trường hợp create thành công một phần (record đã
    // tạo nhưng upload ảnh lỗi) để box phản ánh đúng 1-1 (ẩn "Tạo OA").
    void refetch();
  }

  function handleSaved() {
    setModalOpen(false);
    void refetch();
  }

  async function copyCode() {
    if (!record?.code) return;
    try {
      await navigator.clipboard.writeText(record.code);
      setCopied(true);
    } catch {
      // Clipboard bị chặn (quyền/môi trường) — bỏ qua, không chặn UI.
    }
  }

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
    if (needsReconnect(statusUpper)) return "Kết nối lại";
    return "Kết nối";
  }, [statusUpper]);

  return (
    <Card className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HiOutlineChatBubbleLeftRight className="size-5 text-primary" aria-hidden />
          <h2 className="text-base font-semibold text-foreground">Thông tin OA</h2>
        </div>
        {/* "Sửa" chỉ khi đã có record + là Owner (quản lý record là thao tác của Owner). */}
        {hasRecord && owner ? (
          <Button
            variant="ghost"
            size="sm"
            icon={<HiOutlinePencilSquare className="size-4" />}
            onClick={openEdit}
          >
            Sửa
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <div
            className="size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
            aria-hidden
          />
          <p className="text-sm text-muted-foreground">Đang tải thông tin OA…</p>
        </div>
      ) : error && !record ? (
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <p className="text-sm font-medium text-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Thử lại
          </Button>
        </div>
      ) : !hasRecord ? (
        // Trạng thái 1: chưa có record → nút Tạo OA (ẩn hẳn khi đã có record).
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-surface-muted text-muted-foreground">
            <HiOutlineChatBubbleLeftRight className="size-7" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Chưa có Official Account</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {owner
                ? "Tạo thông tin OA để bắt đầu quản lý và kết nối Zalo."
                : "Workspace chưa tạo OA. Liên hệ Owner để tạo."}
            </p>
          </div>
          {owner ? (
            <Button icon={<HiOutlinePlus className="size-4" />} onClick={openCreate}>
              Tạo OA
            </Button>
          ) : null}
        </div>
      ) : (
        // Trạng thái 2 & 3: đã có record.
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface-muted">
                {avatarUrl ? (
                  // next/image không tối ưu ảnh public backend → <img> thuần.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt={`Ảnh đại diện ${record.name}`} className="size-full object-cover" />
                ) : (
                  <HiOutlinePhoto className="size-7 text-muted-foreground" aria-hidden />
                )}
              </div>
              {connected ? (
                <span className="absolute -bottom-1 -right-1 rounded-full bg-card">
                  <HiMiniCheckCircle className="size-5 text-success" aria-hidden />
                </span>
              ) : null}
            </div>
            <div className="min-w-0 pt-1">
              <p className="truncate text-lg font-semibold text-foreground">{record.name}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Official Account trên hệ thống Comvia
              </p>
            </div>
          </div>

          <dl className="space-y-2.5 border-t border-border/60 pt-4 text-sm">
            <InfoRow label="Mã OA">
              <span className="inline-flex items-center gap-1.5">
                <span className="font-medium text-foreground">{record.code}</span>
                <button
                  type="button"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Sao chép mã OA"
                  onClick={() => void copyCode()}
                >
                  {copied ? (
                    <HiMiniCheck className="size-4 text-success" aria-hidden />
                  ) : (
                    <HiOutlineClipboard className="size-4" aria-hidden />
                  )}
                </button>
              </span>
            </InfoRow>

            <InfoRow label="Trạng thái">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span
                  className={cn("size-2 rounded-full", connected ? "bg-success" : "bg-muted-foreground/40")}
                  aria-hidden
                />
                <span className={connected ? "text-success" : "text-muted-foreground"}>
                  {connected ? "Đang kết nối" : "Chưa kết nối"}
                </span>
              </span>
            </InfoRow>

            {connection?.connectedAt ? (
              <InfoRow label="Kết nối lúc">
                <span className="text-foreground">{formatDate(connection.connectedAt, "DD/MM/YYYY HH:mm")}</span>
              </InfoRow>
            ) : null}

            {/* Dòng "Người tạo" ẩn: GET /oa chỉ có createdByUserId (không có tên) — PO ủy quyền chốt. */}

            <InfoRow label="Ngày tạo">
              <span className="text-foreground">{formatDate(record.createdAt)}</span>
            </InfoRow>
          </dl>

          {/* Hành động kết nối/ngắt — chỉ Owner (OAuth Zalo là thao tác của Owner, như oa/page.tsx). */}
          {owner ? (
            <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
              {connected ? (
                <Button
                  variant="outline"
                  icon={<HiMiniXCircle className="size-4" />}
                  disabled={busy}
                  onClick={() => void disconnect()}
                >
                  Ngắt kết nối
                </Button>
              ) : (
                <Button
                  icon={
                    needsReconnect(statusUpper) ? (
                      <HiArrowPath className="size-4" />
                    ) : (
                      <HiOutlineLink className="size-4" />
                    )
                  }
                  disabled={busy}
                  onClick={() => void connect()}
                >
                  {connectLabel}
                </Button>
              )}
            </div>
          ) : null}

          {msg ? (
            <p
              className={cn(
                "text-sm",
                msg.includes("thất bại") || msg.includes("Không") ? "text-danger" : "text-muted-foreground",
              )}
            >
              {msg}
            </p>
          ) : null}
        </div>
      )}

      <OaRecordModal
        open={modalOpen}
        onClose={closeModal}
        mode={modalMode}
        record={modalMode === "edit" ? record : null}
        workspaceId={workspaceId}
        onSaved={handleSaved}
      />
    </Card>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
