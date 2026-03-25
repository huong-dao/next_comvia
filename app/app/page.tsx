"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getStoredUser, postLoginPathForRole } from "@/lib/auth";

export default function AppIndexPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/auth/login");
      return;
    }
    router.replace(postLoginPathForRole(getStoredUser()?.role));
  }, [router]);

  return (
    <main className="grid min-h-[40vh] place-items-center text-muted-foreground">
      <p className="text-sm">Đang chuyển hướng…</p>
    </main>
  );
}
