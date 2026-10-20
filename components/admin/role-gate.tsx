"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageForbidden, PageLoading } from "@/components/app/page-state";
import { getAccessToken, getStoredUser, postLoginPathForRole, type StoredUser } from "@/lib/auth";

export function RoleGate({
  children,
  allowRoles,
}: {
  children: React.ReactNode;
  allowRoles: string[];
}) {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    const storedUser = getStoredUser();

    if (!token || !storedUser) {
      router.replace("/auth/login");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMounted(true);
      return;
    }

    setUser(storedUser);
    setMounted(true);
  }, [router]);

  if (!mounted) return <PageLoading message="Đang kiểm tra quyền…" />;

  const role = (user?.role ?? "").toUpperCase();
  const ok = allowRoles.map((r) => r.toUpperCase()).includes(role);

  if (!user) return <PageLoading message="Đang chuyển về đăng nhập…" />;
  if (!ok) {
    return (
      <PageForbidden
        message="Bạn cần đăng nhập bằng tài khoản có quyền phù hợp."
        backHref={postLoginPathForRole(user?.role)}
      />
    );
  }

  return <>{children}</>;
}

export function AdminRoleGate({ children }: { children: React.ReactNode }) {
  return <RoleGate allowRoles={["ADMIN"]}>{children}</RoleGate>;
}

/** Khu `/staff/*` theo `FRONTEND_SITEMAP_ADMIN_STAFF.mdc` — duyệt template chỉ STAFF. */
export function StaffRoleGate({ children }: { children: React.ReactNode }) {
  return <RoleGate allowRoles={["STAFF"]}>{children}</RoleGate>;
}
