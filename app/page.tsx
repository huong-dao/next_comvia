"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getStoredUser, postLoginPathForRole } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      router.replace(postLoginPathForRole(getStoredUser()?.role));
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
