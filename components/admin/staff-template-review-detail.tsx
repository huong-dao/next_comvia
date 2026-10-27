"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  HiArrowLeft,
  HiOutlineBuildingOffice2,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineSquares2X2,
} from "react-icons/hi2";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Input, Textarea } from "@/components/ui/input";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";
import { ctaTypeLabel, type TemplateCtaButton } from "@/lib/template-cta";
import { useComviaQuery } from "@/lib/use-comvia-query";

type TemplateDetail = {
  id: string;
  name?: string;
  code?: string;
  content?: string;
  placeholdersJson?: Record<string, unknown>;
  ctaButtons?: TemplateCtaButton[];
  providerTemplateId?: string | null;
  status?: string;
  requiresOwnerRevision?: boolean;
  revisionReason?: string | null;
  returnedForRevisionAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  workspace?: {
    id?: string;
    name?: string;
    slug?: string;
    status?: string;
    ownerUserId?: string;
  };
  oaConnection?: {
    id?: string;
    oaId?: string;
    oaName?: string;
    status?: string;
    tokenExpiredAt?: string;
    connectedAt?: string;
  };
  submissions?: Array<{
    id?: string;
    status?: string;
    providerResponse?: unknown;
    reason?: string | null;
    createdAt?: string;
  }>;
};

const detailTabs = [
  { key: "overview", label: "Tổng quan", icon: HiOutlineSquares2X2, suffix: "" },
  { key: "workspace", label: "Thông tin workspace", icon: HiOutlineBuildingOffice2, suffix: "/workspace" },
  { key: "oa", label: "Thông tin OA", icon: HiOutlineBuildingOffice2, suffix: "/oa" },
] as const;

export function StaffTemplateReviewDetail({
  templateId,
  section = "overview",
}: {
  templateId: string;
  section?: "overview" | "workspace" | "oa";
}) {
  const [providerId, setProviderId] = useState("");
  const [revisionReason, setRevisionReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetcher = useCallback(
    (token: string) => comviaFetch<TemplateDetail>(`/internal/templates/${templateId}`, { token }),
    [templateId],
  );
  const { data: template, loading, error, refetch } = useComviaQuery(Boolean(templateId), fetcher);

  async function updateStatus(
    path: string,
    successMessage: string,
    body?: Record<string, unknown>,
  ) {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setMsg(null);
    try {
      await comviaFetch(path, {
        method: "POST",
        token,
        body: body ? JSON.stringify(body) : undefined,
      });
      setMsg(successMessage);
      void refetch();
    } catch (e) {
      setMsg(e instanceof ComviaApiError ? e.message : "Cập nhật trạng thái thất bại.");
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!providerId.trim()) {
      setMsg("Nhập Provider template ID do Zalo cấp trước khi duyệt.");
      return;
    }
    await updateStatus(`/internal/templates/${templateId}/approve`, "Đã chuyển sang approved.", {
      providerTemplateId: providerId.trim(),
    });
  }

  async function returnToOwner() {
    if (!revisionReason.trim()) {
      setMsg("Nhập lý do để Owner chỉnh sửa mẫu tin.");
      return;
    }
    await updateStatus(`/internal/templates/${templateId}/return-to-submitted`, "Đã trả mẫu tin về Owner để chỉnh sửa.", {
      reason: revisionReason.trim(),
    });
  }

  if (loading) return <PageLoading message="Đang tải chi tiết template…" />;
  if (error && !template) return <PageError message={error} onRetry={() => void refetch()} />;
  if (!template) return null;

  const baseHref = `/staff/templates-review/${templateId}`;
  const status = (template.status ?? "").toUpperCase();
  const requiresOwnerRevision = Boolean(template.requiresOwnerRevision);
  const canSendToZalo = status === "SUBMITTED" && !requiresOwnerRevision;
  const canApprove = status === "PENDING_ZALO_APPROVAL";
  const ctaButtons = [...(template.ctaButtons ?? [])].sort((a, b) => a.position - b.position);

  return (
    <div>
      <PageHeader
        eyebrow="Staff"
        title="Chi tiết duyệt mẫu tin"
        // description="Dùng `GET /internal/templates/:templateId` để xem nội dung, workspace, OA và cập nhật trạng thái nội bộ."
        actions={
          <Button variant="outline" size="sm" asChild icon={<HiArrowLeft className="size-4" />}>
            <Link href="/staff/templates-review/submitted">Về danh sách mẫu tin</Link>
          </Button>
        }
      />

      <Card className="mb-6 space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-semibold text-foreground">{template.name ?? template.code ?? template.id}</p>
          {template.status ? <EntityStatusBadge value={template.status} /> : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Template ID</p>
            <p className="mt-1 font-mono text-sm text-foreground">{template.id}</p>
          </div> */}
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Mã mẫu tin</p>
            <p className="mt-1 text-sm text-foreground">{template.code ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Ngày tạo</p>
            <p className="mt-1 text-sm text-foreground">{template.createdAt ? new Date(template.createdAt).toLocaleString() : "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Ngày cập nhật</p>
            <p className="mt-1 text-sm text-foreground">{template.updatedAt ? new Date(template.updatedAt).toLocaleString() : "—"}</p>
          </div>
        </div>
      </Card>

      {requiresOwnerRevision ? (
        <Card className="mb-6 border-border bg-surface-muted/60 p-4">
          <p className="font-semibold text-foreground">Đã trả Owner chỉnh sửa</p>
          <p className="mt-1 text-sm text-muted-foreground">{template.revisionReason || "Chờ Owner cập nhật mẫu tin theo yêu cầu từ Zalo."}</p>
          {template.returnedForRevisionAt ? <p className="mt-1 text-xs text-muted-foreground">Trả về lúc {new Date(template.returnedForRevisionAt).toLocaleString("vi-VN")}</p> : null}
        </Card>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-2">
        {detailTabs.map((tab) => (
          <Button
            key={tab.key}
            size="sm"
            variant={section === tab.key ? "secondary" : "outline"}
            asChild
            icon={<tab.icon className="size-4" />}
          >
            <Link href={`${baseHref}${tab.suffix}`}>{tab.label}</Link>
          </Button>
        ))}
      </div>

      {section === "overview" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
          <div className="space-y-6">
            <Card className="space-y-3 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Nội dung mẫu tin</p>
              <pre className="max-h-[360px] overflow-auto rounded-xl bg-surface-muted p-4 text-xs whitespace-pre-wrap">
                {template.content ?? "Không có nội dung"}
              </pre>
            </Card>

            <Card className="space-y-3 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Placeholders</p>
              <pre className="max-h-[220px] overflow-auto rounded-xl bg-surface-muted p-4 text-xs whitespace-pre-wrap">
                {JSON.stringify(template.placeholdersJson ?? {}, null, 2)}
              </pre>
            </Card>

            <Card className="space-y-3 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Nút CTA</p>
              {ctaButtons.length ? (
                <div className="space-y-2">
                  {ctaButtons.map((button, index) => (
                    <div key={button.id ?? `${button.position}-${index}`} className="rounded-xl border border-border/70 bg-surface-muted/50 p-3 text-sm">
                      <p className="font-medium text-foreground">{button.label || ctaTypeLabel(button.type)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Loại: {ctaTypeLabel(button.type)}</p>
                      <p className="mt-1 break-all text-xs text-muted-foreground">Đích đến: {button.target || "—"}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Mẫu tin không có nút CTA.</p>
              )}
            </Card>

            <Card className="space-y-3 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Lịch sử trạng thái</p>
              {template.submissions?.length ? (
                <div className="space-y-2">
                  {template.submissions.map((submission, index) => (
                    <div key={submission.id ?? `${index}`} className="rounded-xl border border-border/70 bg-surface-muted/50 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {submission.status ? <EntityStatusBadge value={submission.status} /> : null}
                        <span className="text-xs text-muted-foreground">
                          {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : "—"}
                        </span>
                      </div>
                      {submission.reason ? <p className="mt-2 text-sm text-foreground">{submission.reason}</p> : null}
                      {submission.providerResponse ? (
                        <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-card p-3 text-xs whitespace-pre-wrap">
                          {JSON.stringify(submission.providerResponse, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Chưa có lịch sử submit.</p>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="space-y-4 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Cập nhật trạng thái nội bộ</p>
              {canApprove ? (
                <>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Provider template ID (Zalo đã duyệt)</label>
                    <Input className="mt-1" value={providerId} onChange={(e) => setProviderId(e.target.value)} placeholder="ZALO_TPL_..." />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Lý do trả Owner chỉnh sửa</label>
                    <Textarea className="mt-1" rows={3} value={revisionReason} onChange={(e) => setRevisionReason(e.target.value)} placeholder="Nêu yêu cầu điều chỉnh từ Zalo" />
                  </div>
                </>
              ) : null}
              {template.providerTemplateId ? (
                <p className="text-sm text-muted-foreground">
                  Provider template ID hiện tại: <span className="font-mono">{template.providerTemplateId}</span>
                </p>
              ) : null}
              {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
              <div className="grid gap-2 sm:grid-cols-2">
                {canSendToZalo ? (
                  <Button
                    type="button"
                    variant="accent"
                    disabled={busy}
                    onClick={() => void updateStatus(`/internal/templates/${templateId}/mark-pending-zalo-approval`, "Đã gửi mẫu tin để Zalo duyệt.")}
                    icon={<HiOutlineClock className="size-4" />}
                  >
                    Gửi duyệt Zalo
                  </Button>
                ) : null}
                {canApprove ? (
                  <>
                    <Button type="button" variant="outline" disabled={busy} onClick={() => void returnToOwner()} icon={<HiArrowLeft className="size-4" />}>
                      Trả Owner chỉnh sửa
                    </Button>
                    <Button type="button" disabled={busy} onClick={() => void approve()} icon={<HiOutlineCheckCircle className="size-4" />}>
                      Zalo đã duyệt
                    </Button>
                  </>
                ) : null}
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {section === "workspace" ? (
        <Card className="space-y-4 p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Thông tin workspace</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Workspace ID</p>
              <p className="mt-1 font-mono text-sm text-foreground">{template.workspace?.id ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Owner User ID</p>
              <p className="mt-1 font-mono text-sm text-foreground">{template.workspace?.ownerUserId ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Tên</p>
              <p className="mt-1 text-sm text-foreground">{template.workspace?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Slug</p>
              <p className="mt-1 text-sm text-foreground">{template.workspace?.slug ?? "—"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Trạng thái</p>
              <div className="mt-1">{template.workspace?.status ? <EntityStatusBadge value={template.workspace.status} /> : "—"}</div>
            </div>
          </div>
        </Card>
      ) : null}

      {section === "oa" ? (
        <Card className="space-y-4 p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Thông tin OA</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">OA Connection ID</p>
              <p className="mt-1 font-mono text-sm text-foreground">{template.oaConnection?.id ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">OA ID</p>
              <p className="mt-1 font-mono text-sm text-foreground">{template.oaConnection?.oaId ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Tên OA</p>
              <p className="mt-1 text-sm text-foreground">{template.oaConnection?.oaName ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Trạng thái</p>
              <div className="mt-1">{template.oaConnection?.status ? <EntityStatusBadge value={template.oaConnection.status} /> : "—"}</div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Connected At</p>
              <p className="mt-1 text-sm text-foreground">
                {template.oaConnection?.connectedAt ? new Date(template.oaConnection.connectedAt).toLocaleString() : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Token Expired At</p>
              <p className="mt-1 text-sm text-foreground">
                {template.oaConnection?.tokenExpiredAt ? new Date(template.oaConnection.tokenExpiredAt).toLocaleString() : "—"}
              </p>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
