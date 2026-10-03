"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageLoading } from "@/components/app/page-state";
import { OaInfoBox } from "@/components/oa/oa-info-box";
import {
  oaOAuthBannerMessage,
  parseOaOAuthCallback,
  parseOaOAuthFlash,
  type OaOAuthCallbackResult,
} from "@/lib/oa-oauth";

function OaPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = params.workspaceId as string;

  // Banner kết quả OAuth sau khi Zalo redirect về (?status=success|error).
  const [msg, setMsg] = useState<string | null>(null);
  const [msgError, setMsgError] = useState(false);

  useEffect(() => {
    const flash = parseOaOAuthFlash(searchParams);
    const legacy = parseOaOAuthCallback(searchParams);
    const result: OaOAuthCallbackResult | null =
      legacy ?? (flash ? { status: flash, workspaceId, connected: flash === "success" } : null);

    if (!result) return;

    // Đọc kết quả OAuth một lần từ query URL rồi dọn query (external → React state).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMsg(oaOAuthBannerMessage(result));
    setMsgError(result.status !== "success");
    // Dọn query; OaInfoBox đọc trạng thái mới qua GET /oa (connection nhúng).
    router.replace(`/app/w/${workspaceId}/oa`);
  }, [searchParams, workspaceId, router]);

  return (
    <div>
      <PageHeader
        title="Official Account"
        description="Tạo thông tin OA nội bộ, kết nối Zalo qua OAuth (chỉ Owner), và quản lý ảnh/logo. Gửi tin ZNS chỉ khả dụng khi OA đã kết nối."
      />

      {msg ? (
        <p
          className={
            msgError ? "mb-4 text-sm text-danger" : "mb-4 text-sm text-success"
          }
        >
          {msg}
        </p>
      ) : null}

      <OaInfoBox className="max-w-xl" />
    </div>
  );
}

export default function OaPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <OaPageContent />
    </Suspense>
  );
}
