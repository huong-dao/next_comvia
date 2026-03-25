"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAccessToken, getStoredUser, postLoginPathForRole } from "@/lib/auth";

/**
 * Tenant `/app/*` is for workspace Owner/Member. ADMIN/STAFF belong in `/admin` / `/staff`
 * (`FRONTEND_SITEMAP_UX.mdc` §1).
 */
export function TenantAppRoleGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!getAccessToken()) return;
    const home = postLoginPathForRole(getStoredUser()?.role);
    if (home === "/app/workspaces") return;
    const inTenantApp = pathname === "/app" || pathname.startsWith("/app/");
    if (inTenantApp) {
      router.replace(home);
    }
  }, [pathname, router]);

  return <>{children}</>;
}
