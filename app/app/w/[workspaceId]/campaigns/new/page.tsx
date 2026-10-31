"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { HiArrowLeft } from "react-icons/hi2";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { TemplatePreview, type TemplateMessageType } from "@/components/template/preview/template-preview";
import { ComviaApiError, comviaFetch, resolvePublicAssetUrl } from "@/lib/comviaFetch";
import { formatComviaError } from "@/lib/api-message";
import { getAccessToken } from "@/lib/auth";
import { workspacePath } from "@/lib/paths";
import { type TemplateCtaButton } from "@/lib/template-cta";
import { useComviaQuery } from "@/lib/use-comvia-query";

type TemplateOption = {
  id: string;
  type?: string;
  name?: string;
  code?: string;
  title?: string | null;
  content?: string | null;
  secondaryContent?: string | null;
  status?: string;
  otpExpiryMinutes?: number | null;
  placeholdersJson?: Record<string, string>;
  placeholder_labels?: Record<string, string> | null;
  ctaButtons?: TemplateCtaButton[];
};

type OaPreviewAsset = { logoLightUrl?: string | null };

function toPreviewType(type?: string): TemplateMessageType {
  if (type?.toUpperCase() === "TEXT") return "van_ban";
  if (type?.toUpperCase() === "OTP") return "otp";
  return "bang";
}

type CreatedCampaign = { id: string };

export default function CampaignNewPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const router = useRouter();
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetcher = useCallback(
    (token: string) => comviaFetch<TemplateOption[]>(`/workspaces/${workspaceId}/templates`, { token }),
    [workspaceId],
  );

  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId), fetcher);

  const oaFetcher = useCallback(
    async (token: string): Promise<OaPreviewAsset | null> => {
      try {
        return await comviaFetch<OaPreviewAsset>(`/workspaces/${workspaceId}/oa`, { token });
      } catch (fetchError) {
        if (fetchError instanceof ComviaApiError && fetchError.statusCode === 404) return null;
        throw fetchError;
      }
    },
    [workspaceId],
  );
  const { data: oa } = useComviaQuery(Boolean(workspaceId), oaFetcher);

  const approvedTemplates = useMemo(
    () => (data ?? []).filter((t) => (t.status ?? "").toUpperCase() === "APPROVED"),
    [data],
  );

  const selectedTemplate = approvedTemplates.find((t) => t.id === templateId);
  const previewPlaceholders = useMemo(
    () => selectedTemplate?.placeholdersJson ?? {},
    [selectedTemplate],
  );

  async function createCampaign() {
    const token = getAccessToken();
    if (!token) return;
    if (!name.trim()) {
      setMsg("Nhập tên chiến dịch.");
      return;
    }
    if (!templateId) {
      setMsg("Chọn mẫu tin đã duyệt.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const created = await comviaFetch<CreatedCampaign>(`/workspaces/${workspaceId}/campaigns`, {
        method: "POST",
        token,
        body: JSON.stringify({ name: name.trim(), templateId }),
      });
      router.push(workspacePath(workspaceId, "campaigns", created.id));
    } catch (e) {
      setMsg(formatComviaError(e, "Không tạo được chiến dịch."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <PageLoading />;
  if (error && !data) return <PageError message={error} onRetry={() => void refetch()} />;

  return (
    <div>
      <PageHeader
        title="Tạo chiến dịch"
        description="Chọn mẫu tin đã duyệt. Sau khi tạo, tải file CSV mẫu và upload danh sách người nhận."
        actions={
          <Button icon={<HiArrowLeft className="size-4" />} variant="outline" asChild size="sm">
            <Link href={workspacePath(workspaceId, "campaigns")}>Danh sách chiến dịch</Link>
          </Button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Tên chiến dịch</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Marketing mùa thu" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Mẫu tin (đã duyệt)</label>
            {approvedTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Chưa có mẫu APPROVED.{" "}
                <Link className="text-primary underline" href={workspacePath(workspaceId, "templates")}>
                  Quản lý mẫu tin
                </Link>
              </p>
            ) : (
              <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                <option value="">— Chọn mẫu —</option>
                {approvedTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name ?? t.code ?? t.id}
                    {t.code ? ` (${t.code})` : ""}
                  </option>
                ))}
              </Select>
            )}
          </div>
          <Button type="button" disabled={busy || approvedTemplates.length === 0} onClick={() => void createCampaign()}>
            Tạo chiến dịch
          </Button>
          {msg ? <p className="text-sm text-danger">{msg}</p> : null}

          <div className="border-t border-border pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Các bước tiếp theo
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Chọn mẫu tin đã duyệt và bấm &quot;Tạo chiến dịch&quot;.</li>
              <li>Ở trang chi tiết chiến dịch vừa tạo, bấm &quot;Tải CSV mẫu&quot; để tải file danh sách người nhận.</li>
              <li>Điền số điện thoại và nội dung biến cho từng người nhận vào file CSV đã tải.</li>
              <li>Quay lại trang chi tiết, bấm &quot;Upload CSV&quot; để tải file đã điền lên.</li>
              <li>Bấm &quot;Thực hiện gửi (Execute)&quot; để bắt đầu gửi chiến dịch.</li>
            </ol>
          </div>
        </Card>

        <Card className="flex min-w-0 flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Xem trước</p>
          {selectedTemplate ? (
            <TemplatePreview
              type={toPreviewType(selectedTemplate.type)}
              title={selectedTemplate.title ?? ""}
              content={selectedTemplate.content ?? ""}
              placeholders={previewPlaceholders}
              placeholderLabels={selectedTemplate.placeholder_labels ?? undefined}
              secondaryContent={selectedTemplate.secondaryContent ?? ""}
              minutes={String(selectedTemplate.otpExpiryMinutes ?? 5)}
              logoUrl={resolvePublicAssetUrl(oa?.logoLightUrl)}
              ctaButtons={(selectedTemplate.ctaButtons ?? []).map((b) => ({
                ...b,
                label: b.label ?? "",
                target: b.target ?? "",
              }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Chọn mẫu tin để xem trước nội dung tin nhắn.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
