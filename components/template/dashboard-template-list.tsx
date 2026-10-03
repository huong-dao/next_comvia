"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { HiMiniPlus, HiOutlineArrowRight, HiOutlineDocumentText } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Modal } from "@/components/ui/modal";
import { PageError, PageLoading } from "@/components/app/page-state";
import { SimpleTable } from "@/components/ui/simple-table";
import { TemplateForm } from "@/components/template/template-form";
import { useToast } from "@/components/ui/toast";
import { comviaFetch } from "@/lib/comviaFetch";
import { workspacePath } from "@/lib/paths";
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

/** Số dòng hiển thị rút gọn trên dashboard (xem đầy đủ qua "Xem tất cả"). */
const PREVIEW_LIMIT = 5;

/**
 * Box phải của section OA trên dashboard (TICKET-014, hình 2):
 * danh sách mẫu tin rút gọn + "Xem tất cả" + "Tạo mẫu tin" (popup dùng TemplateForm).
 * Tạo xong refetch danh sách. Component tự lấy `workspaceId` (useParams) để
 * dashboard page sửa tối thiểu (pattern giống WalletSection/OaInfoBox).
 */
export function DashboardTemplateList({ className }: { className?: string }) {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { showToast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);

  const fetcher = useCallback(
    (token: string) => comviaFetch<TemplateRow[]>(`/workspaces/${workspaceId}/templates`, { token }),
    [workspaceId],
  );
  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId), fetcher);

  const rows = useMemo(() => (data ?? []).slice(0, PREVIEW_LIMIT), [data]);

  function handleCreated() {
    setCreateOpen(false);
    showToast({ type: "success", message: "Đã tạo mẫu tin." });
    void refetch();
  }

  return (
    <Card className={className}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <HiOutlineDocumentText className="size-5 text-primary" aria-hidden />
          Danh sách mẫu tin ZBS Template
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" icon={<HiOutlineArrowRight className="size-4" />} asChild>
            <Link href={workspacePath(workspaceId, "templates")}>Xem tất cả</Link>
          </Button>
          <Button size="sm" icon={<HiMiniPlus className="size-4" />} onClick={() => setCreateOpen(true)}>
            Tạo mẫu tin
          </Button>
        </div>
      </div>

      <div className="mt-4">
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
                  <Link
                    className="font-medium text-primary hover:underline"
                    href={workspacePath(workspaceId, "templates", r.id)}
                  >
                    {r.name ?? r.id}
                  </Link>
                ),
              },
              {
                key: "code",
                header: "Mã template",
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
                cell: (r) => (r.status ? <EntityStatusBadge value={r.status} /> : "—"),
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

      <Modal open={createOpen} title="Tạo mẫu tin" onClose={() => setCreateOpen(false)}>
        <TemplateForm workspaceId={workspaceId} onCreated={handleCreated} />
      </Modal>
    </Card>
  );
}
