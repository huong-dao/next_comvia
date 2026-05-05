"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiBars3BottomLeft,
  HiOutlineBolt,
  HiOutlineChatBubbleLeftRight,
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineCreditCard,
  HiOutlineHome,
  HiOutlineRectangleStack,
  HiOutlineShoppingCart,
  HiOutlineUsers,
  HiOutlineWrenchScrewdriver,
} from "react-icons/hi2";
import { cn } from "@/lib/cn";
import { SidebarUserCard } from "@/components/layout/sidebar-user-card";
import Image from "next/image";

type InternalVariant = "admin" | "staff";

type NavItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
  match: (pathname: string) => boolean;
};

const adminNav: NavItem[] = [
  { label: "Tổng quan", icon: HiOutlineHome, href: "/admin", match: (p) => p === "/admin" },
  { label: "Người dùng", icon: HiOutlineUsers, href: "/admin/users", match: (p) => p.startsWith("/admin/users") },
  {
    label: "Workspaces",
    icon: HiOutlineRectangleStack,
    href: "/admin/workspaces",
    match: (p) => p.startsWith("/admin/workspaces"),
  },
  {
    label: "Tài khoản công ty",
    icon: HiOutlineCreditCard,
    href: "/admin/money-accounts",
    match: (p) => p.startsWith("/admin/money-accounts"),
  },
  {
    label: "Đơn hàng",
    icon: HiOutlineShoppingCart,
    href: "/admin/orders",
    match: (p) => p.startsWith("/admin/orders"),
  },
  {
    label: "Audit logs",
    icon: HiOutlineClipboardDocumentList,
    href: "/admin/audit-logs",
    match: (p) => p.startsWith("/admin/audit-logs"),
  },
  // {
  //   label: "QC — Agents",
  //   icon: HiOutlineCog6Tooth,
  //   href: "/admin/quick-chat/agents",
  //   match: (p) => p.startsWith("/admin/quick-chat/agents"),
  // },
  // {
  //   label: "QC — Tools",
  //   icon: HiOutlineWrenchScrewdriver,
  //   href: "/admin/quick-chat/tools",
  //   match: (p) => p.startsWith("/admin/quick-chat/tools"),
  // },
  // {
  //   label: "Internal Quick Chat",
  //   icon: HiOutlineChatBubbleLeftRight,
  //   href: "/admin/internal-quick-chat",
  //   match: (p) => p.startsWith("/admin/internal-quick-chat"),
  // },
  // {
  //   label: "Dev — Webhook nạp tiền",
  //   icon: HiOutlineCreditCard,
  //   href: "/admin/dev/payment-webhook",
  //   match: (p) => p.startsWith("/admin/dev/payment-webhook"),
  // },
];

const staffNav: NavItem[] = [
  { label: "Staff hub", icon: HiOutlineHome, href: "/staff", match: (p) => p === "/staff" },
  {
    label: "Duyệt template",
    icon: HiOutlineClipboardDocumentList,
    href: "/staff/templates-review/submitted",
    match: (p) => p.startsWith("/staff/templates-review"),
  },
  {
    label: "Internal Quick Chat",
    icon: HiOutlineBolt,
    href: "/staff/internal-quick-chat",
    match: (p) => p.startsWith("/staff/internal-quick-chat"),
  },
];

export function InternalSidebar({
  variant,
  collapsed = false,
  onToggleCollapsed,
}: {
  variant: InternalVariant;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const pathname = usePathname();
  const navItems = variant === "admin" ? adminNav : staffNav;
  const isCompact = collapsed;

  const contextTitle = variant === "admin" ? "Quản trị" : "Staff";
  const contextSubtitle = variant === "admin" ? "Admin backoffice" : "Nội bộ xử lý";

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col rounded-2xl border border-border/70 bg-linear-to-b from-card/70 to-card/20 shadow-(--shadow-soft) transition-all duration-200",
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

      <div className="flex-1">
        <div
          className={cn(
            "mb-6 rounded-xl border border-border/60 bg-surface-muted/40",
            isCompact ? "px-2 py-3 text-center" : "px-4 py-3",
          )}
        >
          {!isCompact ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{contextSubtitle}</p>
              <p className="mt-1 text-sm font-bold text-secondary">{contextTitle}</p>
            </>
          ) : (
            <span className="text-xs font-bold text-secondary" title={`${contextTitle} — ${contextSubtitle}`}>
              {variant === "admin" ? "A" : "S"}
            </span>
          )}
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg border-transparent py-2 text-sm font-semibold text-muted-foreground transition",
                  isCompact ? "justify-center px-2" : "gap-3 px-4",
                  active
                    ? "border-border/70 bg-surface-muted text-secondary shadow-[inset_3px_0_0_0_var(--color-primary)]"
                    : "hover:border-border/60 hover:bg-surface-muted/70 hover:text-foreground",
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

      <SidebarUserCard compact={isCompact} variant="internal" />
    </aside>
  );
}
