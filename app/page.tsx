"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getStoredUser } from "@/lib/auth";
import { resolvePostLoginPath } from "@/lib/post-login-redirect";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      void resolvePostLoginPath(getStoredUser()?.role, token).then((path) => router.replace(path));
      return;
    }

    router.replace("/auth/login");
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-background text-muted-foreground">
      <p className="text-sm">Đang chuyển hướng...</p>
    </main>
  );
}
