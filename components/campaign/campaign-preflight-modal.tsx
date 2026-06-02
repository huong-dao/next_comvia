"use client";

import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { estimateCampaignCostVnd, resolveUnitPriceVnd } from "@/lib/campaign-pricing";
import { workspacePath } from "@/lib/paths";
import { formatVND } from "@/lib/utils";

export type CampaignPreflightData = {
  templateName?: string;
  templateStatus?: string;
  oaStatus?: string;
  oaName?: string;
  rowCount: number;
  campaignUnitPrice?: number | string | null;
  templateUnitPrice?: number | string | null;
  defaultUnitPrice?: number | string | null;
  walletBalance?: number | string | null;
  isWorkspaceOwner: boolean;
};

export function CampaignPreflightModal({
  open,
  workspaceId,
  data,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  workspaceId: string;
  data: CampaignPreflightData | null;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!data) return null;

  const unitPrice = resolveUnitPriceVnd({
    campaignUnitPrice: data.campaignUnitPrice,
    templateUnitPrice: data.templateUnitPrice,
    defaultUnitPrice: data.defaultUnitPrice,
  });
  const total = estimateCampaignCostVnd(unitPrice, data.rowCount);
  const balance =
    data.walletBalance != null && data.walletBalance !== ""
      ? Number(data.walletBalance)
      : null;
  const balanceOk = balance != null && Number.isFinite(balance);
  const sufficient = total != null && balanceOk ? balance >= total : null;
  const oaConnected = (data.oaStatus ?? "").toUpperCase() === "CONNECTED";
  const templateApproved = (data.templateStatus ?? "").toUpperCase() === "APPROVED";

  const canRun =
    data.rowCount > 0 &&
    oaConnected &&
    templateApproved &&
    (sufficient === true || sufficient === null);

  return (
    <Modal
      open={open}
      title="Xác nhận gửi chiến dịch"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button type="button" disabled={busy || !canRun} onClick={onConfirm}>
            {busy ? "Đang gửi…" : "Gửi chiến dịch"}
          </Button>
        </>
      }
    >
      <dl className="grid gap-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Mẫu tin</dt>
          <dd className="text-right font-medium">{data.templateName ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Trạng thái mẫu</dt>
          <dd>
            {data.templateStatus ? <EntityStatusBadge value={data.templateStatus} /> : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Zalo OA</dt>
          <dd className="text-right">
            {data.oaName ? `${data.oaName} · ` : ""}
            {data.oaStatus ? <EntityStatusBadge value={data.oaStatus} /> : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Số dòng gửi</dt>
          <dd className="font-medium tabular-nums">{data.rowCount}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Đơn giá / tin</dt>
          <dd className="font-medium tabular-nums">
            {unitPrice != null ? formatVND(unitPrice) : "Giá mặc định hệ thống"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Tổng trừ ví Owner (ước tính)</dt>
          <dd className="font-semibold tabular-nums">
            {total != null ? formatVND(total) : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Số dư ví hiện tại</dt>
          <dd className="font-medium tabular-nums">
            {balanceOk ? formatVND(balance) : "—"}
          </dd>
        </div>
      </dl>

      {!data.isWorkspaceOwner ? (
        <p className="rounded-xl border border-border/70 bg-surface-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Chi phí sẽ trừ từ ví của <strong>Chủ workspace (Owner)</strong>. Bạn vẫn có thể thực hiện gửi nếu Owner đủ số dư.
        </p>
      ) : null}

      {data.rowCount === 0 ? (
        <p className="text-sm text-danger">Chưa có dữ liệu — hãy tải CSV mẫu, điền và upload trước khi gửi.</p>
      ) : null}
      {!oaConnected ? (
        <p className="text-sm text-danger">Zalo OA chưa kết nối — kết nối OA trước khi gửi.</p>
      ) : null}
      {!templateApproved ? (
        <p className="text-sm text-danger">Mẫu tin chưa được duyệt — không thể gửi chiến dịch.</p>
      ) : null}
      {sufficient === false ? (
        <p className="text-sm text-danger">
          Ví Owner không đủ số dư.{" "}
          <Link className="font-medium text-primary underline" href={workspacePath(workspaceId, "topup")}>
            Nạp thêm tiền
          </Link>
        </p>
      ) : null}
      {sufficient === true ? (
        <p className="text-sm text-muted-foreground">Đủ số dư — có thể bắt đầu gửi. Tin thất bại sẽ được hoàn tiền vào ví Owner.</p>
      ) : null}
    </Modal>
  );
}
