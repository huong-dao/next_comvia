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
import { comviaFetch } from "@/lib/comviaFetch";
import { formatComviaError } from "@/lib/api-message";
import { getAccessToken } from "@/lib/auth";
import { workspacePath } from "@/lib/paths";
import { useComviaQuery } from "@/lib/use-comvia-query";

type TemplateOption = {
  id: string;
  name?: string;
  code?: string;
  status?: string;
};

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

  const approvedTemplates = useMemo(
    () => (data ?? []).filter((t) => (t.status ?? "").toUpperCase() === "APPROVED"),
    [data],
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

      <Card className="max-w-xl space-y-4">
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
      </Card>
    </div>
  );
}
