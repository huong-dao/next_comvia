"use client";

import { useCallback, useState } from "react";
import { HiOutlineNoSymbol, HiOutlineRectangleStack } from "react-icons/hi2";
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

type WsRow = {
  id: string;
  name?: string;
  slug?: string;
  ownerUserId?: string;
  status?: string;
  createdAt?: string;
};

export default function AdminWorkspacesPage() {
  const fetcher = useCallback((token: string) => comviaFetch<WsRow[]>("/admin/workspaces", { token }), []);
  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);
  const [busy, setBusy] = useState<string | null>(null);
  const rows = data ?? [];
  const activeCount = rows.filter((item) => (item.status ?? "").toUpperCase() === "ACTIVE").length;

  async function disable(wsId: string) {
    if (!confirm("Disable workspace này?")) return;
    const token = getAccessToken();
    if (!token) return;
    setBusy(wsId);
    try {
      await comviaFetch(`/admin/workspaces/${wsId}/disable`, { method: "PATCH", token });
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
            title="Workspaces"
            description="Danh sách workspace toàn hệ thống theo `GET /admin/workspaces`, hỗ trợ disable nhanh."
            actions={
              <Button variant="outline" size="sm" onClick={() => void refetch()} icon={<HiOutlineRectangleStack className="size-4" />}>
                Làm mới
              </Button>
            }
          />
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <Card className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tổng workspaces</p>
              <p className="text-3xl font-semibold text-foreground">{rows.length}</p>
            </Card>
            <Card className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Đang active</p>
              <p className="text-3xl font-semibold text-foreground">{activeCount}</p>
            </Card>
            <Card className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Khác active</p>
              <p className="text-3xl font-semibold text-foreground">{rows.length - activeCount}</p>
            </Card>
          </div>
          <SimpleTable
            rows={rows}
            getRowKey={(r) => r.id}
            columns={[
              { key: "n", header: "Tên", cell: (r) => r.name ?? "—" },
              { key: "s", header: "Slug", cell: (r) => r.slug ?? "—" },
              { key: "o", header: "Owner", cell: (r) => r.ownerUserId ?? "—" },
              {
                key: "st",
                header: "Trạng thái",
                cell: (r) => (r.status ? <EntityStatusBadge value={r.status} /> : "—"),
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
                    onClick={() => void disable(r.id)}
                    icon={<HiOutlineNoSymbol className="size-4" />}
                  >
                    Disable
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
