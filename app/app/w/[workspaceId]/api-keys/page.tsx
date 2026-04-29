"use client";

import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageForbidden, PageLoading } from "@/components/app/page-state";
import { isWorkspaceOwner, useWorkspaceContext } from "@/components/workspace/workspace-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SimpleTable } from "@/components/ui/simple-table";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";
import { useComviaQuery } from "@/lib/use-comvia-query";
import { HiArrowPath, HiLockClosed, HiMiniPlus, HiOutlineXMark, HiCheck } from "react-icons/hi2";

type KeyRow = {
  id: string;
  name?: string;
  keyPrefix?: string;
  status?: string;
  createdAt?: string;
  lastUsedAt?: string;
};

export default function ApiKeysPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { role } = useWorkspaceContext();
  const owner = isWorkspaceOwner(role);

  const fetcher = useCallback(
    (token: string) => comviaFetch<KeyRow[]>(`/workspaces/${workspaceId}/api-keys`, { token }),
    [workspaceId],
  );

  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId), fetcher);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenId, setRegenId] = useState<string | null>(null);

  if (!owner) {
    return <PageForbidden message="Chỉ Owner quản lý API key." backHref={`/app/w/${workspaceId}/dashboard`} />;
  }

  async function createKey() {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setRawKey(null);
    try {
      const res = await comviaFetch<{ apiKey?: string }>(`/workspaces/${workspaceId}/api-keys`, {
        method: "POST",
        token,
        body: JSON.stringify({
          name: name.trim() || "API Key",
          keyPrefixHint: hint.trim() || undefined,
        }),
      });
      setRawKey(res.apiKey ?? null);
      void refetch();
    } catch (e) {
      alert(e instanceof ComviaApiError ? e.message : "Lỗi tạo key");
    } finally {
      setBusy(false);
    }
  }

  async function disableKey(id: string) {
    const token = getAccessToken();
    if (!token) return;
    try {
      await comviaFetch(`/workspaces/${workspaceId}/api-keys/${id}/disable`, { method: "PATCH", token });
      void refetch();
    } catch (e) {
      alert(e instanceof ComviaApiError ? e.message : "Lỗi disable");
    }
  }

  async function regenerate() {
    if (!regenId) return;
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setRawKey(null);
    try {
      const res = await comviaFetch<{ apiKey?: string }>(
        `/workspaces/${workspaceId}/api-keys/${regenId}/regenerate`,
        { method: "POST", token },
      );
      setRawKey(res.apiKey ?? null);
      void refetch();
    } catch (e) {
      alert(e instanceof ComviaApiError ? e.message : "Lỗi regenerate");
    } finally {
      setBusy(false);
    }
  }

  function handleCloseCreateModal() {
    setCreateOpen(false);
    setName("");
    setHint("");
  }

  if (loading) return <PageLoading />;
  if (error && !data) return <PageError message={error} onRetry={() => void refetch()} />;

  const rows = data ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Tích hợp"
        title="API Keys"
        // description="Tạo / vô hiệu / tái tạo key — raw key chỉ hiện một lần."
        actions={
          <Button icon={<HiMiniPlus className="size-4" />} type="button" onClick={() => setCreateOpen(true)}>
            Tạo API key mới
          </Button>
        }
      />

      <SimpleTable
        rows={rows}
        getRowKey={(r) => r.id}
        columns={[
          { key: "n", header: "Tên", cell: (r) => r.name ?? "—" },
          { key: "p", header: "Prefix", cell: (r) => r.keyPrefix ?? "—" },
          {
            key: "s",
            header: "Trạng thái",
            cell: (r) => (r.status ? <EntityStatusBadge value={r.status} /> : "—"),
          },
          {
            key: "lu",
            header: "Dùng lần cuối",
            cell: (r) => (r.lastUsedAt ? new Date(r.lastUsedAt).toLocaleString() : "—"),
          },
          {
            key: "a",
            header: "",
            cell: (r) => (
              <div className="flex flex-wrap gap-1">
                <Button icon={<HiLockClosed className="size-4" />} type="button" variant="outline" size="sm" onClick={() => void disableKey(r.id)}>
                  Disable
                </Button>
                <Button
                  type="button"
                  icon={<HiArrowPath className="size-4" />}
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setRegenId(r.id);
                    setRawKey(null);
                    setRegenOpen(true);
                  }}
                >
                  Regenerate
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={createOpen}
        title="Tạo API key"
        onClose={handleCloseCreateModal}
        footer={
          <>
            <Button icon={<HiOutlineXMark className="size-4" />} variant="ghost" onClick={handleCloseCreateModal}>
              Đóng
            </Button>
            <Button icon={<HiCheck className="size-4" />} type="button" disabled={busy} onClick={() => void createKey()}>
              {busy ? "Đang tạo…" : "Tạo"}
            </Button>
          </>
        }
      >
        <Input placeholder="Tên key" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Prefix gợi ý (tùy chọn)" value={hint} onChange={(e) => setHint(e.target.value)} />
        {rawKey ? (
          <Card className="bg-surface-muted p-3">
            <p className="text-xs font-semibold uppercase text-danger">Lưu ngay — chỉ hiện một lần</p>
            <p className="mt-1 break-all font-mono text-xs">{rawKey}</p>
          </Card>
        ) : null}
      </Modal>

      <Modal
        open={regenOpen}
        title="Regenerate API key?"
        onClose={() => setRegenOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setRegenOpen(false);
                setRegenId(null);
                setRawKey(null);
              }}
            >
              Đóng
            </Button>
            <Button type="button" disabled={busy} onClick={() => void regenerate()}>
              {rawKey ? "Đã tạo key mới" : "Xác nhận regenerate"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Key cũ sẽ mất hiệu lực sau khi regenerate thành công.</p>
        {rawKey ? (
          <Card className="bg-surface-muted p-3">
            <p className="text-xs font-semibold uppercase text-danger">Key mới</p>
            <p className="mt-1 break-all font-mono text-xs">{rawKey}</p>
          </Card>
        ) : null}
      </Modal>
    </div>
  );
}
