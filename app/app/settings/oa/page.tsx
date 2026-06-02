"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  consumeOaOAuthWorkspace,
  parseOaOAuthCallback,
} from "@/lib/oa-oauth";
import { APP_PATHS, workspacePath } from "@/lib/paths";

function OaOAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [missingWorkspace, setMissingWorkspace] = useState(false);

  useEffect(() => {
    const result = parseOaOAuthCallback(searchParams);
    if (!result) {
      router.replace(APP_PATHS.workspaces);
      return;
    }

    const workspaceId = result.workspaceId ?? consumeOaOAuthWorkspace();
    if (!workspaceId) {
      setMissingWorkspace(true);
      return;
    }

    const target = `${workspacePath(workspaceId, "oa")}?oa_oauth=${result.status}`;
    router.replace(target);
  }, [router, searchParams]);

  if (missingWorkspace) {
    return (
      <div>
        <PageHeader
          title="Kết nối Zalo OA"
          description="Không xác định được workspace sau OAuth."
        />
        <Card className="max-w-lg space-y-4">
          <p className="text-sm text-muted-foreground">
            Vui lòng mở lại trang Zalo OA trong workspace bạn vừa kết nối, hoặc thử kết nối lại từ menu Chi tiết workspace.
          </p>
          <Button asChild>
            <Link href={APP_PATHS.workspaces}>Về danh sách workspace</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return <PageLoading />;
}

export default function OaOAuthCallbackPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <OaOAuthCallbackContent />
    </Suspense>
  );
}
