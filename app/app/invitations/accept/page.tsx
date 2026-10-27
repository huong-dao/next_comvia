"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageError, PageLoading } from "@/components/app/page-state";
import { getAccessToken } from "@/lib/auth";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { invitationAcceptPath } from "@/lib/post-auth-return";

type AcceptInvitationResponse = { ok: true; redirectPath: string };

function InvitationAcceptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId")?.trim() ?? "";
  const token = searchParams.get("token")?.trim() ?? "";
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(() => Boolean(getAccessToken()));

  const returnTo = workspaceId && token ? invitationAcceptPath(workspaceId, token) : null;
  const authHref = returnTo ? `/auth/login?returnTo=${encodeURIComponent(returnTo)}` : "/auth/login";
  const registerHref = returnTo ? `/auth/register?returnTo=${encodeURIComponent(returnTo)}` : "/auth/register";

  useEffect(() => {
    const accessToken = getAccessToken();
    if (!workspaceId || !token || !accessToken) {
      return;
    }

    let active = true;
    void comviaFetch<AcceptInvitationResponse>(`/workspaces/${workspaceId}/invitations/accept`, {
      method: "POST",
      token: accessToken,
      body: JSON.stringify({ token }),
    })
      .then((result) => {
        if (active) router.replace(result.redirectPath);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof ComviaApiError ? reason.message : "Không thể chấp nhận lời mời.");
      })
      .finally(() => {
        if (active) setAccepting(false);
      });

    return () => {
      active = false;
    };
  }, [router, token, workspaceId]);

  if (!workspaceId || !token) return <PageError message="Liên kết lời mời không hợp lệ." />;

  if (!getAccessToken()) {
    return (
      <Card className="mx-auto max-w-lg space-y-4">
        <h1 className="text-lg font-semibold">Chấp nhận lời mời workspace</h1>
        <p className="text-sm text-muted-foreground">Đăng nhập hoặc đăng ký đúng email đã nhận lời mời để tiếp tục.</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link href={authHref}>Đăng nhập</Link></Button>
          <Button asChild variant="outline"><Link href={registerHref}>Đăng ký</Link></Button>
        </div>
      </Card>
    );
  }

  if (accepting) return <PageLoading message="Đang chấp nhận lời mời…" />;
  return error ? <PageError message={error} /> : null;
}

export default function InvitationAcceptPage() {
  return (
    <Suspense fallback={<PageLoading message="Đang tải lời mời…" />}>
      <InvitationAcceptContent />
    </Suspense>
  );
}
