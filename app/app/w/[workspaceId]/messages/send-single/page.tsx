"use client";

import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";
import { useComviaQuery } from "@/lib/use-comvia-query";
import { formatVND } from "@/lib/utils";
import { HiOutlinePaperAirplane } from "react-icons/hi2";

type TemplateRow = { id: string; name?: string; code?: string; status?: string; placeholdersJson?: Record<string, string> };
type OaStatus = { status?: string };
type WalletBalance = { balance?: string };

export default function SendSinglePage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const bundleFetcher = useCallback(
    async (token: string) => {
      const [templates, oa, wallet] = await Promise.all([
        comviaFetch<TemplateRow[]>(`/workspaces/${workspaceId}/templates`, { token }),
        comviaFetch<OaStatus>(`/workspaces/${workspaceId}/oa/status`, { token }),
        comviaFetch<WalletBalance>(`/workspaces/${workspaceId}/wallet/balance`, { token }),
      ]);
      return {
        templates: Array.isArray(templates) ? templates : [],
        oa,
        wallet,
      };
    },
    [workspaceId],
  );

  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId), bundleFetcher);

  const approved = useMemo(
    () => (data?.templates ?? []).filter((t) => (t.status ?? "").toUpperCase() === "APPROVED"),
    [data?.templates],
  );

  const [templateId, setTemplateId] = useState("");
  const [phone, setPhone] = useState("");
  const [dataJson, setDataJson] = useState("{}");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const selected = approved.find((t) => t.id === templateId);
  const keys = Object.keys(selected?.placeholdersJson ?? {});

  if (loading) return <PageLoading />;
  if (error && !data) return <PageError message={error} onRetry={() => void refetch()} />;

  async function send() {
    setResult(null);
    const token = getAccessToken();
    if (!token) return;
    let payload: Record<string, string> = {};
    try {
      payload = JSON.parse(dataJson || "{}") as Record<string, string>;
    } catch {
      setResult("Dữ liệu biến phải là JSON object.");
      return;
    }
    if (!templateId || !phone.trim()) {
      setResult("Chọn template và nhập số điện thoại.");
      return;
    }
    setSending(true);
    try {
      const res = await comviaFetch<{ status?: string; providerMessageId?: string; messageLogId?: string }>(
        `/workspaces/${workspaceId}/messages/send-single`,
        {
          method: "POST",
          token,
          body: JSON.stringify({
            templateId,
            phoneNumber: phone.trim(),
            data: payload,
          }),
        },
      );
      setResult(`Trạng thái: ${res.status ?? "OK"} — providerMessageId: ${res.providerMessageId ?? "—"}`);
    } catch (e) {
      setResult(e instanceof ComviaApiError ? e.message : "Gửi thất bại.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Messaging"
        title="Gửi tin single"
        description="Chỉ template APPROVED. Preflight OA & ví hiển thị bên dưới."
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs font-semibold uppercase text-muted-foreground">OA</p>
          <p className="mt-2">
            <EntityStatusBadge value={(data?.oa?.status ?? "UNKNOWN").toUpperCase()} />
          </p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Số dư ví (owner)</p>
          <p className="mt-2 text-xl font-semibold tabular-nums">{data?.wallet?.balance != null ? formatVND(data.wallet.balance) : "—"}</p>
        </Card>
        <Card>
          <p className="text-xs font-semibold uppercase text-muted-foreground">Template đã duyệt</p>
          <p className="mt-2 text-xl font-semibold tabular-nums">{approved.length}</p>
        </Card>
      </div>

      <Card className="max-w-2xl space-y-4">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Template
          </label>
          <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="">— Chọn —</option>
            {approved.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name ?? t.code ?? t.id}
              </option>
            ))}
          </Select>
          {keys.length ? (
            <p className="mt-2 text-xs text-muted-foreground">Biến: {keys.join(", ")}</p>
          ) : null}
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Số điện thoại nhận
          </label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="84901234567" />
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Dữ liệu biến (JSON)
          </label>
          <Textarea rows={6} value={dataJson} onChange={(e) => setDataJson(e.target.value)} />
        </div>
        <Button icon={<HiOutlinePaperAirplane className="size-4" />} type="button" disabled={sending} onClick={() => void send()}>
          {sending ? "Đang gửi…" : "Gửi tin"}
        </Button>
        {result ? <p className="text-sm text-muted-foreground">{result}</p> : null}
      </Card>
    </div>
  );
}
