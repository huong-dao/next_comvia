"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  HiArrowLeft,
  HiArrowPath,
  HiOutlineArrowDownTray,
  HiOutlineArrowUpTray,
  HiOutlinePencilSquare,
  HiOutlinePlay,
  HiOutlineTrash,
} from "react-icons/hi2";
import { PageEmpty, PageError, PageLoading } from "@/components/app/page-state";
import { CampaignPreflightModal, type CampaignPreflightData } from "@/components/campaign/campaign-preflight-modal";
import { CampaignRowEditModal } from "@/components/campaign/campaign-row-edit-modal";
import { SubscriptionBlockedNotice } from "@/components/subscription/subscription-blocked-notice";
import { useCanSend } from "@/components/subscription/subscription-provider";
import { TemplatePreview, type TemplateMessageType } from "@/components/template/preview/template-preview";
import { isWorkspaceOwner, useWorkspaceContext } from "@/components/workspace/workspace-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Input } from "@/components/ui/input";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { SimpleTable } from "@/components/ui/simple-table";
import { TablePagination } from "@/components/ui/table-pagination";
import { formatComviaError } from "@/lib/api-message";
import { localizeCsvErrors } from "@/lib/campaign-csv-errors";
import {
  campaignRowReason,
  payloadToStringMap,
  type CampaignDataRow,
} from "@/lib/campaign-row-display";
import { comviaDownloadBlob } from "@/lib/comvia-download";
import { ComviaApiError, comviaFetch, comviaMultipartFetch, resolvePublicAssetUrl } from "@/lib/comviaFetch";
import { getAccessToken, getStoredUser } from "@/lib/auth";
import { workspacePath } from "@/lib/paths";
import { ensureOaConnected } from "@/lib/oa-guard";
import { isSubscriptionBlockedError } from "@/lib/subscription";
import { type TemplateCtaButton } from "@/lib/template-cta";
import { useClientPagination } from "@/lib/use-client-pagination";
import { useComviaQuery } from "@/lib/use-comvia-query";

type CampaignDetail = {
  id: string;
  name?: string;
  status?: string;
  templateId?: string;
  template?: {
    id?: string;
    name?: string;
    code?: string;
    status?: string;
    unitPricePerMessage?: number | string | null;
    placeholdersJson?: Record<string, string>;
  };
  lastRunAt?: string;
  /**
   * `OA_DISCONNECTED` (OA mất kết nối) hoặc `SUBSCRIPTION_EXPIRED` (gói hết hạn giữa chừng) khi campaign PAUSED;
   * null/giá trị lạ → xử lý như PAUSED thường.
   */
  pauseReason?: string | null;
  unitPriceAtCreate?: number | string | null;
  rowCount?: number;
  totalData?: number;
};

type TemplateOption = {
  id: string;
  type?: string;
  name?: string;
  code?: string;
  title?: string | null;
  content?: string | null;
  content2?: string | null;
  secondaryContent?: string | null;
  secondaryContent2?: string | null;
  status?: string;
  otpExpiryMinutes?: number | null;
  placeholdersJson?: Record<string, string>;
  placeholder_labels?: Record<string, string> | null;
  placeholderOrder?: string[] | null;
  ctaButtons?: TemplateCtaButton[];
};

type OaPreviewAsset = { logoLightUrl?: string | null };

type WalletBalance = { balance?: string };

type OaStatus = { status?: string; oaName?: string };

type MessagePricingConfig = { defaultMessageUnitPrice?: number | string };

type ReconcileResult = { campaignId?: string; updated?: number; unchanged?: number; pendingRows?: number };

const MAX_CSV_ERRORS_SHOWN = 20;

function toPreviewType(type?: string): TemplateMessageType {
  if (type?.toUpperCase() === "TEXT") return "van_ban";
  if (type?.toUpperCase() === "OTP") return "otp";
  return "bang";
}

/** Danh sách lỗi theo dòng/row_id từ body 400 của import-csv và import-csv/reconcile. */
function csvErrorsOf(e: unknown): string[] {
  if (!(e instanceof ComviaApiError)) return [];
  const details = e.details;
  if (!details || typeof details !== "object" || !("errors" in details)) return [];
  const errors = (details as { errors?: unknown }).errors;
  return Array.isArray(errors) ? errors.filter((x): x is string => typeof x === "string") : [];
}

const ROW_FILTERS = [
  { value: "", label: "Tất cả" },
  { value: "PENDING", label: "Chờ gửi" },
  { value: "SUCCESS", label: "Thành công" },
  { value: "FAILED", label: "Thất bại" },
  { value: "SKIPPED", label: "Bỏ qua" },
] as const;

/** Tên file không dấu: "Chiến dịch test" → "Chien_dich_test". */
function toAsciiFileSlug(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function csvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** CSV chỉ gồm các dòng FAILED hiện có — dùng cho "Tải CSV dữ liệu gửi lỗi" (tab Thất bại). */
function buildFailedRowsCsv(rows: CampaignDataRow[], placeholderKeys: string[]) {
  const headers = ["row_id", "Phone", ...placeholderKeys.map((k) => k.charAt(0).toUpperCase() + k.slice(1))];
  const lines = [headers.map(csvCell).join(",")];
  for (const r of rows) {
    const cells = [r.id, r.phoneNumber ?? "", ...placeholderKeys.map((k) => String(r.payloadData?.[k] ?? ""))];
    lines.push(cells.map(csvCell).join(","));
  }
  return lines.join("\r\n");
}

export default function CampaignDetailPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const campaignId = params.campaignId as string;
  const { role } = useWorkspaceContext();
  const owner = isWorkspaceOwner(role);
  const fileRef = useRef<HTMLInputElement>(null);

  const [rowFilter, setRowFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  /** `message` của SUBSCRIPTION_REQUIRED/EXPIRED khi server chặn execute/retry/resume. */
  const [subscriptionBlock, setSubscriptionBlock] = useState<string | null>(null);
  /** `false` khi `/current` báo chưa có gói/hết hạn; `undefined` khi chưa tải xong. */
  const canSend = useCanSend();
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [preflightData, setPreflightData] = useState<CampaignPreflightData | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [templateOverrideId, setTemplateOverrideId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<CampaignDataRow | null>(null);

  const campaignFetcher = useCallback(
    (token: string) =>
      comviaFetch<CampaignDetail>(`/workspaces/${workspaceId}/campaigns/${campaignId}`, { token }),
    [workspaceId, campaignId],
  );

  const {
    data: campaign,
    loading: lc,
    error: ec,
    refetch: refetchCampaign,
  } = useComviaQuery(Boolean(workspaceId && campaignId), campaignFetcher);

  const templatesFetcher = useCallback(
    (token: string) => comviaFetch<TemplateOption[]>(`/workspaces/${workspaceId}/templates`, { token }),
    [workspaceId],
  );
  const { data: templates } = useComviaQuery(Boolean(workspaceId), templatesFetcher);

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

  const rowsQuery = rowFilter ? `?status=${encodeURIComponent(rowFilter)}&limit=500` : "?limit=500";
  const rowsFetcher = useCallback(
    (token: string) =>
      comviaFetch<CampaignDataRow[]>(
        `/workspaces/${workspaceId}/campaigns/${campaignId}/rows${rowsQuery}`,
        { token },
      ),
    [workspaceId, campaignId, rowsQuery],
  );

  const {
    data: rows,
    loading: lr,
    error: er,
    refetch: refetchRows,
  } = useComviaQuery(Boolean(workspaceId && campaignId), rowsFetcher);

  const pendingFetcher = useCallback(
    (token: string) =>
      comviaFetch<CampaignDataRow[]>(
        `/workspaces/${workspaceId}/campaigns/${campaignId}/rows?status=PENDING&limit=500`,
        { token },
      ),
    [workspaceId, campaignId],
  );

  const { data: pendingRows, refetch: refetchPending } = useComviaQuery(
    Boolean(workspaceId && campaignId),
    pendingFetcher,
  );

  const failedFetcher = useCallback(
    (token: string) =>
      comviaFetch<CampaignDataRow[]>(
        `/workspaces/${workspaceId}/campaigns/${campaignId}/rows?status=FAILED&limit=500`,
        { token },
      ),
    [workspaceId, campaignId],
  );

  const { data: failedRows, refetch: refetchFailed } = useComviaQuery(
    Boolean(workspaceId && campaignId),
    failedFetcher,
  );

  const rowList = useMemo(() => rows ?? [], [rows]);
  const {
    rows: pagedRows,
    page: rowsPage,
    totalPages: rowsTotalPages,
    total: rowsTotal,
    pageSize: rowsPageSize,
    setPage: setRowsPage,
  } = useClientPagination(rowList);
  const placeholderKeys = useMemo(
    () => Object.keys(campaign?.template?.placeholdersJson ?? {}),
    [campaign?.template?.placeholdersJson],
  );

  const hasExecuted = Boolean(campaign?.lastRunAt);
  const statusUpper = (campaign?.status ?? "").toUpperCase();
  const isLocked = ["RUNNING", "CANCELLED"].includes(statusUpper);
  const pendingCount = pendingRows?.length ?? 0;
  const pausedByOa = statusUpper === "PAUSED" && campaign?.pauseReason === "OA_DISCONNECTED";
  const pausedBySubscription = statusUpper === "PAUSED" && campaign?.pauseReason === "SUBSCRIPTION_EXPIRED";
  /** Đang dừng có lý do: chỉ cho "Tiếp tục"; Retry/Reconcile/Execute bị ẩn (server trả lỗi tiếng Anh không có `code`). */
  const pausedByReason = pausedByOa || pausedBySubscription;
  /** Gói không cho gửi: khóa nút gửi, nhưng server vẫn là nơi quyết định (gói có thể hết giữa chừng). */
  const subscriptionLocked = canSend === false;
  const canReconcileCsv = hasExecuted && !isLocked && !pausedByReason;
  const failedCount = failedRows?.length ?? 0;
  /** Không có dòng PENDING (chưa reconcile CSV) → "Gửi lại" dùng `retry` trực tiếp các dòng FAILED. */
  const retryFailedDirectly = hasExecuted && pendingCount === 0 && failedCount > 0;
  const canResend = (pendingCount > 0 || failedCount > 0) && !isLocked && !pausedByReason && !subscriptionLocked;
  const canExecute = pendingCount > 0 && !isLocked && !pausedByReason && !subscriptionLocked;

  const approvedTemplates = useMemo(
    () => (templates ?? []).filter((t) => (t.status ?? "").toUpperCase() === "APPROVED"),
    [templates],
  );
  const templateOptions = useMemo<SearchableSelectOption[]>(
    () =>
      approvedTemplates.map((t) => ({
        value: t.id,
        label: t.name ? (t.code ? `${t.name} (${t.code})` : t.name) : (t.code ?? t.id),
      })),
    [approvedTemplates],
  );
  const templateById = useMemo(() => new Map((templates ?? []).map((t) => [t.id, t])), [templates]);
  const selectedTemplateId = templateOverrideId ?? campaign?.templateId ?? campaign?.template?.id ?? "";
  const selectedTemplate = templateById.get(selectedTemplateId);

  async function downloadCsvTemplate() {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      const slug = toAsciiFileSlug(campaign?.name ?? "") || "campaign";
      await comviaDownloadBlob(
        `/workspaces/${workspaceId}/campaigns/${campaignId}/csv-template`,
        { token, filename: `${slug}-mau.csv` },
      );
    } catch (e) {
      setMsg(formatComviaError(e, "Không tải được file CSV mẫu."));
    } finally {
      setBusy(false);
    }
  }

  function downloadFailedRowsCsv() {
    const slug = toAsciiFileSlug(campaign?.name ?? "") || "campaign";
    const csv = buildFailedRowsCsv(rowList, placeholderKeys);
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-loi.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function uploadCsv(file: File) {
    const token = getAccessToken();
    if (!token) return;
    const fd = new FormData();
    fd.append("file", file);
    setBusy(true);
    setMsg(null);
    setCsvErrors([]);
    try {
      if (hasExecuted) {
        const res = await comviaMultipartFetch<ReconcileResult>(
          `/workspaces/${workspaceId}/campaigns/${campaignId}/import-csv/reconcile`,
          { token, formData: fd },
        );
        setMsg(
          `Đã cập nhật ${res?.updated ?? 0} dòng, giữ nguyên ${res?.unchanged ?? 0} dòng. ${res?.pendingRows ?? 0} dòng chờ gửi.`,
        );
      } else {
        await comviaMultipartFetch(`/workspaces/${workspaceId}/campaigns/${campaignId}/import-csv`, {
          token,
          formData: fd,
        });
        setMsg("Đã import CSV — danh sách đã được thay thế.");
      }
      void refetchCampaign();
      void refetchRows();
      void refetchPending();
      void refetchFailed();
    } catch (e) {
      const raw = csvErrorsOf(e);
      setMsg(
        raw.length > 0
          ? "File CSV có dữ liệu chưa hợp lệ, chưa có dòng nào được lưu. Vui lòng sửa các dòng sau rồi upload lại:"
          : formatComviaError(e, "Import CSV thất bại."),
      );
      let text: string | undefined;
      try {
        text = await file.text();
      } catch {
        text = undefined;
      }
      setCsvErrors(localizeCsvErrors(raw, text));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function openPreflight() {
    const token = getAccessToken();
    if (!token || !campaign) return;
    setBusy(true);
    setMsg(null);
    try {
      const [oaRes, walletRes, defaultPricing] = await Promise.all([
        comviaFetch<OaStatus>(`/workspaces/${workspaceId}/oa/status`, { token }).catch(() => null),
        comviaFetch<WalletBalance>(`/workspaces/${workspaceId}/wallet/balance`, { token }).catch(() => null),
        getStoredUser()?.role?.toUpperCase() === "ADMIN"
          ? comviaFetch<MessagePricingConfig>("/admin/config/message-pricing", { token }).catch(() => null)
          : Promise.resolve(null),
      ]);
      const oaStatusRes = oaRes ?? {};
      const wallet = walletRes ?? {};

      const fromCampaign = Number(campaign.rowCount ?? campaign.totalData ?? 0);
      const count = hasExecuted
        ? retryFailedDirectly
          ? failedCount
          : pendingCount
        :Number.isFinite(fromCampaign) && fromCampaign > 0
          ? fromCampaign
          : rowList.length;

      setPreflightData({
        templateName: campaign.template?.name ?? campaign.template?.code,
        templateStatus: campaign.template?.status,
        oaStatus: oaStatusRes.status,
        oaName: oaStatusRes.oaName,
        rowCount: count,
        campaignUnitPrice: campaign.unitPriceAtCreate,
        templateUnitPrice: campaign.template?.unitPricePerMessage,
        defaultUnitPrice: defaultPricing?.defaultMessageUnitPrice,
        walletBalance: wallet.balance,
        isWorkspaceOwner: owner,
      });
      setPreflightOpen(true);
    } catch (e) {
      setMsg(formatComviaError(e, "Không tải dữ liệu xác nhận."));
    } finally {
      setBusy(false);
    }
  }

  async function executeCampaign() {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setMsg(null);
    setSubscriptionBlock(null);
    try {
      // Kiểm tra lại OA ngay trước khi gửi/gửi lại: trạng thái lúc mở hộp xác nhận có thể đã cũ.
      const oaGuard = await ensureOaConnected(workspaceId, token);
      if (!oaGuard.ok) {
        setPreflightOpen(false);
        setMsg(oaGuard.message);
        return;
      }
      if (retryFailedDirectly) {
        await comviaFetch(`/workspaces/${workspaceId}/campaigns/${campaignId}/retry`, {
          method: "POST",
          token,
          body: JSON.stringify({ rowIds: (failedRows ?? []).map((r) => r.id) }),
        });
      } else {
        await comviaFetch(`/workspaces/${workspaceId}/campaigns/${campaignId}/execute`, {
          method: "POST",
          token,
        });
      }
      setMsg("Đã bắt đầu gửi chiến dịch.");
      setPreflightOpen(false);
      void refetchCampaign();
      void refetchRows();
      void refetchPending();
      void refetchFailed();
    } catch (e) {
      if (isSubscriptionBlockedError(e)) {
        // Không trừ ví, không tạo MessageLog (guide 9B.6): đóng hộp xác nhận và dẫn tới trang gói.
        setPreflightOpen(false);
        setSubscriptionBlock(formatComviaError(e));
      } else {
        setMsg(formatComviaError(e, "Không thực hiện được gửi chiến dịch."));
      }
    } finally {
      setBusy(false);
    }
  }

  /** POST /resume: tiếp tục campaign bị tạm dừng vì OA mất kết nối hoặc gói hết hạn (không trừ ví lần nữa). */
  async function resumeCampaign() {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setMsg(null);
    setSubscriptionBlock(null);
    try {
      await comviaFetch(`/workspaces/${workspaceId}/campaigns/${campaignId}/resume`, { method: "POST", token });
      setMsg("Đã tiếp tục gửi chiến dịch.");
    } catch (e) {
      const code = e instanceof ComviaApiError ? (e.details as { code?: string } | null)?.code : undefined;
      if (isSubscriptionBlockedError(e)) {
        setSubscriptionBlock(formatComviaError(e));
      } else if (code === "OA_NOT_CONNECTED") {
        setMsg(`${formatComviaError(e, "Zalo OA chưa kết nối.")} Vui lòng kết nối lại OA rồi bấm Tiếp tục.`);
      } else {
        setMsg(formatComviaError(e, "Không tiếp tục được chiến dịch."));
      }
    } finally {
      setBusy(false);
      // Luôn tải lại: trạng thái campaign có thể đã đổi (vd. không còn bị dừng vì OA).
      void refetchCampaign();
      void refetchRows();
      void refetchPending();
      void refetchFailed();
    }
  }

  async function deleteRow(rowId: string) {
    const token = getAccessToken();
    if (!token) return;
    if (!window.confirm("Xóa dòng dữ liệu này?")) return;
    setBusy(true);
    setMsg(null);
    try {
      await comviaFetch(`/workspaces/${workspaceId}/campaigns/${campaignId}/rows/${rowId}`, {
        method: "DELETE",
        token,
      });
      void refetchCampaign();
      void refetchRows();
      void refetchPending();
      void refetchFailed();
    } catch (e) {
      setMsg(formatComviaError(e, "Không xóa được dòng."));
    } finally {
      setBusy(false);
    }
  }

  async function saveRowEdit(phone: string, payload: Record<string, string>) {
    if (!editRow) return;
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      await comviaFetch(`/workspaces/${workspaceId}/campaigns/${campaignId}/rows/${editRow.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ phoneNumber: phone, payloadData: payload }),
      });
      setEditRow(null);
      void refetchRows();
      void refetchPending();
      void refetchFailed();
    } catch (e) {
      setMsg(formatComviaError(e, "Không lưu được dòng."));
    } finally {
      setBusy(false);
    }
  }

  async function commitNameEdit() {
    setEditingName(false);
    const next = nameDraft.trim();
    if (!next || next === campaign?.name) return;
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      await comviaFetch(`/workspaces/${workspaceId}/campaigns/${campaignId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ name: next }),
      });
      void refetchCampaign();
    } catch (e) {
      setMsg(e instanceof ComviaApiError ? e.message : "Không đổi tên được.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Đổi mẫu tin khi campaign chưa gửi lần nào. API hiện tại (`PATCH /campaigns/:id`) theo tài liệu
   * chỉ hỗ trợ đổi `name`, chưa hỗ trợ `templateId` — BE cần bổ sung trước khi field này hoạt động
   * thật (xem docs/issues). FE vẫn gửi `templateId` để sẵn sàng khi BE hỗ trợ.
   */
  async function changeTemplate(newTemplateId: string) {
    setTemplateOverrideId(newTemplateId);
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      await comviaFetch(`/workspaces/${workspaceId}/campaigns/${campaignId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ templateId: newTemplateId }),
      });
      setMsg("Đã đổi mẫu tin.");
      void refetchCampaign();
    } catch (e) {
      setMsg(formatComviaError(e, "Không đổi được mẫu tin."));
    } finally {
      setBusy(false);
    }
  }

  /**
   * `DELETE /campaigns/:id`: DRAFT (chưa gửi lần nào) bị xóa hẳn, không hoàn tác được;
   * campaign đã chạy chỉ chuyển trạng thái `CANCELLED` (ngưng kích hoạt, không mất dữ liệu).
   */
  const isDraftCampaign = statusUpper === "DRAFT";

  async function deleteCampaign() {
    const token = getAccessToken();
    if (!token) return;
    const confirmMessage = isDraftCampaign
      ? "Xóa chiến dịch này? Không thể hoàn tác."
      : "Ngừng kích hoạt chiến dịch này?";
    if (!window.confirm(confirmMessage)) return;
    setBusy(true);
    try {
      await comviaFetch(`/workspaces/${workspaceId}/campaigns/${campaignId}`, {
        method: "DELETE",
        token,
      });
      if (isDraftCampaign) {
        window.location.href = workspacePath(workspaceId, "campaigns");
      } else {
        void refetchCampaign();
        setBusy(false);
      }
    } catch (e) {
      setMsg(formatComviaError(e, isDraftCampaign ? "Không xóa được chiến dịch." : "Không ngưng kích hoạt được chiến dịch."));
      setBusy(false);
    }
  }

  if (lc) return <PageLoading />;
  if (ec && !campaign) return <PageError message={ec} onRetry={() => void refetchCampaign()} />;
  if (!campaign) return null;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {editingName ? (
            <Input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => void commitNameEdit()}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setEditingName(false);
              }}
              className="h-auto max-w-sm py-1 text-2xl font-semibold"
            />
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                {campaign.name ?? campaign.id}
              </h1>
              <button
                type="button"
                className="text-muted-foreground transition hover:text-foreground"
                aria-label="Sửa tên chiến dịch"
                onClick={() => {
                  setNameDraft(campaign.name ?? "");
                  setEditingName(true);
                }}
              >
                <HiOutlinePencilSquare className="size-5" />
              </button>
            </div>
          )}
          {campaign.template?.name ? (
            <p className="mt-2 text-muted-foreground">
              Mẫu: {campaign.template.name}
              {campaign.template.code ? ` (${campaign.template.code})` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {campaign.status ? <EntityStatusBadge value={campaign.status} /> : null}
          <Button icon={<HiArrowLeft className="size-4" />} variant="outline" asChild size="sm">
            <Link href={workspacePath(workspaceId, "campaigns")}>Danh sách</Link>
          </Button>
        </div>
      </div>

      <div className="mb-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Thông tin chiến dịch
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Gửi gần nhất</p>
              <p className="font-medium">
                {campaign.lastRunAt ? new Date(campaign.lastRunAt).toLocaleString() : "Chưa gửi"}
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="campaign-template">
              Chọn mẫu
            </label>
            {hasExecuted ? (
              <p className="text-sm text-foreground">
                {campaign.template?.name ?? campaign.template?.code ?? "—"}{" "}
                <span className="text-xs text-muted-foreground">(đã gửi — không đổi được mẫu)</span>
              </p>
            ) : approvedTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có mẫu APPROVED.</p>
            ) : (
              <div className="max-w-xs">
                <SearchableSelect
                  id="campaign-template"
                  aria-label="Chọn mẫu tin"
                  options={templateOptions}
                  value={selectedTemplateId}
                  onValueChange={(v) => {
                    // Doi mau tin se xoa toan bo dong da import, nen chi PATCH
                    // khi thuc su chon sang mau khac.
                    if (v && v !== selectedTemplateId) void changeTemplate(v);
                  }}
                  disabled={busy}
                  emptyText="Không tìm thấy mẫu tin phù hợp."
                  clearable={false}
                  matchValue={false}
                />
              </div>
            )}
          </div>

          {!hasExecuted ? (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <p className="mb-2 font-medium text-foreground">Hướng dẫn gửi tin</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>Chọn mẫu tin ở trên.</li>
                <li>
                  Bấm <strong className="text-foreground">Tải CSV mẫu</strong> để lấy file có sẵn cột{" "}
                  <code>phone</code>
                  {placeholderKeys.length > 0 ? (
                    <>
                      {" "}
                      và các biến: <code>{placeholderKeys.join(", ")}</code>
                    </>
                  ) : null}
                  .
                </li>
                <li>Điền danh sách người nhận vào file CSV đã tải.</li>
                <li>
                  Bấm <strong className="text-foreground">Upload CSV</strong> và chọn file đã điền. Số dòng đã upload sẽ
                  hiển thị bên dưới.
                </li>
                <li>
                  Bấm <strong className="text-foreground">Thực hiện gửi (Execute)</strong> để bắt đầu gửi.
                </li>
              </ol>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {!hasExecuted ? (
              <Button
                type="button"
                variant="outline"
                icon={<HiOutlineArrowDownTray className="size-4" />}
                disabled={busy}
                onClick={() => void downloadCsvTemplate()}
              >
                Tải CSV mẫu
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              icon={<HiOutlineTrash className="size-4" />}
              disabled={busy}
              onClick={() => void deleteCampaign()}
            >
              {isDraftCampaign ? "Xóa" : "Ngừng kích hoạt"}
            </Button>
          </div>
        </Card>

        <Card className="flex min-w-0 flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Xem trước</p>
          {selectedTemplate ? (
            <TemplatePreview
              type={toPreviewType(selectedTemplate.type)}
              title={selectedTemplate.title ?? ""}
              content={selectedTemplate.content ?? ""}
              placeholders={selectedTemplate.placeholdersJson ?? {}}
              placeholderLabels={selectedTemplate.placeholder_labels ?? undefined}
              secondaryContent={selectedTemplate.secondaryContent ?? ""}
              minutes={String(selectedTemplate.otpExpiryMinutes ?? 5)}
              logoUrl={resolvePublicAssetUrl(oa?.logoLightUrl)}
              placeholderOrder={selectedTemplate.placeholderOrder}
              content2={selectedTemplate.content2 ?? ""}
              secondaryContent2={selectedTemplate.secondaryContent2 ?? ""}
              ctaButtons={(selectedTemplate.ctaButtons ?? []).map((b) => ({
                ...b,
                label: b.label ?? "",
                target: b.target ?? "",
              }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Chưa có mẫu tin để xem trước.</p>
          )}
        </Card>
      </div>

      {pausedByOa ? (
        <Card className="mb-6 space-y-2 border-warning">
          <p className="text-sm font-semibold text-foreground">Chiến dịch đang tạm dừng vì Zalo OA mất kết nối</p>
          <p className="text-sm text-muted-foreground">
            Các tin chưa gửi vẫn được giữ nguyên (trạng thái chờ gửi) và tiền đã được giữ sẵn, sẽ không bị trừ lại. Hãy{" "}
            <Link className="font-medium text-primary underline" href={workspacePath(workspaceId, "oa")}>
              kết nối lại Zalo OA
            </Link>{" "}
            rồi bấm “Tiếp tục”.
          </p>
          <div>
            <Button type="button" icon={<HiOutlinePlay className="size-4" />} disabled={busy} onClick={() => void resumeCampaign()}>
              Tiếp tục
            </Button>
          </div>
        </Card>
      ) : null}

      {pausedBySubscription ? (
        <Card className="mb-6 space-y-2 border-warning">
          <p className="text-sm font-semibold text-foreground">Chiến dịch đang tạm dừng vì gói dịch vụ đã hết hạn</p>
          <p className="text-sm text-muted-foreground">
            Các tin chưa gửi vẫn được giữ nguyên (trạng thái chờ gửi) và tiền đã được giữ sẵn, sẽ không bị trừ lại.{" "}
            {owner ? (
              <>
                Hãy{" "}
                <Link className="font-medium text-primary underline" href={workspacePath(workspaceId, "subscription")}>
                  gia hạn gói
                </Link>{" "}
                rồi bấm “Tiếp tục”.
              </>
            ) : (
              "Liên hệ chủ sở hữu workspace để gia hạn gói rồi bấm “Tiếp tục”."
            )}
          </p>
          <div>
            {/* Chỉ bật khi `/current` có canSend=true (guide 9B.6). */}
            <Button
              type="button"
              icon={<HiOutlinePlay className="size-4" />}
              disabled={busy || canSend !== true}
              title={canSend !== true ? "Gia hạn gói trước khi tiếp tục." : undefined}
              onClick={() => void resumeCampaign()}
            >
              Tiếp tục
            </Button>
          </div>
        </Card>
      ) : null}

      {subscriptionBlock ? (
        <SubscriptionBlockedNotice className="mb-6" message={subscriptionBlock} workspaceId={workspaceId} owner={owner} />
      ) : null}

      {!hasExecuted ? (
        <Card className="mb-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CSV & gửi tin</p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadCsv(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              icon={<HiOutlineArrowUpTray className="size-4" />}
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              Upload CSV
            </Button>
            <Button
              type="button"
              icon={<HiOutlinePlay className="size-4" />}
              disabled={busy || !canExecute}
              onClick={() => void openPreflight()}
            >
              Thực hiện gửi (Execute)
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Số dòng đã upload:{" "}
            <span className="font-medium tabular-nums text-foreground">{pendingCount}</span>
          </p>
          {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
          {csvErrors.length > 0 ? (
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-danger">
              {csvErrors.slice(0, MAX_CSV_ERRORS_SHOWN).map((line, index) => (
                <li key={`${index}-${line}`}>{line}</li>
              ))}
              {csvErrors.length > MAX_CSV_ERRORS_SHOWN ? (
                <li>…và {csvErrors.length - MAX_CSV_ERRORS_SHOWN} lỗi khác.</li>
              ) : null}
            </ul>
          ) : null}
        </Card>
      ) : msg || csvErrors.length > 0 ? (
        <Card className="mb-6 space-y-2">
          {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
          {csvErrors.length > 0 ? (
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-danger">
              {csvErrors.slice(0, MAX_CSV_ERRORS_SHOWN).map((line, index) => (
                <li key={`${index}-${line}`}>{line}</li>
              ))}
              {csvErrors.length > MAX_CSV_ERRORS_SHOWN ? (
                <li>…và {csvErrors.length - MAX_CSV_ERRORS_SHOWN} lỗi khác.</li>
              ) : null}
            </ul>
          ) : null}
        </Card>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {ROW_FILTERS.map((f) => (
          <Button
            key={f.value || "all"}
            type="button"
            size="sm"
            variant={rowFilter === f.value ? "primary" : "outline"}
            onClick={() => setRowFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {hasExecuted && rowFilter === "FAILED" ? (
        <Card className="mb-4 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<HiOutlineArrowDownTray className="size-4" />}
              disabled={busy || rowList.length === 0}
              onClick={downloadFailedRowsCsv}
            >
              Tải CSV dữ liệu gửi lỗi
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadCsv(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<HiOutlineArrowUpTray className="size-4" />}
              disabled={busy || !canReconcileCsv}
              onClick={() => fileRef.current?.click()}
            >
              Upload CSV dữ liệu đã sửa lỗi
            </Button>
            <Button
              type="button"
              size="sm"
              icon={<HiArrowPath className="size-4" />}
              disabled={busy || !canResend}
              onClick={() => void openPreflight()}
            >
              Gửi lại tin bị lỗi
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Sửa nhanh từng dòng bằng nút “Sửa” rồi bấm “Gửi lại tin bị lỗi”, hoặc upload CSV dữ liệu đã sửa lỗi (giữ
            nguyên cột <code>row_id</code>) để sửa hàng loạt.
          </p>
        </Card>
      ) : null}

      {lr ? <PageLoading /> : null}
      {er && !rows ? <PageError message={er} onRetry={() => void refetchRows()} /> : null}

      {!lr && rowList.length === 0 ? (
        <PageEmpty
          title="Chưa có dữ liệu"
          description="Tải CSV mẫu, điền danh sách người nhận và upload lên chiến dịch."
        />
      ) : null}

      {rowList.length > 0 ? (
        <SimpleTable
          rows={pagedRows}
          getRowKey={(r) => r.id}
          columns={[
            { key: "phone", header: "Phone", cell: (r) => r.phoneNumber ?? "—" },
            ...placeholderKeys.map((key) => ({
              key: `ph-${key}`,
              header: key,
              cell: (r: CampaignDataRow) => {
                const v = r.payloadData?.[key];
                return v == null ? "—" : String(v);
              },
            })),
            {
              key: "status",
              header: "Trạng thái",
              cell: (r) => (r.status ? <EntityStatusBadge value={r.status} kind="campaignRow" /> : "—"),
            },
            {
              key: "fail",
              header: "Lý do / log",
              cell: (r) => {
                const reason = campaignRowReason(r);
                if (!reason) return "—";
                const toneClass =
                  reason.tone === "danger"
                    ? "text-danger"
                    : reason.tone === "warning"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground";
                return (
                  <span className={`text-xs ${toneClass}`} title={reason.detail ?? undefined}>
                    {reason.text}
                  </span>
                );
              },
            },
            {
              key: "actions",
              header: "",
              cell: (r) => (
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setEditRow(r)}
                  >
                    Sửa
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-danger"
                    disabled={busy}
                    onClick={() => void deleteRow(r.id)}
                  >
                    Xóa
                  </Button>
                </div>
              ),
            },
          ]}
        />
      ) : null}

      {rowList.length > 0 ? (
        <TablePagination
          page={rowsPage}
          totalPages={rowsTotalPages}
          total={rowsTotal}
          pageSize={rowsPageSize}
          onPageChange={setRowsPage}
          unitLabel="dòng"
          ariaLabel="Phân trang dòng dữ liệu chiến dịch"
        />
      ) : null}

      <CampaignPreflightModal
        open={preflightOpen}
        workspaceId={workspaceId}
        data={preflightData}
        busy={busy}
        onClose={() => setPreflightOpen(false)}
        onConfirm={() => void executeCampaign()}
      />

      {editRow ? (
        <CampaignRowEditModal
          key={editRow.id}
          open={Boolean(editRow)}
          placeholderKeys={placeholderKeys}
          initialPhone={editRow.phoneNumber ?? ""}
          initialPayload={payloadToStringMap(editRow.payloadData)}
          busy={busy}
          onClose={() => setEditRow(null)}
          onSave={(phone, payload) => void saveRowEdit(phone, payload)}
        />
      ) : null}
    </div>
  );
}
