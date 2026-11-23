"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HiMiniPlus, HiOutlinePencilSquare } from "react-icons/hi2";
import { FilterCard, FilterField } from "@/components/app/filter-card";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { SubscriptionEditModal } from "@/components/admin/subscription-edit-modal";
import { SubscriptionGrantModal } from "@/components/admin/subscription-grant-modal";
import { Button } from "@/components/ui/button";
import { useAlertModal } from "@/components/ui/alert-modal";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Input, Select } from "@/components/ui/input";
import { SimpleTable } from "@/components/ui/simple-table";
import { TablePagination } from "@/components/ui/table-pagination";
import { comviaFetch } from "@/lib/comviaFetch";
import {
  SOURCE_LABELS,
  formatDateTime,
  type AdminSubscription,
  type Paginated,
  type SubscriptionState,
} from "@/lib/subscription";
import { planOptionLabel, useAdminPlans } from "@/lib/use-admin-plans";
import { useComviaQuery } from "@/lib/use-comvia-query";

const PAGE_SIZE = 30;

const STATE_OPTIONS: Array<{ value: SubscriptionState; label: string }> = [
  { value: "ACTIVE", label: "Đang hiệu lực" },
  { value: "UPCOMING", label: "Chưa bắt đầu" },
  { value: "EXPIRED", label: "Đã hết hạn" },
  { value: "CANCELLED", label: "Đã thu hồi" },
];

type Filters = { keyword: string; planId: string; state: string; endsAtFrom: string; endsAtTo: string };
const emptyFilters = (): Filters => ({ keyword: "", planId: "", state: "", endsAtFrom: "", endsAtTo: "" });

/** `<input type="date">` (yyyy-mm-dd, giờ máy) → ISO đầu ngày / cuối ngày để lọc theo `endsAt`. */
function dayBoundIso(value: string, bound: "start" | "end"): string | null {
  if (!value) return null;
  const d = new Date(`${value}T${bound === "start" ? "00:00:00.000" : "23:59:59.999"}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function AdminSubscriptionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showAlert } = useAlertModal();
  /** Lọc theo một workspace (đi từ danh sách workspace); đặt qua URL để chia sẻ/quay lại được. */
  const workspaceId = searchParams.get("workspaceId")?.trim() ?? "";

  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [editTarget, setEditTarget] = useState<AdminSubscription | null>(null);
  const [granting, setGranting] = useState(false);

  const { data: plans } = useAdminPlans();

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", String(PAGE_SIZE));
    if (workspaceId) p.set("workspaceId", workspaceId);
    if (applied.keyword.trim()) p.set("keyword", applied.keyword.trim());
    if (applied.planId) p.set("planId", applied.planId);
    if (applied.state) p.set("state", applied.state);
    const from = dayBoundIso(applied.endsAtFrom, "start");
    const to = dayBoundIso(applied.endsAtTo, "end");
    if (from) p.set("endsAtFrom", from);
    if (to) p.set("endsAtTo", to);
    return p.toString();
  }, [page, workspaceId, applied]);

  const fetcher = useCallback(
    (token: string) => comviaFetch<Paginated<AdminSubscription>>(`/admin/subscriptions?${qs}`, { token }),
    [qs],
  );
  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);
  const rows = data?.data ?? [];
  const meta = data?.meta;

  const filteredWorkspaceName = workspaceId ? rows.find((r) => r.workspace.id === workspaceId)?.workspace.name : undefined;

  function handleGranted(result: AdminSubscription) {
    setGranting(false);
    showAlert({
      type: "success",
      title: "Đã cấp gói",
      message: `${result.plan.name} cho ${result.workspace.name ?? result.workspace.id}: ${formatDateTime(result.startsAt)} – ${formatDateTime(result.endsAt)}.`,
    });
    void refetch();
  }

  function handleSaved(result: AdminSubscription) {
    setEditTarget(null);
    showAlert({
      type: "success",
      message: `Đã lưu kỳ ${result.plan.name} của ${result.workspace.name ?? result.workspace.id}.`,
    });
    void refetch();
  }

  return (
    <AdminRoleGate>
      {loading && !data ? <PageLoading /> : null}
      {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}
      {data ? (
        <div>
          <PageHeader
            title="Subscriptions"
            description="Các kỳ subscription của mọi workspace. Workspace chưa có gói còn hạn sẽ không gửi được tin — cấp tay tại đây."
            actions={
              <Button icon={<HiMiniPlus className="size-4" />} onClick={() => setGranting(true)}>
                Cấp gói
              </Button>
            }
          />

          {workspaceId ? (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Đang lọc theo workspace:</span>
              <strong>{filteredWorkspaceName ?? workspaceId}</strong>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setPage(1);
                  router.replace("/admin/subscriptions");
                }}
              >
                Bỏ lọc
              </Button>
            </div>
          ) : null}

          <FilterCard
            onApply={() => {
              setApplied({ ...draft });
              setPage(1);
            }}
            onRefresh={() => void refetch()}
          >
            <FilterField label="Workspace hoặc email owner" htmlFor="subs-filter-keyword" className="grow">
              <Input
                id="subs-filter-keyword"
                value={draft.keyword}
                onChange={(e) => setDraft((d) => ({ ...d, keyword: e.target.value }))}
                placeholder="Tên/slug workspace hoặc email owner"
                className="max-w-md"
              />
            </FilterField>
            <FilterField label="Gói" htmlFor="subs-filter-plan">
              <Select
                id="subs-filter-plan"
                value={draft.planId}
                onChange={(e) => setDraft((d) => ({ ...d, planId: e.target.value }))}
                className="max-w-[220px]"
              >
                <option value="">Tất cả</option>
                {(plans?.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {planOptionLabel(p)}
                  </option>
                ))}
              </Select>
            </FilterField>
            <FilterField label="Trạng thái" htmlFor="subs-filter-state">
              <Select
                id="subs-filter-state"
                value={draft.state}
                onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))}
                className="max-w-[180px]"
              >
                <option value="">Tất cả</option>
                {STATE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </FilterField>
            <FilterField label="Hết hạn từ ngày" htmlFor="subs-filter-from">
              <Input
                id="subs-filter-from"
                type="date"
                value={draft.endsAtFrom}
                onChange={(e) => setDraft((d) => ({ ...d, endsAtFrom: e.target.value }))}
                className="max-w-[170px]"
              />
            </FilterField>
            <FilterField label="Hết hạn đến ngày" htmlFor="subs-filter-to">
              <Input
                id="subs-filter-to"
                type="date"
                value={draft.endsAtTo}
                onChange={(e) => setDraft((d) => ({ ...d, endsAtTo: e.target.value }))}
                className="max-w-[170px]"
              />
            </FilterField>
          </FilterCard>

          <SimpleTable
            rows={rows}
            getRowKey={(r) => r.id}
            emptyMessage="Chưa có kỳ subscription nào."
            columns={[
              {
                key: "ws",
                header: "Workspace",
                cell: (r) => (
                  <div>
                    <p className="font-medium">{r.workspace.name ?? r.workspace.id}</p>
                    <p className="text-xs text-muted-foreground">{r.workspace.owner?.email ?? "—"}</p>
                  </div>
                ),
              },
              {
                key: "plan",
                header: "Gói",
                cell: (r) => `${r.plan.name}${r.plan.durationYears ? ` · ${r.plan.durationYears} năm` : ""}`,
              },
              { key: "src", header: "Nguồn", cell: (r) => SOURCE_LABELS[r.source] ?? r.source },
              {
                key: "period",
                header: "Hiệu lực",
                cell: (r) => (
                  <div className="text-xs">
                    <p>{formatDateTime(r.startsAt)}</p>
                    <p className="text-muted-foreground">→ {formatDateTime(r.endsAt)}</p>
                  </div>
                ),
              },
              {
                key: "left",
                header: "Còn lại",
                cell: (r) => (r.state === "ACTIVE" ? `${r.daysRemaining} ngày` : "—"),
              },
              {
                key: "state",
                header: "Trạng thái",
                cell: (r) => <EntityStatusBadge value={r.state} kind="subscription" />,
              },
              { key: "order", header: "Đơn hàng", cell: (r) => r.order?.orderCode ?? "—" },
              {
                key: "note",
                header: "Ghi chú",
                cell: (r) =>
                  r.note ? <span className="block max-w-[200px] whitespace-pre-wrap break-words text-xs">{r.note}</span> : "—",
              },
              {
                key: "act",
                header: "",
                cell: (r) => (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<HiOutlinePencilSquare className="size-4" />}
                      onClick={() => setEditTarget(r)}
                    >
                      Sửa
                    </Button>
                  </div>
                ),
              },
            ]}
          />
          <TablePagination
            page={page}
            totalPages={meta?.totalPages ?? 0}
            total={meta?.total ?? 0}
            pageSize={meta?.limit ?? PAGE_SIZE}
            onPageChange={setPage}
            unitLabel="kỳ"
            ariaLabel="Phân trang danh sách subscription"
          />

          {editTarget ? (
            <SubscriptionEditModal
              key={editTarget.id}
              subscription={editTarget}
              onClose={() => setEditTarget(null)}
              onSaved={handleSaved}
            />
          ) : null}
          {granting ? (
            <SubscriptionGrantModal
              workspace={
                workspaceId ? { id: workspaceId, name: filteredWorkspaceName } : undefined
              }
              onClose={() => setGranting(false)}
              onGranted={handleGranted}
            />
          ) : null}
        </div>
      ) : null}
    </AdminRoleGate>
  );
}

/** `useSearchParams` cần Suspense boundary để build tĩnh không lỗi. */
export default function AdminSubscriptionsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminSubscriptionsContent />
    </Suspense>
  );
}
