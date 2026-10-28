"use client";

import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { TemplatePreview, type TemplateMessageType } from "@/components/template/preview/template-preview";
import { ComviaApiError, comviaFetch, resolvePublicAssetUrl } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";
import { type TemplateCtaButton } from "@/lib/template-cta";
import { useComviaQuery } from "@/lib/use-comvia-query";
import { HiOutlinePaperAirplane } from "react-icons/hi2";

type TemplateRow = {
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
type OaStatus = { status?: string };
type OaPreviewAsset = { logoLightUrl?: string | null };
type WalletBalance = { balance?: string };

const PHONE_PATTERN = /^84\d{8,10}$/;

function fieldKeysOf(template?: TemplateRow): string[] {
  if (!template) return [];
  const keys = Object.keys(template.placeholdersJson ?? {});
  if (template.type?.toUpperCase() === "OTP") return Array.from(new Set([...keys, "otp", "phut"]));
  return keys;
}

function initialValuesOf(template?: TemplateRow): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of fieldKeysOf(template)) values[key] = "";
  if (template?.type?.toUpperCase() === "OTP" && template.otpExpiryMinutes != null) {
    values.phut = String(template.otpExpiryMinutes);
  }
  return values;
}

function toPreviewType(type?: string): TemplateMessageType {
  if (type?.toUpperCase() === "TEXT") return "van_ban";
  if (type?.toUpperCase() === "OTP") return "otp";
  return "bang";
}

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

  const oaPreviewFetcher = useCallback(
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
  const { data: oa } = useComviaQuery(Boolean(workspaceId), oaPreviewFetcher);

  const approved = useMemo(
    () => (data?.templates ?? []).filter((t) => (t.status ?? "").toUpperCase() === "APPROVED"),
    [data?.templates],
  );

  const [templateId, setTemplateId] = useState("");
  const [phone, setPhone] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [jsonText, setJsonText] = useState("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const selected = approved.find((t) => t.id === templateId);
  const fieldKeys = fieldKeysOf(selected);
  const labelOf = (key: string) => selected?.placeholder_labels?.[key]?.trim() || key;
  const placeholderLabels = Object.fromEntries(fieldKeys.map((key) => [key, labelOf(key)]));

  if (loading) return <PageLoading />;
  if (error && !data) return <PageError message={error} onRetry={() => void refetch()} />;

  function chooseTemplate(id: string) {
    const next = initialValuesOf(approved.find((t) => t.id === id));
    setTemplateId(id);
    setValues(next);
    setJsonText(JSON.stringify(next, null, 2));
    setJsonError(null);
    setResult(null);
  }

  function updateValue(key: string, value: string) {
    const next = { ...values, [key]: value };
    setValues(next);
    setJsonText(JSON.stringify(next, null, 2));
    setJsonError(null);
  }

  function updateJson(text: string) {
    setJsonText(text);
    try {
      const parsed: unknown = JSON.parse(text || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
      setValues(Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)])));
      setJsonError(null);
    } catch {
      setJsonError('JSON không hợp lệ — phải có dạng { "tên_biến": "giá trị" }.');
    }
  }

  async function send() {
    setResult(null);
    const token = getAccessToken();
    if (!token) return;
    if (!templateId) {
      setResult("Chọn mẫu tin nhắn.");
      return;
    }
    const phoneNumber = phone.replace(/\s/g, "");
    if (!PHONE_PATTERN.test(phoneNumber)) {
      setResult("Số điện thoại phải bắt đầu bằng 84, gồm 10–12 chữ số (ví dụ 84901234567).");
      return;
    }
    if (jsonError) {
      setResult(jsonError);
      return;
    }
    const missing = fieldKeys.filter((key) => !(values[key] ?? "").trim());
    if (missing.length) {
      setResult(`Chưa nhập: ${missing.map(labelOf).join(", ")}.`);
      return;
    }
    const payload = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()]));
    setSending(true);
    try {
      const res = await comviaFetch<{ status?: string; providerMessageId?: string; messageLogId?: string }>(
        `/workspaces/${workspaceId}/messages/send-single`,
        {
          method: "POST",
          token,
          body: JSON.stringify({
            templateId,
            phoneNumber,
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
        // eyebrow="Messaging"
        title="Gửi tin"
        description="Chỉ được sử dụng các mẫu tin đã được duyệt."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mẫu tin nhắn
            </label>
            <Select value={templateId} onChange={(e) => chooseTemplate(e.target.value)}>
              <option value="">— Chọn —</option>
              {approved.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name ?? t.code ?? t.id}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Số điện thoại nhận
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="84901234567"
              inputMode="numeric"
            />
          </div>
          {selected ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nội dung biến</p>
              {fieldKeys.length ? (
                fieldKeys.map((key) => (
                  <div key={key}>
                    <label className="mb-2 block text-sm text-foreground">{labelOf(key)}</label>
                    <Input
                      value={values[key] ?? ""}
                      onChange={(e) => updateValue(key, e.target.value)}
                      placeholder={selected.placeholdersJson?.[key] ? `VD: ${selected.placeholdersJson[key]}` : ""}
                    />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Mẫu này không có biến cần nhập.</p>
              )}
              {selected.type?.toUpperCase() === "OTP" ? (
                <p className="text-xs text-muted-foreground">
                  Mẫu OTP: <code>phut</code> lấy từ thời hạn OTP của mẫu.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Chọn mẫu tin nhắn để nhập nội dung biến.</p>
          )}
          <details className="text-sm">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nâng cao: nhập dữ liệu dạng JSON
            </summary>
            <div className="mt-2">
              <Textarea
                rows={6}
                value={jsonText}
                onChange={(e) => updateJson(e.target.value)}
                invalid={Boolean(jsonError)}
                errorMessage={jsonError ?? undefined}
              />
            </div>
          </details>
          <Button icon={<HiOutlinePaperAirplane className="size-4" />} type="button" disabled={sending} onClick={() => void send()}>
            {sending ? "Đang gửi…" : "Gửi tin"}
          </Button>
          {result ? <p className="text-sm text-muted-foreground">{result}</p> : null}
        </Card>
        {selected ? (
          <Card className="flex min-w-0 flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Xem trước</p>
            <TemplatePreview
                type={toPreviewType(selected.type)}
                title={selected.title ?? ""}
                content={selected.content ?? ""}
                placeholders={values}
                placeholderLabels={placeholderLabels}
                secondaryContent={selected.secondaryContent ?? ""}
                minutes={String(selected.otpExpiryMinutes ?? 5)}
                logoUrl={resolvePublicAssetUrl(oa?.logoLightUrl)}
                ctaButtons={(selected.ctaButtons ?? []).map((b) => ({ ...b, label: b.label ?? "", target: b.target ?? "" }))}
              />
          </Card>
        ) : null}
      </div>
    </div>
  );
}
