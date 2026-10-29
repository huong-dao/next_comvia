"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { HiArrowLeft, HiOutlineDocumentCheck, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Input, Select, Textarea } from "@/components/ui/input";
import { TemplatePreview, type TemplateMessageType } from "@/components/template/preview/template-preview";
import { ComviaApiError, comviaFetch, resolvePublicAssetUrl } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";
import {
  newPlaceholderRow,
  recordToPlaceholderRows,
  rowsToPlaceholderLabels,
  rowsToPlaceholders,
  slugLooksValid,
  type PlaceholderRow,
} from "@/lib/template-placeholders";
import { CTA_TYPE_OPTIONS, ctaNeedsTarget, validateCtaButtons, type TemplateCtaButton, type TemplateCtaDraft, type TemplateCtaType } from "@/lib/template-cta";
import { TEMPLATE_STATUS_LABELS } from "@/lib/status-labels";
import { useComviaQuery } from "@/lib/use-comvia-query";

type AdminCta = TemplateCtaButton & { defaultUnitPrice?: number | null };
type TemplateDetail = {
  id: string;
  name?: string;
  code?: string;
  type?: string;
  title?: string;
  trackingId?: string;
  content?: string;
  secondaryContent?: string;
  otpExpiryMinutes?: number;
  status?: string;
  requiresOwnerRevision?: boolean;
  revisionReason?: string | null;
  placeholdersJson?: Record<string, string>;
  placeholder_labels?: Record<string, string> | null;
  placeholderLabels?: Record<string, string> | null;
  unitPricePerMessage?: number | string | null;
  providerTemplateId?: string | null;
  ctaButtons?: AdminCta[];
  workspace?: { id?: string; name?: string };
  oaConnection?: { id?: string; oaName?: string; name?: string };
};
type OaPreviewAsset = { logoLightUrl?: string | null };

type BackendTemplateType = "TABLE" | "TEXT" | "OTP";
const BACKEND_TO_PREVIEW: Record<BackendTemplateType, TemplateMessageType> = { TABLE: "bang", TEXT: "van_ban", OTP: "otp" };
const TYPE_OPTIONS: { value: BackendTemplateType; label: string }[] = [
  { value: "TABLE", label: "Dạng bảng" },
  { value: "TEXT", label: "Dạng văn bản" },
  { value: "OTP", label: "Dạng OTP" },
];

const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SUBMITTED", "DISABLED"],
  SUBMITTED: ["DRAFT", "PENDING_ZALO_APPROVAL", "DISABLED"],
  PENDING_ZALO_APPROVAL: ["SUBMITTED", "APPROVED", "DISABLED"],
  APPROVED: ["SUBMITTED", "DRAFT", "DISABLED"],
  DISABLED: ["DRAFT", "SUBMITTED"],
};
const ALL_STATUSES = ["DRAFT", "SUBMITTED", "PENDING_ZALO_APPROVAL", "APPROVED", "DISABLED"];

type AdminCtaDraft = { id?: string; type: TemplateCtaType; label: string; target: string; position: 0 | 1; unitPrice: string };

const LABEL_CLASS = "mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground";

export default function AdminTemplateDetailPage() {
  const params = useParams<{ templateId: string }>();
  const templateId = params.templateId;
  const fetcher = useCallback((token: string) => comviaFetch<TemplateDetail>("/admin/templates/" + templateId, { token }), [templateId]);
  const { data, loading, error, refetch } = useComviaQuery(Boolean(templateId), fetcher);

  const workspaceId = data?.workspace?.id;
  const oaFetcher = useCallback(
    async (token: string): Promise<OaPreviewAsset | null> => {
      try {
        return await comviaFetch<OaPreviewAsset>("/workspaces/" + workspaceId + "/oa", { token });
      } catch (fetchError) {
        // Endpoint này chỉ cho OWNER/MEMBER của workspace; admin không có quyền thì bỏ qua, preview dùng placeholder "OA".
        if (fetchError instanceof ComviaApiError && (fetchError.statusCode === 404 || fetchError.statusCode === 403)) return null;
        throw fetchError;
      }
    },
    [workspaceId],
  );
  const { data: oa } = useComviaQuery(Boolean(workspaceId), oaFetcher);
  const previewLogoUrl = resolvePublicAssetUrl(oa?.logoLightUrl);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState<BackendTemplateType>("TABLE");
  const [title, setTitle] = useState("");
  const [trackingId, setTrackingId] = useState("");
  const [content, setContent] = useState("");
  const [secondaryContent, setSecondaryContent] = useState("");
  const [otpMinutes, setOtpMinutes] = useState("5");
  const [placeholderRows, setPlaceholderRows] = useState<PlaceholderRow[]>(() => [newPlaceholderRow()]);
  const [unitPrice, setUnitPrice] = useState("");
  const [providerTemplateId, setProviderTemplateId] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [requiresOwnerRevision, setRequiresOwnerRevision] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");
  const [ctaButtons, setCtaButtons] = useState<AdminCtaDraft[]>([]);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setName(data.name ?? "");
    setCode(data.code ?? "");
    setType((data.type as BackendTemplateType) ?? "TABLE");
    setTitle(data.title ?? "");
    setTrackingId(data.trackingId ?? "");
    setContent(data.content ?? "");
    setSecondaryContent(data.secondaryContent ?? "");
    setOtpMinutes(data.otpExpiryMinutes != null ? String(data.otpExpiryMinutes) : "5");
    setPlaceholderRows(recordToPlaceholderRows(data.placeholdersJson, data.placeholder_labels ?? data.placeholderLabels));
    setUnitPrice(data.unitPricePerMessage != null ? String(data.unitPricePerMessage) : "");
    setProviderTemplateId(data.providerTemplateId ?? "");
    setStatus((data.status ?? "DRAFT").toUpperCase());
    setRequiresOwnerRevision(Boolean(data.requiresOwnerRevision));
    setRevisionReason(data.revisionReason ?? "");
    setCtaButtons(
      (data.ctaButtons ?? []).map((button) => ({
        id: button.id,
        type: button.type,
        label: button.label ?? "",
        target: button.target ?? "",
        position: button.position,
        unitPrice: button.unitPrice == null ? "" : String(button.unitPrice),
      })),
    );
    setMessage(null);
  }, [data]);

  const currentStatus = (data?.status ?? "").toUpperCase();
  const statusOptions = useMemo(() => Array.from(new Set([currentStatus, ...ALL_STATUSES])).filter(Boolean), [currentStatus]);
  const allowedNextStatuses = STATUS_TRANSITIONS[currentStatus] ?? [];
  const statusWillChange = status !== currentStatus;
  const statusTransitionInvalid = statusWillChange && !allowedNextStatuses.includes(status);

  const placeholdersParsed = useMemo(() => rowsToPlaceholders(placeholderRows), [placeholderRows]);
  const filledSlugs = useMemo(
    () => placeholderRows.map((row) => row.slug.trim()).filter((slug) => slug.length > 0 && slugLooksValid(slug)),
    [placeholderRows],
  );
  const previewLabels = useMemo(
    () => Object.fromEntries(placeholderRows.filter((row) => row.slug.trim() && slugLooksValid(row.slug.trim())).map((row) => [row.slug.trim(), row.label.trim() || row.slug.trim()])),
    [placeholderRows],
  );

  const zaloMayDesync = Boolean(
    (currentStatus === "APPROVED" || status === "APPROVED") && (providerTemplateId.trim() || data?.providerTemplateId),
  );

  function updateCta(index: number, patch: Partial<AdminCtaDraft>) {
    setCtaButtons((rows) => rows.map((row, itemIndex) => (itemIndex === index ? { ...row, ...patch } : row)));
  }

  function updateRow(id: string, patch: Partial<Pick<PlaceholderRow, "label" | "slug" | "defaultValue">>) {
    setPlaceholderRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    setPlaceholderRows((rows) => {
      const next = rows.filter((row) => row.id !== id);
      return next.length > 0 ? next : [newPlaceholderRow()];
    });
  }

  async function save() {
    if (!data) return;
    const showContentFields = type === "TABLE" || type === "TEXT";

    let placeholdersJson: Record<string, string> | undefined;
    if (showContentFields) {
      const parsed = rowsToPlaceholders(placeholderRows);
      if (!parsed.ok) {
        setMessage(parsed.message);
        return;
      }
      placeholdersJson = parsed.data;
    }

    const ctaError = validateCtaButtons(ctaButtons as TemplateCtaDraft[], filledSlugs);
    if (ctaError) {
      setMessage(ctaError);
      return;
    }
    for (const button of ctaButtons) {
      const raw = button.unitPrice.trim();
      if (raw !== "" && (!Number.isInteger(Number(raw)) || Number(raw) < 0)) {
        setMessage("Giá CTA phải là số nguyên không âm.");
        return;
      }
    }

    if (unitPrice.trim() !== "" && (!Number.isInteger(Number(unitPrice)) || Number(unitPrice) < 0)) {
      setMessage("Đơn giá tin phải là số nguyên không âm.");
      return;
    }

    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setMessage(null);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        code: code.trim(),
        type,
        title: title.trim(),
        trackingId: trackingId.trim(),
        unitPricePerMessage: unitPrice.trim() === "" ? null : Number(unitPrice),
        providerTemplateId: providerTemplateId.trim() || null,
        status,
        requiresOwnerRevision,
        revisionReason: revisionReason.trim() || null,
        ctaButtons: ctaButtons.map((button, index) => ({
          ...(button.id ? { id: button.id } : {}),
          type: button.type,
          ...(button.label.trim() ? { label: button.label.trim() } : {}),
          ...(button.target.trim() ? { target: button.target.trim() } : {}),
          position: index,
          ...(button.unitPrice.trim() !== "" ? { unitPrice: Number(button.unitPrice) } : {}),
        })),
      };
      if (type === "OTP") {
        const mins = Number(otpMinutes);
        if (!otpMinutes.trim() || !Number.isInteger(mins) || mins < 1) {
          setMessage("Số phút hết hạn OTP phải là số nguyên ≥ 1.");
          setSaving(false);
          return;
        }
        body.otpExpiryMinutes = mins;
      } else {
        if (!content.trim()) {
          setMessage("Nội dung là bắt buộc với loại tin này.");
          setSaving(false);
          return;
        }
        body.content = content;
        body.placeholdersJson = placeholdersJson;
        body.placeholder_labels = rowsToPlaceholderLabels(placeholderRows);
        if (type === "TABLE") body.secondaryContent = secondaryContent.trim() || null;
      }

      await comviaFetch("/admin/templates/" + templateId, { method: "PATCH", token, body: JSON.stringify(body) });
      setMessage("Đã lưu thay đổi.");
      void refetch();
    } catch (cause) {
      setMessage(cause instanceof ComviaApiError ? cause.message : "Không thể lưu thay đổi.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) return <PageLoading />;
  if (error && !data) return <PageError message={error} onRetry={() => void refetch()} />;
  if (!data) return <AdminRoleGate><></></AdminRoleGate>;

  const showContentFields = type === "TABLE" || type === "TEXT";

  return (
    <AdminRoleGate>
      <PageHeader
        title={data.name ?? data.code ?? "Mẫu tin ZBS"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {data.status ? <EntityStatusBadge value={data.status} label={TEMPLATE_STATUS_LABELS[data.status.toUpperCase()]} /> : null}
            <Button variant="outline" asChild><Link href="/admin/templates"><HiArrowLeft className="size-4" />Quay lại danh sách</Link></Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card><p className="text-xs text-muted-foreground">Workspace</p><p className="mt-1 font-semibold">{data.workspace?.name ?? data.workspace?.id ?? "—"}</p></Card>
        <Card><p className="text-xs text-muted-foreground">Zalo OA</p><p className="mt-1 font-semibold">{data.oaConnection?.oaName ?? data.oaConnection?.name ?? "—"}</p></Card>
      </div>

      {zaloMayDesync ? (
        <Card className="mb-6 border-amber-400/60 bg-amber-50/60 p-4 text-sm text-amber-900">
          Mẫu tin đang/sẽ ở trạng thái <strong>APPROVED</strong> và đã có mã template Zalo (<code>providerTemplateId</code>). Endpoint này <strong>không</strong> đồng bộ ngược lên Zalo — nếu lưu thay đổi nội dung, nội dung hiển thị thật trên Zalo sẽ không tự cập nhật theo.
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,600px)]">
        <Card className="min-w-0 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={LABEL_CLASS}>Tên mẫu tin</label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><label className={LABEL_CLASS}>Mã mẫu tin</label><Input value={code} onChange={(e) => setCode(e.target.value)} className="font-mono text-sm" /></div>
            <div>
              <label className={LABEL_CLASS}>Loại tin</label>
              <Select value={type} onChange={(e) => setType(e.target.value as BackendTemplateType)}>
                {TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </Select>
            </div>
            <div><label className={LABEL_CLASS}>Tựa đề</label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><label className={LABEL_CLASS}>Tracking ID</label><Input value={trackingId} onChange={(e) => setTrackingId(e.target.value)} /></div>
            <div><label className={LABEL_CLASS}>Provider Template ID (Zalo)</label><Input value={providerTemplateId} onChange={(e) => setProviderTemplateId(e.target.value)} className="font-mono text-sm" /></div>
          </div>

          {showContentFields ? (
            <div>
              <label className={LABEL_CLASS}>Nội dung</label>
              <Textarea rows={10} value={content} onChange={(e) => setContent(e.target.value)} />
              {filledSlugs.length > 0 ? <p className="mt-2 text-xs text-muted-foreground">Biến hiện có: {filledSlugs.map((s) => `{{${s}}}`).join(", ")}</p> : null}
            </div>
          ) : null}

          {type === "TABLE" ? (
            <div><label className={LABEL_CLASS}>Nội dung phụ</label><Textarea rows={4} value={secondaryContent} onChange={(e) => setSecondaryContent(e.target.value)} /></div>
          ) : null}

          {type === "OTP" ? (
            <div><label className={LABEL_CLASS}>Số phút hết hạn</label><Input type="number" min={1} value={otpMinutes} onChange={(e) => setOtpMinutes(e.target.value)} /></div>
          ) : null}

          {showContentFields ? (
            <div className="space-y-3 border-t border-border/60 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Các trường thông tin</p>
                <Button type="button" variant="outline" size="sm" icon={<HiOutlinePlus className="size-4" />} onClick={() => setPlaceholderRows((rows) => [...rows, newPlaceholderRow()])}>Thêm trường</Button>
              </div>
              <ul className="space-y-3">
                {placeholderRows.map((row) => (
                  <li key={row.id} className="grid gap-2 rounded-xl border border-border/60 bg-surface-muted/40 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                    <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Nhãn</label><Input value={row.label} onChange={(e) => updateRow(row.id, { label: e.target.value })} /></div>
                    <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Biến</label><Input value={row.slug} onChange={(e) => updateRow(row.id, { slug: e.target.value })} className="font-mono text-sm" aria-invalid={row.slug.trim().length > 0 && !slugLooksValid(row.slug.trim())} /></div>
                    <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Giá trị mẫu</label><Input value={row.defaultValue} onChange={(e) => updateRow(row.id, { defaultValue: e.target.value })} /></div>
                    <div className="flex items-end justify-end sm:justify-center">
                      <Button type="button" variant="ghost" size="sm" className="shrink-0 px-2 text-muted-foreground hover:text-danger" icon={<HiOutlineTrash className="size-4" />} onClick={() => removeRow(row.id)} />
                    </div>
                  </li>
                ))}
              </ul>
              {!placeholdersParsed.ok ? <p className="text-xs text-danger">{placeholdersParsed.message}</p> : null}
            </div>
          ) : null}

          <div className="space-y-3 border-t border-border/60 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nút CTA</p>
              {ctaButtons.length < 2 ? (
                <Button type="button" variant="outline" size="sm" icon={<HiOutlinePlus className="size-4" />} onClick={() => setCtaButtons((rows) => [...rows, { type: "OA_PROFILE", label: "", target: "", position: rows.length as 0 | 1, unitPrice: "" }])}>Thêm nút CTA</Button>
              ) : null}
            </div>
            {ctaButtons.map((button, index) => (
              <div key={button.id ?? index} className="grid gap-3 rounded-xl border border-border/60 bg-surface-muted/40 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px_auto]">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Loại nút</label>
                  <Select value={button.type} onChange={(e) => updateCta(index, { type: e.target.value as TemplateCtaType })}>
                    {CTA_TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Nhãn nút</label>
                  <Input value={button.label} onChange={(e) => updateCta(index, { label: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Giá override (VND)</label>
                  <Input type="number" min={0} step={1} value={button.unitPrice} onChange={(e) => updateCta(index, { unitPrice: e.target.value })} placeholder="Dùng giá snapshot" />
                </div>
                <div className="flex items-end justify-end">
                  <Button type="button" variant="ghost" size="sm" className="px-2 text-muted-foreground hover:text-danger" icon={<HiOutlineTrash className="size-4" />} onClick={() => setCtaButtons((rows) => rows.filter((_, i) => i !== index))} />
                </div>
                <div className="md:col-span-4">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {button.type === "PHONE_CALL" ? "Số điện thoại" : "Đường dẫn liên kết"}{ctaNeedsTarget(button.type) ? " *" : " (tuỳ chọn)"}
                  </label>
                  <Input value={button.target} onChange={(e) => updateCta(index, { target: e.target.value })} placeholder={button.type === "PHONE_CALL" ? "vd: 0901234567" : "https://example.com"} />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t border-border/60 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Giá & trạng thái (ADMIN)</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className={LABEL_CLASS}>Đơn giá tin (VND)</label><Input type="number" min={0} step={1} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="Dùng giá mặc định hệ thống" /></div>
              <div>
                <label className={LABEL_CLASS}>Trạng thái</label>
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {statusOptions.map((value) => <option key={value} value={value}>{TEMPLATE_STATUS_LABELS[value] ?? value}</option>)}
                </Select>
                {statusTransitionInvalid ? (
                  <p className="mt-1 text-xs text-danger">
                    Backend chỉ cho phép chuyển {currentStatus} → {allowedNextStatuses.join(", ") || "(không chuyển được)"}. Lưu với lựa chọn này nhiều khả năng sẽ trả lỗi 409.
                  </p>
                ) : null}
                {status === "APPROVED" && !providerTemplateId.trim() ? (
                  <p className="mt-1 text-xs text-danger">Cần nhập Provider Template ID trước khi set trạng thái APPROVED.</p>
                ) : null}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={requiresOwnerRevision} onChange={(e) => setRequiresOwnerRevision(e.target.checked)} />
              Yêu cầu chủ workspace chỉnh sửa lại (requiresOwnerRevision)
            </label>
            {requiresOwnerRevision ? (
              <div><label className={LABEL_CLASS}>Lý do yêu cầu chỉnh sửa</label><Textarea rows={3} value={revisionReason} onChange={(e) => setRevisionReason(e.target.value)} /></div>
            ) : null}
          </div>

          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          <Button icon={<HiOutlineDocumentCheck className="size-4" />} type="button" disabled={saving} onClick={() => void save()}>
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </Card>

        <Card className="flex min-w-0 flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Xem trước</p>
          <div className="flex-1 overflow-auto rounded-xl bg-surface-muted p-4">
            <TemplatePreview
              type={BACKEND_TO_PREVIEW[type]}
              title={title}
              content={content}
              placeholders={placeholdersParsed.ok ? placeholdersParsed.data : {}}
              placeholderLabels={previewLabels}
              secondaryContent={secondaryContent}
              minutes={otpMinutes}
              logoUrl={previewLogoUrl}
              ctaButtons={ctaButtons}
            />
          </div>
        </Card>
      </div>
    </AdminRoleGate>
  );
}
