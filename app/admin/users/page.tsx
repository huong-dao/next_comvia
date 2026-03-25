"use client";

import { useCallback, useState } from "react";
import { HiLockClosed, HiLockOpen, HiOutlineUsers } from "react-icons/hi2";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { SimpleTable } from "@/components/ui/simple-table";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";
import { useComviaQuery } from "@/lib/use-comvia-query";

type UserRow = {
  id: string;
  email?: string;
  fullName?: string;
  role?: string;
  status?: string;
  createdAt?: string;
  locked?: boolean;
};

export default function AdminUsersPage() {
  const fetcher = useCallback((token: string) => comviaFetch<UserRow[]>("/admin/users", { token }), []);
  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);
  const [busy, setBusy] = useState<string | null>(null);
  const rows = data ?? [];
  const lockedCount = rows.filter((item) => item.locked).length;

  async function toggleLock(userId: string, locked: boolean) {
    const token = getAccessToken();
    if (!token) return;
    setBusy(userId);
    try {
      await comviaFetch(`/admin/users/${userId}/lock`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ locked }),
      });
      void refetch();
    } catch (e) {
      alert(e instanceof ComviaApiError ? e.message : "Lỗi");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminRoleGate>
      {loading ? <PageLoading /> : null}
      {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}
      {data ? (
        <div>
          <PageHeader
            title="Users"
            description="Danh sách user nội bộ theo `GET /admin/users`, hỗ trợ khóa hoặc mở khóa đăng nhập."
            actions={
              <Button variant="outline" size="sm" onClick={() => void refetch()} icon={<HiOutlineUsers className="size-4" />}>
                Làm mới
              </Button>
            }
          />
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <Card className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tổng users</p>
              <p className="text-3xl font-semibold text-foreground">{rows.length}</p>
            </Card>
            <Card className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Đang bị khóa</p>
              <p className="text-3xl font-semibold text-foreground">{lockedCount}</p>
            </Card>
            <Card className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Đang hoạt động</p>
              <p className="text-3xl font-semibold text-foreground">{rows.length - lockedCount}</p>
            </Card>
          </div>
          <SimpleTable
            rows={rows}
            getRowKey={(r) => r.id}
            columns={[
              { key: "e", header: "Email", cell: (r) => r.email ?? "—" },
              { key: "f", header: "Tên", cell: (r) => r.fullName ?? "—" },
              {
                key: "role",
                header: "Role",
                cell: (r) => (r.role ? <EntityStatusBadge value={r.role} /> : "—"),
              },
              {
                key: "st",
                header: "Trạng thái",
                cell: (r) => (r.status ? <EntityStatusBadge value={r.status} /> : "—"),
              },
              {
                key: "lk",
                header: "Khóa",
                cell: (r) => (r.locked ? <EntityStatusBadge value="LOCKED" /> : <EntityStatusBadge value="ACTIVE" />),
              },
              {
                key: "c",
                header: "Ngày tạo",
                cell: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"),
              },
              {
                key: "a",
                header: "",
                cell: (r) => (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy === r.id}
                    onClick={() => void toggleLock(r.id, !r.locked)}
                    icon={r.locked ? <HiLockOpen className="size-4" /> : <HiLockClosed className="size-4" />}
                  >
                    {r.locked ? "Unlock" : "Lock"}
                  </Button>
                ),
              },
            ]}
          />
        </div>
      ) : null}
    </AdminRoleGate>
  );
}
