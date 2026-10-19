"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiBars3BottomLeft,
  HiOutlineBuildingOffice2,
  HiOutlineChatBubbleLeftRight,
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineCreditCard,
  HiOutlineDocumentText,
  HiOutlineMegaphone,
  HiOutlineHome,
  HiOutlineKey,
  HiOutlineRectangleStack,
  HiOutlineShoppingCart,
  HiOutlineUserGroup,
  HiOutlineUsers,
} from "react-icons/hi2";
import { cn } from "@/lib/cn";
import { APP_PATHS, workspacePath } from "@/lib/paths";
import { useActiveWorkspace } from "@/lib/use-active-workspace";
import { resolveWorkspaceIdFromPath } from "@/lib/workspace-session";
import { SidebarUserCard } from "@/components/layout/sidebar-user-card";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import Image from "next/image";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getStoredUser } from "@/lib/auth";

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
  // {
  //   label: "Zalo OA",
  //   icon: HiOutlineDocumentText,
  //   href: (w) => workspacePath(w, "oa"),
  //   isActive: (p, w) => p.startsWith(workspacePath(w, "oa")),
  // },
  // {
  //   label: "Thống kê",
  //   icon: HiOutlineChartBar,
  //   href: (w) => workspacePath(w, "analytics"),
  //   isActive: (p, w) => p.startsWith(workspacePath(w, "analytics")),
  // },
  // {
  //   label: "Mẫu tin nhắn",
  //   icon: HiOutlineRectangleGroup,
  //   href: (w) => workspacePath(w, "templates"),
  //   isActive: (p, w) => p.startsWith(workspacePath(w, "templates")),
  // },
  {
    label: "Chiến dịch",
    icon: HiOutlineMegaphone,
    href: (w) => workspacePath(w, "campaigns"),
    isActive: (p, w) => p.startsWith(workspacePath(w, "campaigns")),
  },
  {
    label: "Thành viên",
    icon: HiOutlineUserGroup,
    href: (w) => workspacePath(w, "members"),
    isActive: (p, w) => p.startsWith(workspacePath(w, "members")),
  },
  {
    label: "Lịch sử hoạt động",
    icon: HiOutlineClipboardDocumentList,
    href: (w) => workspacePath(w, "activity-history"),
    isActive: (p, w) => p.startsWith(workspacePath(w, "activity-history")),
  },
  // {
  //   label: "Ví tiền",
  //   icon: HiOutlineCreditCard,
  //   href: (w) => workspacePath(w, "wallet"),
  //   isActive: (p, w) =>
  //     p.startsWith(workspacePath(w, "wallet")) || p.startsWith(workspacePath(w, "topup")),
  // },
  {
    label: "API Keys",
    icon: HiOutlineKey,
    href: (w) => workspacePath(w, "api-keys"),
    isActive: (p, w) => p.startsWith(workspacePath(w, "api-keys")),
  },
  // {
  //   label: "Cài đặt",
  //   icon: HiOutlineCog6Tooth,
  //   href: () => APP_PATHS.settingsSecurity,
  //   isActive: (p) => p.startsWith("/app/settings"),
  //   appLevel: true,
  // },
];

const adminItems: Array<{
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { label: "NgÆ°á»i dÃ¹ng", href: "/admin/users", icon: HiOutlineUsers },
  { label: "Workspaces", href: "/admin/workspaces", icon: HiOutlineRectangleStack },
  { label: "Zalo OAs", href: "/admin/oa-connections", icon: HiOutlineBuildingOffice2 },
  { label: "ZBS Templates", href: "/admin/templates", icon: HiOutlineDocumentText },
  { label: "TÃ i khoáº£n cÃ´ng ty", href: "/admin/money-accounts", icon: HiOutlineCreditCard },
  { label: "ÄÆ¡n hÃ ng", href: "/admin/orders", icon: HiOutlineShoppingCart },
  { label: "HÃ³a Ä‘Æ¡n", href: "/admin/invoices", icon: HiOutlineDocumentText },
  { label: "Lá»‹ch sá»­ hoáº¡t Ä‘á»™ng", href: "/admin/audit-logs", icon: HiOutlineClipboardDocumentList },
  { label: "Cáº¥u hÃ¬nh chung", href: "/admin/config", icon: HiOutlineCog6Tooth },
];

export function WorkspaceSidebar({
  collapsed = false,
  onToggleCollapsed,
}: {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const pathname = usePathname();
  const { activeWorkspaceId } = useActiveWorkspace();
  const workspaceFromUrl = resolveWorkspaceIdFromPath(pathname);
  const currentWorkspaceId = workspaceFromUrl || activeWorkspaceId;
  const isCompact = collapsed;
  const isAdmin = String(getStoredUser()?.role ?? "").toUpperCase() === "ADMIN";
  const [adminOpen, setAdminOpen] = useState(pathname.startsWith("/admin"));

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col rounded-2xl border border-border/70 bg-linear-to-b from-card/70 to-card/20 shadow-[var(--shadow-soft)] transition-all duration-200",
        isCompact ? "w-[84px] p-3" : "w-[280px] p-5",
      )}
    >
      <div className={cn("mb-4", isCompact ? "flex justify-center" : "")}>
        {!isCompact ? (
          <div className="flex items-center justify-between gap-2">
            <div>
              <Image
                src="/images/comvia_light_logo.png"
                alt="COMVIA"
                className="cv-light-logo h-[46px] block dark:hidden"
              />
              <Image
                src="/images/comvia_dark_logo.png"
                alt="COMVIA"
                className="cv-dark-logo h-[46px] hidden dark:block"
              />
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

      <div className="flex flex-1 flex-col">
        <WorkspaceSwitcher
          className="mb-6"
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

        {isAdmin ? (
          <div className="mt-auto pt-6">
            <div className="border-t border-border/70 pt-3">
              <button
                type="button"
                onClick={() => setAdminOpen((open) => !open)}
                className={cn(
                  "flex w-full items-center rounded-lg py-2 text-sm font-semibold text-muted-foreground transition hover:bg-surface-muted/70 hover:text-foreground",
                  isCompact ? "justify-center px-2" : "gap-3 px-4",
                  pathname.startsWith("/admin") &&
                    "bg-surface-muted text-secondary shadow-[inset_3px_0_0_0_var(--color-primary)]",
                )}
                title={isCompact ? "Quáº£n trá»‹" : undefined}
                aria-expanded={adminOpen}
              >
                <HiOutlineCog6Tooth className="size-5 shrink-0" />
                {!isCompact ? (
                  <>
                    <span className="flex-1 text-left">Quáº£n trá»‹</span>
                    <span className="text-xs">{adminOpen ? "âˆ’" : "+"}</span>
                  </>
                ) : null}
              </button>

              {adminOpen && !isCompact ? (
                <div className="mt-1 space-y-1 border-l border-border/70 pl-3">
                  {adminItems.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href || pathname.startsWith(item.href + "/");

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-surface-muted/70 hover:text-foreground",
                          active && "bg-surface-muted text-secondary",
                        )}
                      >
                        <Icon className="size-4 shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      <ThemeToggle variant="switch" className="mb-3 self-center" />
      <SidebarUserCard compact={isCompact} />
    </aside>
  );
}
