"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiBars3BottomLeft,
  HiOutlineChartBar,
  HiOutlineChatBubbleLeftRight,
  HiOutlineCog6Tooth,
  HiOutlineCreditCard,
  HiOutlineDocumentText,
  HiOutlineHome,
  HiOutlineKey,
  HiOutlineRectangleGroup,
  HiOutlineUserGroup,
} from "react-icons/hi2";
import { cn } from "@/lib/cn";
import { APP_PATHS, workspacePath } from "@/lib/paths";
import { SidebarUserCard } from "@/components/layout/sidebar-user-card";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";

type NavItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: (workspaceId: string) => string;
  isActive: (pathname: string, workspaceId: string) => boolean;
  /** Route không nằm dưới /app/w/[id] (vd Cài đặt app). */
  appLevel?: boolean;
};

/** Cùng thứ tự & nhãn như layout ban đầu; href map sang route thật trong app. */
const navItems: NavItem[] = [
  {
    label: "Tổng quan",
    icon: HiOutlineHome,
    href: (w) => workspacePath(w, "dashboard"),
    isActive: (p, w) => p === workspacePath(w, "dashboard"),
  },
  {
    label: "Gửi tin",
    icon: HiOutlineChatBubbleLeftRight,
    href: (w) => workspacePath(w, "messages", "send-single"),
    isActive: (p, w) => p.startsWith(workspacePath(w, "messages")),
  },
  {
    label: "Zalo OA",
    icon: HiOutlineDocumentText,
    href: (w) => workspacePath(w, "oa"),
    isActive: (p, w) => p.startsWith(workspacePath(w, "oa")),
  },
  // {
  //   label: "Thống kê",
  //   icon: HiOutlineChartBar,
  //   href: (w) => workspacePath(w, "analytics"),
  //   isActive: (p, w) => p.startsWith(workspacePath(w, "analytics")),
  // },
  {
    label: "Mẫu tin nhắn",
    icon: HiOutlineRectangleGroup,
    href: (w) => workspacePath(w, "templates"),
    isActive: (p, w) => p.startsWith(workspacePath(w, "templates")),
  },
  {
    label: "Thành viên",
    icon: HiOutlineUserGroup,
    href: (w) => workspacePath(w, "members"),
    isActive: (p, w) => p.startsWith(workspacePath(w, "members")),
  },
  {
    label: "Ví tiền",
    icon: HiOutlineCreditCard,
    href: (w) => workspacePath(w, "wallet"),
    isActive: (p, w) =>
      p.startsWith(workspacePath(w, "wallet")) || p.startsWith(workspacePath(w, "topup")),
  },
  {
    label: "API Keys",
    icon: HiOutlineKey,
    href: (w) => workspacePath(w, "api-keys"),
    isActive: (p, w) => p.startsWith(workspacePath(w, "api-keys")),
  },
  {
    label: "Cài đặt",
    icon: HiOutlineCog6Tooth,
    href: () => APP_PATHS.settingsSecurity,
    isActive: (p) => p.startsWith("/app/settings"),
    appLevel: true,
  },
];

export function WorkspaceSidebar({
  collapsed = false,
  onToggleCollapsed,
}: {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const pathname = usePathname();
  const currentWorkspaceId = pathname.match(/\/app\/w\/([^/]+)/)?.[1] ?? "";
  const isCompact = collapsed;

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col rounded-2xl border border-border/70 bg-linear-to-b from-card/70 to-card/20 shadow-[var(--shadow-soft)] transition-all duration-200",
        isCompact ? "w-[84px] p-3" : "w-[280px] p-5",
      )}
    >
      <div className={cn("mb-4", isCompact ? "flex justify-center" : "")}>
        {!isCompact ? (
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-2xl font-bold tracking-tight text-secondary/90">Comvia.cloud</p>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">
                Business Messaging
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="inline-flex size-8 items-center justify-center rounded-lg text-slate-700 transition hover:bg-surface-muted dark:text-white dark:hover:bg-white/10"
              aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
            >
              <HiBars3BottomLeft className="size-5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="inline-flex size-10 items-center justify-center rounded-lg text-slate-700 transition hover:bg-surface-muted dark:text-white dark:hover:bg-white/10"
            aria-label="Mở rộng sidebar"
          >
            <HiBars3BottomLeft className="size-5" />
          </button>
        )}
      </div>

      <div className="flex-1">
        <WorkspaceSwitcher
          className="mb-6"
          activeWorkspaceId={currentWorkspaceId}
          compact={isCompact}
        />

        <nav className="space-y-1">
          {navItems.map((item) => {
            const href = item.appLevel
              ? item.href("")
              : currentWorkspaceId
                ? item.href(currentWorkspaceId)
                : APP_PATHS.workspaces;
            const active = item.appLevel
              ? item.isActive(pathname, currentWorkspaceId)
              : currentWorkspaceId
                ? item.isActive(pathname, currentWorkspaceId)
                : false;
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={href}
                className={cn(
                  "flex items-center rounded-lg border-transparent py-2 text-sm font-semibold text-muted-foreground transition",
                  isCompact ? "justify-center px-2" : "gap-3 px-4",
                  active
                    ? "border-border/70 bg-surface-muted text-secondary shadow-[inset_3px_0_0_0_var(--color-primary)]"
                    : "hover:border-border/60 hover:bg-surface-muted/70 hover:text-foreground",
                  !item.appLevel && !currentWorkspaceId && "opacity-80",
                )}
                title={isCompact ? item.label : undefined}
              >
                <Icon className="size-[20px] shrink-0" />
                {!isCompact ? item.label : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <SidebarUserCard compact={isCompact} />
    </aside>
  );
}
