"use client";

import { useCallback } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { Card } from "@/components/ui/card";
import { comviaFetch } from "@/lib/comviaFetch";
import { useComviaQuery } from "@/lib/use-comvia-query";
import { StatusBadge } from "@/components/ui/status-badge";

type MeResponse = {
  id: string;
  email?: string;
  fullName?: string;
  role?: string;
  status?: string;
  createdAt?: string;
};

export default function ProfilePage() {
  const fetcher = useCallback((token: string) => comviaFetch<MeResponse>("/auth/me", { token }), []);
  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);

  if (loading) return <PageLoading />;
  if (error && !data) return <PageError message={error} onRetry={() => void refetch()} />;

  const user = data;

  return (
    <div>
      <PageHeader
        eyebrow="Tài khoản"
        title="Hồ sơ"
        description="Thông tin tài khoản đăng nhập (theo API GET /auth/me)."
      />

      <Card className="max-w-xl space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Họ tên</p>
            <p className="mt-1 text-sm text-foreground">{user?.fullName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</p>
            <p className="mt-1 text-sm text-foreground">{user?.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vai trò hệ thống</p>
            <p className="mt-1 text-sm text-foreground">{user?.role ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trạng thái</p>
            <StatusBadge tone={user?.status === "ACTIVE" ? "active" : "error"}>{user?.status ?? "—"}</StatusBadge>
          </div>
          {user?.createdAt ? (
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ngày tạo</p>
              <p className="mt-1 text-sm text-foreground">{new Date(user.createdAt).toLocaleString()}</p>
            </div>
          ) : null}
        </div>
        <p className="border-t border-border/60 pt-4 text-xs text-muted-foreground">
          Cập nhật hồ sơ qua API riêng sẽ bổ sung khi backend có endpoint PATCH phù hợp tài liệu.
        </p>
      </Card>
    </div>
  );
}
