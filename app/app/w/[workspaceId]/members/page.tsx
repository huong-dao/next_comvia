"use client";

import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { isWorkspaceOwner, useWorkspaceContext } from "@/components/workspace/workspace-gate";
import { Button } from "@/components/ui/button";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SimpleTable } from "@/components/ui/simple-table";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";
import { useComviaQuery } from "@/lib/use-comvia-query";
import { HiOutlineXMark, HiOutlinePaperAirplane } from "react-icons/hi2";

type MemberRow = {
  userId?: string;
  email?: string;
  fullName?: string;
  role?: string;
  status?: string;
  joinedAt?: string;
};

export default function MembersPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { role } = useWorkspaceContext();
  const owner = isWorkspaceOwner(role);

  const fetcher = useCallback(
    (token: string) => comviaFetch<MemberRow[]>(`/workspaces/${workspaceId}/members`, { token }),
    [workspaceId],
  );

  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId), fetcher);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteValue, setInviteValue] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function invite() {
    const token = getAccessToken();
    if (!token) return;
    setInviteBusy(true);
    setMsg(null);
    try {
      await comviaFetch<{ id?: string; expiredAt?: string }>(
        `/workspaces/${workspaceId}/invitations`,
        {
          method: "POST",
          token,
          body: JSON.stringify({
            inviteType: "EMAIL",
            inviteValue: inviteValue.trim(),
            role: "MEMBER",
          }),
        },
      );
      setMsg("Đã gửi email mời thành viên.");
      void refetch();
    } catch (e) {
      setMsg(e instanceof ComviaApiError ? e.message : "Không mời được.");
    } finally {
      setInviteBusy(false);
    }
  }

  async function removeMember(userId: string) {
    if (!owner) return;
    if (!confirm("Xóa thành viên này?")) return;
    const token = getAccessToken();
    if (!token) return;
    try {
      await comviaFetch(`/workspaces/${workspaceId}/members/${userId}`, { method: "DELETE", token });
      void refetch();
    } catch (e) {
      alert(e instanceof ComviaApiError ? e.message : "Lỗi xóa");
    }
  }

  if (loading) return <PageLoading />;
  if (error && !data) return <PageError message={error} onRetry={() => void refetch()} />;

  const rows = data ?? [];

  return (
    <div>
      <PageHeader
        // eyebrow="Workspace"
        title="Thành viên"
        description="Danh sách thành viên của Workspace."
        actions={
          owner ? (
            <Button type="button" onClick={() => setInviteOpen(true)}>
              Mời thành viên
            </Button>
          ) : null
        }
      />

      <SimpleTable
        rows={rows}
        getRowKey={(r, i) => r.userId ?? String(i)}
        columns={[
          { key: "name", header: "Tên", cell: (r) => r.fullName ?? "—" },
          { key: "email", header: "Email", cell: (r) => r.email ?? "—" },
          {
            key: "role",
            header: "Vai trò",
            cell: (r) => (r.role ? <EntityStatusBadge value={r.role} /> : "—"),
          },
          {
            key: "st",
            header: "Trạng thái",
            cell: (r) => (r.status ? <EntityStatusBadge value={r.status} /> : "—"),
          },
          {
            key: "joined",
            header: "Tham gia",
            cell: (r) => (r.joinedAt ? new Date(r.joinedAt).toLocaleString() : "—"),
          },
          {
            key: "act",
            header: "",
            className: "w-28",
            cell: (r) =>
              owner && r.userId ? (
                <Button type="button" variant="outline" size="sm" onClick={() => void removeMember(r.userId!)}>
                  Xóa
                </Button>
              ) : (
                "—"
              ),
          },
        ]}
      />

      <Modal
        open={inviteOpen}
        title="Mời thành viên"
        onClose={() => setInviteOpen(false)}
        footer={
          <>
            <Button icon={<HiOutlineXMark className="size-4" />} variant="ghost" onClick={() => setInviteOpen(false)}>
              Đóng
            </Button>
            <Button icon={<HiOutlinePaperAirplane className="size-4" />} type="button" disabled={inviteBusy} onClick={() => void invite()}>
              {inviteBusy ? "Đang gửi…" : "Gửi lời mời"}
            </Button>
          </>
        }
      >
        <Input
          type="email"
          placeholder="email@company.com"
          value={inviteValue}
          onChange={(e) => setInviteValue(e.target.value)}
        />
        {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      </Modal>
    </div>
  );
}
