"use client";

import { useCallback } from "react";
import Link from "next/link";
import {
  HiOutlineBolt,
  HiOutlineChatBubbleLeftRight,
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineCreditCard,
  HiOutlineRectangleStack,
  HiOutlineUsers,
  HiOutlineWrenchScrewdriver,
} from "react-icons/hi2";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { comviaFetch } from "@/lib/comviaFetch";
import { useComviaQuery } from "@/lib/use-comvia-query";

type AuditRow = {
  id?: string;
  action?: string;
  resourceType?: string;
  createdAt?: string;
};

type HubData = {
  userCount: number;
  wsCount: number;
  recentLogs: AuditRow[];
};

const adminLinks = [
  {
    title: "Người dùng",
    description: "Danh sách người dùng, khóa hoặc mở khóa đăng nhập.",
    href: "/admin/users",
    icon: HiOutlineUsers,
  },
  {
    title: "Workspaces",
    description: "Theo dõi workspace và disable khi cần.",
    href: "/admin/workspaces",
    icon: HiOutlineRectangleStack,
  },
  {
    title: "Audit Logs",
    description: "Lọc log theo workspace, action và giới hạn bản ghi.",
    href: "/admin/audit-logs",
    icon: HiOutlineClipboardDocumentList,
  },
  // {
  //   title: "Quick Chat Agents",
  //   description: "Quản lý agent nội bộ dành cho quick chat admin.",
  //   href: "/admin/quick-chat/agents",
  //   icon: HiOutlineCog6Tooth,
  // },
  // {
  //   title: "Quick Chat Tools",
  //   description: "Tra cứu danh sách tool name và sao chép nhanh.",
  //   href: "/admin/quick-chat/tools",
  //   icon: HiOutlineWrenchScrewdriver,
  // },
  // {
  //   title: "Internal Quick Chat",
  //   description: "Playground nội bộ cho session, message và confirm action.",
  //   href: "/admin/internal-quick-chat",
  //   icon: HiOutlineChatBubbleLeftRight,
  // },
  // {
  //   title: "Dev Payment Webhook",
  //   description: "Form mock webhook nạp tiền cho dev/demo.",
  //   href: "/admin/dev/payment-webhook",
  //   icon: HiOutlineCreditCard,
  // },
  // {
  //   title: "Staff Review Queue",
  //   description: "Chức năng review template nội bộ nằm ở khu STAFF.",
  //   href: "/staff/templates-review/submitted",
  //   icon: HiOutlineBolt,
  // },
  {
    title: "Tài khoản công ty",
    description: "Quản lý tài khoản ngân hàng công ty.",
    href: "/admin/money-accounts",
    icon: HiOutlineCreditCard,
  },
] as const;

export default function AdminOverviewPage() {
  const fetcher = useCallback(async (token: string) => {
    const [users, workspaces, logs] = await Promise.all([
      comviaFetch<unknown[]>("/admin/users", { token }).catch(() => []),
      comviaFetch<unknown[]>("/admin/workspaces", { token }).catch(() => []),
      comviaFetch<AuditRow[]>("/admin/audit-logs?limit=5", { token }).catch(() => []),
    ]);
    return {
      userCount: Array.isArray(users) ? users.length : 0,
      wsCount: Array.isArray(workspaces) ? workspaces.length : 0,
      recentLogs: Array.isArray(logs) ? logs : [],
    } satisfies HubData;
  }, []);

  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);

  return (
    <AdminRoleGate>
      {loading ? <PageLoading /> : null}
      {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}
      {data ? (
        <div>
          <PageHeader
            title="Tổng quan quản lý nội bộ"
            description="Trung tâm vận hành nội bộ."
            // actions={
            //   <Button asChild icon={<HiOutlineChatBubbleLeftRight className="size-4" />}>
            //     <Link href="/admin/internal-quick-chat">Mở Internal Quick Chat</Link>
            //   </Button>
            // }
          />
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Người dùng</p>
              <p className="text-3xl font-semibold text-foreground">{data.userCount}</p>
              <p className="text-sm text-muted-foreground">Tổng số tài khoản nội bộ và người dùng hệ thống hiện có.</p>
              <Button variant="ghost" size="sm" asChild icon={<HiOutlineUsers className="size-4" />}>
                <Link href="/admin/users">Quản lý người dùng</Link>
              </Button>
            </Card>
            <Card className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspaces</p>
              <p className="text-3xl font-semibold text-foreground">{data.wsCount}</p>
              <p className="text-sm text-muted-foreground">Workspace đang được hệ thống quản lý và có thể can thiệp trạng thái.</p>
              <Button variant="ghost" size="sm" asChild icon={<HiOutlineRectangleStack className="size-4" />}>
                <Link href="/admin/workspaces">Quản lý workspaces</Link>
              </Button>
            </Card>
            <Card className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Recent Audit</p>
              <p className="text-3xl font-semibold text-foreground">{data.recentLogs.length}</p>
              <p className="text-sm text-muted-foreground">Số log gần nhất đang hiển thị để theo dõi hoạt động vận hành.</p>
              <Button variant="ghost" size="sm" asChild icon={<HiOutlineClipboardDocumentList className="size-4" />}>
                <Link href="/admin/audit-logs">Xem audit logs</Link>
              </Button>
            </Card>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {adminLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.href} className="space-y-4">
                  <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-surface-muted text-secondary">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild icon={<Icon className="size-4" />}>
                    <Link href={item.href}>Mở trang</Link>
                  </Button>
                </Card>
              );
            })}
          </div>

          <Card className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-foreground">Audit preview</p>
                {/* <p className="text-sm text-muted-foreground">5 log gần nhất từ `GET /admin/audit-logs?limit=5`.</p> */}
              </div>
              <Button variant="outline" size="sm" asChild icon={<HiOutlineClipboardDocumentList className="size-4" />}>
                <Link href="/admin/audit-logs">Xem tất cả</Link>
              </Button>
            </div>
            <div className="space-y-2">
              {data.recentLogs.length === 0 ? (
                <p className="rounded-xl border border-border/70 bg-surface-muted/40 px-4 py-6 text-sm text-muted-foreground">
                  Chưa có audit log để preview.
                </p>
              ) : (
                data.recentLogs.map((log, index) => (
                  <div key={log.id ?? index} className="rounded-xl border border-border/70 bg-surface-muted/30 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{log.action ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{log.resourceType ?? "Không rõ resource"}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      ) : null}
    </AdminRoleGate>
  );
}
