"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { PageLoading } from "@/components/app/page-state";
import { APP_PATHS } from "@/lib/paths";

/** Alias doc `.../settings/oa` → `/app/settings/oa` (giữ query OAuth). */
function LegacyOaRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const q = searchParams.toString();
    router.replace(q ? `${APP_PATHS.settingsOa}?${q}` : APP_PATHS.settingsOa);
  }, [router, searchParams]);

  return <PageLoading />;
}

export default function LegacySettingsOaPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <LegacyOaRedirect />
    </Suspense>
  );
}
