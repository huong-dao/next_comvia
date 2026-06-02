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
import { PageHeader } from "@/components/app/page-header";
import { PageEmpty, PageError, PageLoading } from "@/components/app/page-state";
import { CampaignPreflightModal, type CampaignPreflightData } from "@/components/campaign/campaign-preflight-modal";
import { CampaignRowEditModal } from "@/components/campaign/campaign-row-edit-modal";
import { isWorkspaceOwner, useWorkspaceContext } from "@/components/workspace/workspace-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SimpleTable } from "@/components/ui/simple-table";
import { formatComviaError } from "@/lib/api-message";
import {
  campaignRowFailureText,
  payloadToStringMap,
  type CampaignDataRow,
} from "@/lib/campaign-row-display";
import { comviaDownloadBlob } from "@/lib/comvia-download";
import { ComviaApiError, comviaFetch, comviaMultipartFetch } from "@/lib/comviaFetch";
import { getAccessToken, getStoredUser } from "@/lib/auth";
import { workspacePath } from "@/lib/paths";
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
  unitPriceAtCreate?: number | string | null;
  rowCount?: number;
  totalData?: number;
};

type WalletBalance = { balance?: string };

type OaStatus = { status?: string; oaName?: string };

type MessagePricingConfig = { defaultMessageUnitPrice?: number | string };

const ROW_FILTERS = [
  { value: "", label: "Tất cả" },
  { value: "PENDING", label: "Chờ gửi" },
  { value: "SUCCESS", label: "Thành công" },
  { value: "FAILED", label: "Thất bại" },
  { value: "SKIPPED", label: "Bỏ qua" },
] as const;

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [preflightData, setPreflightData] = useState<CampaignPreflightData | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
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

  const rowList = useMemo(() => rows ?? [], [rows]);
  const placeholderKeys = useMemo(
    () => Object.keys(campaign?.template?.placeholdersJson ?? {}),
    [campaign?.template?.placeholdersJson],
  );

  const hasExecuted = Boolean(campaign?.lastRunAt);
  const canImportCsv = !hasExecuted;
  const statusUpper = (campaign?.status ?? "").toUpperCase();
  const canExecute =
    rowList.length > 0 && !["RUNNING", "CANCELLED"].includes(statusUpper);

  const failedSelectable = useMemo(
    () => rowList.filter((r) => (r.status ?? "").toUpperCase() === "FAILED"),
    [rowList],
  );

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFailed() {
    setSelectedIds(new Set(failedSelectable.map((r) => r.id)));
  }

  async function downloadCsvTemplate() {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      const slug = (campaign?.name ?? "campaign").replace(/[^\w\-]+/g, "_").slice(0, 40);
      await comviaDownloadBlob(
        `/workspaces/${workspaceId}/campaigns/${campaignId}/csv-template`,
        { token, fallbackFilename: `${slug}-mau.csv` },
      );
    } catch (e) {
      setMsg(formatComviaError(e, "Không tải được file CSV mẫu."));
    } finally {
      setBusy(false);
    }
  }

  async function uploadCsv(file: File) {
    const token = getAccessToken();
    if (!token) return;
    const fd = new FormData();
    fd.append("file", file);
    setBusy(true);
    setMsg(null);
    try {
      await comviaMultipartFetch(`/workspaces/${workspaceId}/campaigns/${campaignId}/import-csv`, {
        token,
        formData: fd,
      });
      setMsg("Đã import CSV — danh sách đã được thay thế.");
      setSelectedIds(new Set());
      void refetchCampaign();
      void refetchRows();
    } catch (e) {
      setMsg(formatComviaError(e, "Import CSV thất bại."));
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
      const oa = oaRes ?? {};
      const wallet = walletRes ?? {};

      const fromCampaign = Number(campaign.rowCount ?? campaign.totalData ?? 0);
      const count =
        Number.isFinite(fromCampaign) && fromCampaign > 0
          ? fromCampaign
          : rowFilter
            ? rowList.length
            : rowList.length;

      setPreflightData({
        templateName: campaign.template?.name ?? campaign.template?.code,
        templateStatus: campaign.template?.status,
        oaStatus: oa.status,
        oaName: oa.oaName,
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
    try {
      await comviaFetch(`/workspaces/${workspaceId}/campaigns/${campaignId}/execute`, {
        method: "POST",
        token,
      });
      setMsg("Đã bắt đầu gửi chiến dịch.");
      setPreflightOpen(false);
      setSelectedIds(new Set());
      void refetchCampaign();
      void refetchRows();
    } catch (e) {
      setMsg(formatComviaError(e, "Không thực hiện được gửi chiến dịch."));
    } finally {
      setBusy(false);
    }
  }

  async function retrySelected() {
    const token = getAccessToken();
    if (!token) return;
    const rowIds = [...selectedIds];
    if (rowIds.length === 0) {
      setMsg("Chọn ít nhất một dòng thất bại để gửi lại.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await comviaFetch(`/workspaces/${workspaceId}/campaigns/${campaignId}/retry`, {
        method: "POST",
        token,
        body: JSON.stringify({ rowIds }),
      });
      setMsg(`Đã gửi lại ${rowIds.length} dòng.`);
      setSelectedIds(new Set());
      void refetchCampaign();
      void refetchRows();
    } catch (e) {
      setMsg(formatComviaError(e, "Gửi lại thất bại."));
    } finally {
      setBusy(false);
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
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(rowId);
        return next;
      });
      void refetchCampaign();
      void refetchRows();
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
    } catch (e) {
      setMsg(formatComviaError(e, "Không lưu được dòng."));
    } finally {
      setBusy(false);
    }
  }

  async function patchCampaignName() {
    const token = getAccessToken();
    if (!token || !campaign) return;
    const next = renameValue.trim();
    if (!next) return;
    setBusy(true);
    setMsg(null);
    try {
      await comviaFetch(`/workspaces/${workspaceId}/campaigns/${campaignId}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ name: next }),
      });
      setRenameOpen(false);
      void refetchCampaign();
    } catch (e) {
      setMsg(e instanceof ComviaApiError ? e.message : "Không đổi tên được.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCampaign() {
    const token = getAccessToken();
    if (!token) return;
    if (!window.confirm("Xóa hoặc hủy chiến dịch này?")) return;
    setBusy(true);
    try {
      await comviaFetch(`/workspaces/${workspaceId}/campaigns/${campaignId}`, {
        method: "DELETE",
        token,
      });
      window.location.href = workspacePath(workspaceId, "campaigns");
    } catch (e) {
      setMsg(formatComviaError(e, "Không xóa được chiến dịch."));
      setBusy(false);
    }
  }

  if (lc) return <PageLoading />;
  if (ec && !campaign) return <PageError message={ec} onRetry={() => void refetchCampaign()} />;
  if (!campaign) return null;

  return (
    <div>
      <PageHeader
        title={campaign.name ?? campaign.id}
        description={
          campaign.template?.name
            ? `Mẫu: ${campaign.template.name}${campaign.template.code ? ` (${campaign.template.code})` : ""}`
            : undefined
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {campaign.status ? <EntityStatusBadge value={campaign.status} /> : null}
            <Button icon={<HiArrowLeft className="size-4" />} variant="outline" asChild size="sm">
              <Link href={workspacePath(workspaceId, "campaigns")}>Danh sách</Link>
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="space-y-1 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gửi gần nhất</p>
          <p className="font-medium">
            {campaign.lastRunAt ? new Date(campaign.lastRunAt).toLocaleString() : "Chưa gửi"}
          </p>
        </Card>
        <Card className="space-y-1 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Số dòng dữ liệu</p>
          <p className="font-medium tabular-nums">
            {campaign.rowCount ?? campaign.totalData ?? rowList.length}
          </p>
        </Card>
        <Card className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<HiOutlinePencilSquare className="size-4" />}
            disabled={busy}
            onClick={() => {
              setRenameValue(campaign.name ?? "");
              setRenameOpen(true);
            }}
          >
            Đổi tên
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<HiOutlineTrash className="size-4" />}
            disabled={busy}
            onClick={() => void deleteCampaign()}
          >
            Xóa / Hủy
          </Button>
        </Card>
      </div>

      <Card className="mb-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CSV & gửi tin</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            icon={<HiOutlineArrowDownTray className="size-4" />}
            disabled={busy}
            onClick={() => void downloadCsvTemplate()}
          >
            Tải CSV mẫu
          </Button>
          {canImportCsv ? (
            <>
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
            </>
          ) : (
            <p className="text-xs text-muted-foreground self-center">
              Đã gửi ít nhất một lần — không thể upload thay toàn bộ. Tạo chiến dịch mới để thêm data.
            </p>
          )}
          <Button
            type="button"
            icon={<HiOutlinePlay className="size-4" />}
            disabled={busy || !canExecute}
            onClick={() => void openPreflight()}
          >
            Thực hiện gửi (Execute)
          </Button>
          {failedSelectable.length > 0 ? (
            <Button
              type="button"
              variant="accent"
              icon={<HiArrowPath className="size-4" />}
              disabled={busy || selectedIds.size === 0}
              onClick={() => void retrySelected()}
            >
              Gửi lại đã chọn ({selectedIds.size})
            </Button>
          ) : null}
        </div>
        {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {ROW_FILTERS.map((f) => (
            <Button
              key={f.value || "all"}
              type="button"
              size="sm"
              variant={rowFilter === f.value ? "primary" : "outline"}
              onClick={() => {
                setRowFilter(f.value);
                setSelectedIds(new Set());
              }}
            >
              {f.label}
            </Button>
          ))}
        </div>
        {failedSelectable.length > 0 ? (
          <Button type="button" size="sm" variant="ghost" onClick={selectAllFailed}>
            Chọn tất cả thất bại
          </Button>
        ) : null}
      </div>

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
          rows={rowList}
          getRowKey={(r) => r.id}
          columns={[
            {
              key: "sel",
              header: "",
              cell: (r) => {
                const failed = (r.status ?? "").toUpperCase() === "FAILED";
                if (!failed) return null;
                return (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(r.id)}
                    onChange={() => toggleSelect(r.id)}
                    aria-label="Chọn gửi lại"
                  />
                );
              },
            },
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
              cell: (r) => (r.status ? <EntityStatusBadge value={r.status} /> : "—"),
            },
            {
              key: "fail",
              header: "Lý do / log",
              cell: (r) => {
                const text = campaignRowFailureText(r);
                return text ? <span className="text-xs text-danger">{text}</span> : "—";
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

      <Modal
        open={renameOpen}
        title="Đổi tên chiến dịch"
        onClose={() => setRenameOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>
              Hủy
            </Button>
            <Button disabled={busy} onClick={() => void patchCampaignName()}>
              Lưu
            </Button>
          </>
        }
      >
        <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
      </Modal>

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
