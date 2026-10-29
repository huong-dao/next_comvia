"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { HiMiniPlus, HiOutlineDocumentText } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Modal } from "@/components/ui/modal";
import { PageError, PageLoading } from "@/components/app/page-state";
import { SimpleTable } from "@/components/ui/simple-table";
import { TemplateForm } from "@/components/template/template-form";
import { TemplateEditForm } from "@/components/template/template-edit-form";
import { useToast } from "@/components/ui/toast";
import { comviaFetch } from "@/lib/comviaFetch";
import { TEMPLATE_STATUS_LABELS } from "@/lib/status-labels";
import { useComviaQuery } from "@/lib/use-comvia-query";
import { formatDate } from "@/lib/utils";

/**
 * Một dòng template — `GET /workspaces/:id/templates` (§7.2). Shape lấy theo
 * `app/app/w/[workspaceId]/templates/page.tsx` (nguồn thật đang dùng). §7.2 KHÔNG
 * tài liệu hóa "Danh mục" (category) → cột Danh mục render phòng thủ "—" (xem ghi chú ở cột).
 */
type TemplateRow = {
  id: string;
  name?: string;
  code?: string;
  status?: string;
  updatedAt?: string;
};

/** Số dòng hiển thị rút gọn trên dashboard. */
const PREVIEW_LIMIT = 5;

const STATUS_FILTERS = [
  { value: "ALL", label: "Tất cả" },
  { value: "DRAFT", label: "Bản nháp" },
  { value: "SUBMITTED", label: "Đã gửi" },
  { value: "PENDING_ZALO_APPROVAL", label: "Đang chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "DISABLED", label: "Đã khóa" },
] as const;

/**
 * Box phải của section OA trên dashboard (TICKET-014, hình 2):
 * danh sách mẫu tin rút gọn + "Tạo mẫu tin" (popup dùng TemplateForm).
 * Tạo xong refetch danh sách. Component tự lấy `workspaceId` (useParams) để
 * dashboard page sửa tối thiểu (pattern giống WalletSection/OaInfoBox).
 */
export function DashboardTemplateList({ className }: { className?: string }) {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { showToast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]["value"]>("ALL");

  const fetcher = useCallback(
    (token: string) => comviaFetch<TemplateRow[]>(`/workspaces/${workspaceId}/templates`, { token }),
    [workspaceId],
  );
  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId), fetcher);

  const rows = useMemo(() => {
    const matching = filter === "ALL"
      ? data ?? []
      : (data ?? []).filter((template) => (template.status ?? "").toUpperCase() === filter);
    return matching.slice(0, PREVIEW_LIMIT);
  }, [data, filter]);

  function handleCreated(_: TemplateRow, { submitted }: { submitted: boolean }) {
    if (submitted) setCreateOpen(false);
    showToast({ type: "success", message: submitted ? "Đã gửi mẫu tin để Staff xử lý." : "Đã lưu mẫu tin." });
    void refetch();
  }

  function handleSaved() {
    setEditingTemplateId(null);
    showToast({ type: "success", message: "Đã cập nhật mẫu tin." });
    void refetch();
  }

  return (
    <Card className={className}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <HiOutlineDocumentText className="size-5 text-primary" aria-hidden />
          Danh sách mẫu tin ZBS
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" icon={<HiMiniPlus className="size-4" />} onClick={() => setCreateOpen(true)}>
            Tạo mẫu tin
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={filter === item.value ? "primary" : "outline"}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        {loading && !data ? (
          <PageLoading message="Đang tải mẫu tin…" />
        ) : error && !data ? (
          <PageError message={error} onRetry={() => void refetch()} />
        ) : (
          <SimpleTable
            rows={rows}
            getRowKey={(r) => r.id}
            emptyMessage="Chưa có mẫu tin nào"
            columns={[
              {
                key: "index",
                header: "#",
                className: "w-10 text-muted-foreground",
                cell: (r) => <span className="tabular-nums">{rows.indexOf(r) + 1}</span>,
              },
              {
                key: "name",
                header: "Tên mẫu tin",
                cell: (r) => (
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => setEditingTemplateId(r.id)}
                  >
                    {r.name ?? r.id}
                  </button>
                ),
              },
              {
                key: "code",
                header: "Mã mẫu tin",
                cell: (r) => <span className="font-mono text-xs">{r.code ?? "—"}</span>,
              },
              {
                key: "category",
                header: "Danh mục",
                // §7.2 không có field "Danh mục" (category) → render phòng thủ "—" (ghi lại cho TL/BE).
                cell: () => "—",
              },
              {
                key: "status",
                header: "Trạng thái",
                cell: (r) =>
                  r.status ? (
                    <EntityStatusBadge value={r.status} label={TEMPLATE_STATUS_LABELS[r.status.toUpperCase()]} />
                  ) : (
                    "—"
                  ),
              },
              {
                key: "updated",
                header: "Cập nhật",
                cell: (r) => (r.updatedAt ? formatDate(r.updatedAt) : "—"),
              },
            ]}
          />
        )}
      </div>

      <Modal size="full" open={createOpen} title="Tạo mẫu tin" onClose={() => setCreateOpen(false)}>
        <TemplateForm workspaceId={workspaceId} onCreated={handleCreated} />
      </Modal>
      <Modal size="full" open={Boolean(editingTemplateId)} title="Chỉnh sửa mẫu tin" onClose={() => setEditingTemplateId(null)}>
        {editingTemplateId ? <TemplateEditForm workspaceId={workspaceId} templateId={editingTemplateId} onSaved={handleSaved} /> : null}
      </Modal>
    </Card>
  );
}
