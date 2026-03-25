"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiArrowRightOnRectangle, HiOutlineShieldCheck } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { clearAuthSession, getStoredUser, type StoredUser } from "@/lib/auth";
import { APP_PATHS } from "@/lib/paths";

function initials(fullName?: string, email?: string) {
  const s = (fullName ?? email ?? "?").trim();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

export function SidebarUserCard({
  compact = false,
  /** Không link sang `/app/profile` — dùng trong shell admin/staff (`FRONTEND_SITEMAP_ADMIN_STAFF.mdc`). */
  variant = "tenant",
}: {
  compact?: boolean;
  variant?: "tenant" | "internal";
}) {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getStoredUser());
  }, []);

  function logout() {
    clearAuthSession();
    router.replace("/auth/login");
  }

  const name = user?.fullName ?? user?.email ?? "Tài khoản";
  const label = initials(user?.fullName, user?.email);

  if (compact) {
    return (
      <div className="mt-auto rounded-xl bg-card/80 p-2 shadow-(--shadow-soft)">
        {variant === "tenant" ? (
          <Link
            href={APP_PATHS.profile}
            className="flex items-center justify-center rounded-lg p-1 transition hover:bg-surface-muted/60"
            title={name}
          >
            <div className="inline-flex size-10 items-center justify-center overflow-hidden rounded-full bg-surface-muted text-sm font-semibold text-foreground">
              {label}
            </div>
          </Link>
        ) : (
          <div className="flex items-center justify-center rounded-lg p-1" title={name}>
            <div className="inline-flex size-10 items-center justify-center overflow-hidden rounded-full bg-surface-muted text-sm font-semibold text-foreground">
              {label}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-auto rounded-2xl border-border/70 bg-card/80 p-2 shadow-(--shadow-soft)">
      {variant === "tenant" ? (
        <Link
          href={APP_PATHS.profile}
          className="mb-0 flex items-center gap-3 rounded-xl p-1 transition hover:bg-surface-muted/60"
        >
          <div className="inline-flex size-11 items-center justify-center overflow-hidden rounded-full bg-blue-200 text-md font-semibold text-black">
            {label}
          </div>
          <div className="min-w-0">
            <p className="truncate text-md font-semibold leading-none text-foreground">{name}</p>
            <p className="mt-1 text-xs font-semibold leading-none uppercase tracking-[0.14em] text-primary">
              {user?.role ?? "USER"}
            </p>
          </div>
        </Link>
      ) : (
        <div className="mb-1 flex items-center gap-3 rounded-xl p-1">
          <div className="inline-flex size-11 items-center justify-center overflow-hidden rounded-full bg-blue-200 text-md font-semibold text-black">
            {label}
          </div>
          <div className="min-w-0">
            <p className="truncate text-md font-semibold leading-none text-foreground">{name}</p>
            <p className="mt-1 text-xs font-semibold leading-none uppercase tracking-[0.14em] text-primary">
              {user?.role ?? "USER"}
            </p>
          </div>
        </div>
      )}

      {variant === "tenant" ? (
        <Link
          href={APP_PATHS.settingsSecurity}
          className="mb-0 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <HiOutlineShieldCheck className="size-4 shrink-0" />
          Bảo mật
        </Link>
      ) : null}

      <div>
        <Button
          type="button"
          variant="ghost"
          icon={<HiArrowRightOnRectangle className="size-4" />}
          className="h-[26px] cursor-pointer hover:text-foreground justify-start pl-2 whitespace-nowrap bg-transparent hover:bg-transparent"
          onClick={logout}
        >
          Đăng xuất
        </Button>
      </div>
    </div>
  );
}
