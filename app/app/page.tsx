"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getStoredUser } from "@/lib/auth";
import { resolvePostLoginPath } from "@/lib/post-login-redirect";

export default function AppIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/auth/login");
      return;
    }
    void resolvePostLoginPath(getStoredUser()?.role, token).then((path) => router.replace(path));
  }, [router]);

  return (
    <main className="grid min-h-[40vh] place-items-center text-muted-foreground">
      <p className="text-sm">Đang chuyển hướng…</p>
    </main>
  );
}
