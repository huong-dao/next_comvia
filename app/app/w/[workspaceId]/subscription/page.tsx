"use client";

import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { HiOutlineShoppingCart } from "react-icons/hi2";
import { FilterCard, FilterField } from "@/components/app/filter-card";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { SubscriptionPurchaseModal } from "@/components/subscription/subscription-purchase-modal";
import { useSubscription } from "@/components/subscription/subscription-provider";
import { isWorkspaceOwner, useWorkspaceContext } from "@/components/workspace/workspace-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Input, Select } from "@/components/ui/input";
import { SimpleTable } from "@/components/ui/simple-table";
import { TablePagination } from "@/components/ui/table-pagination";
import { comviaFetch } from "@/lib/comviaFetch";
import {
  EXPIRING_SOON_DAYS,
  formatDateOnly,
  formatDateTime,
  workspaceHeader,
  type Paginated,
  type SubscriptionPlan,
  type SubscriptionPurchase,
} from "@/lib/subscription";
import { useComviaQuery } from "@/lib/use-comvia-query";
import { formatVND } from "@/lib/utils";

const PLAN_PAGE_SIZE = 20;
const HISTORY_PAGE_SIZE = 20;

const HISTORY_STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "PENDING", label: "Đang chờ" },
  { value: "PAID", label: "Đã thanh toán" },
  { value: "FAILED", label: "Thất bại" },
];

type PlanFilters = { keyword: string; durationYears: string };
const emptyPlanFilters = (): PlanFilters => ({ keyword: "", durationYears: "" });

export default function WorkspaceSubscriptionPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { role } = useWorkspaceContext();
  const owner = isWorkspaceOwner(role);
  const { current, loading: currentLoading, refetch: refetchCurrent } = useSubscription();

  const [buyPlan, setBuyPlan] = useState<SubscriptionPlan | null>(null);

  // --- Gói đang bán (mọi member xem được) ---
  const [planPage, setPlanPage] = useState(1);
  const [planApplied, setPlanApplied] = useState<PlanFilters>(emptyPlanFilters);
  const [planDraft, setPlanDraft] = useState<PlanFilters>(emptyPlanFilters);

  const planQs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(planPage));
    p.set("limit", String(PLAN_PAGE_SIZE));
    if (planApplied.keyword.trim()) p.set("keyword", planApplied.keyword.trim());
    if (planApplied.durationYears.trim()) p.set("durationYears", planApplied.durationYears.trim());
    return p.toString();
  }, [planPage, planApplied]);

  const plansFetcher = useCallback(
    (token: string) =>
      comviaFetch<Paginated<SubscriptionPlan>>(`/subscription-plans?${planQs}`, {
        token,
        headers: workspaceHeader(workspaceId),
      }),
    [planQs, workspaceId],
  );
  const { data: plans, loading: plansLoading, error: plansError, refetch: refetchPlans } = useComviaQuery(
    Boolean(workspaceId),
    plansFetcher,
  );

  // --- Lịch sử mua (chỉ OWNER: member gọi sẽ bị 403) ---
  const [historyPage, setHistoryPage] = useState(1);
  const [historyStatus, setHistoryStatus] = useState("");

  const historyQs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(historyPage));
    p.set("limit", String(HISTORY_PAGE_SIZE));
    if (historyStatus) p.set("status", historyStatus);
    return p.toString();
  }, [historyPage, historyStatus]);

  const historyFetcher = useCallback(
    (token: string) =>
      comviaFetch<Paginated<SubscriptionPurchase>>(`/subscriptions/history?${historyQs}`, {
        token,
        headers: workspaceHeader(workspaceId),
      }),
    [historyQs, workspaceId],
  );
  const {
    data: history,
    loading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useComviaQuery(Boolean(workspaceId) && owner, historyFetcher);

  /** `PAID`: gọi lại `/current` (banner + `canSend`) và lịch sử, QR đã được modal đóng. */
  const handlePaid = useCallback(() => {
    void refetchCurrent();
    if (owner) void refetchHistory();
  }, [owner, refetchCurrent, refetchHistory]);

  const planRows = plans?.data ?? [];
  const historyRows = history?.data ?? [];
  const expiringSoon =
    current?.status === "ACTIVE" && current.daysRemaining != null && current.daysRemaining <= EXPIRING_SOON_DAYS;
  const buyLabel = current?.status === "ACTIVE" ? "Gia hạn" : "Mua gói";

  return (
    <div>
      <PageHeader
        title="Gói dịch vụ"
        description="Gói dịch vụ tính theo workspace. Workspace cần có gói còn hạn mới gửi được tin; các chức năng khác vẫn dùng bình thường."
        actions={<EntityStatusBadge value={owner ? "OWNER" : "MEMBER"} />}
      />

      <Card className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trạng thái gói</p>
          {current ? <EntityStatusBadge value={current.status} kind="subscription" /> : null}
        </div>

        {!current ? (
          currentLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải trạng thái gói…</p>
          ) : (
            <PageError message="Không tải được trạng thái gói." onRetry={() => void refetchCurrent()} />
          )
        ) : current.status === "NONE" ? (
          <p className="text-sm text-foreground">Workspace chưa đăng ký gói nên chưa gửi được tin.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Gói</p>
              <p className="font-medium">{current.plan?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Bắt đầu</p>
              <p className="font-medium">{formatDateOnly(current.startsAt)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">
                {current.status === "EXPIRED" ? "Đã hết hạn từ" : "Hết hạn"}
              </p>
              <p className="font-medium">
                {formatDateOnly(current.status === "EXPIRED" ? current.expiredAt : current.endsAt)}
              </p>
            </div>
            {current.status === "ACTIVE" ? (
              <div>
                <p className="text-xs uppercase text-muted-foreground">Còn lại</p>
                <p className={expiringSoon ? "font-semibold text-danger" : "font-medium"}>
                  {current.daysRemaining ?? "—"} ngày
                </p>
              </div>
            ) : null}
          </div>
        )}

        {current ? (
          <p className="text-sm text-muted-foreground">
            {current.canSend ? "Workspace đang được phép gửi tin." : "Workspace chưa được phép gửi tin cho tới khi có gói còn hạn."}
            {expiringSoon ? " Gói sắp hết hạn — gia hạn để không bị gián đoạn gửi tin." : null}
          </p>
        ) : null}
        {!owner ? (
          <p className="text-sm text-muted-foreground">Chỉ chủ sở hữu workspace mới mua hoặc gia hạn được gói.</p>
        ) : null}
      </Card>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gói đang bán</p>
      <FilterCard
        onApply={() => {
          setPlanApplied({ ...planDraft });
          setPlanPage(1);
        }}
        onRefresh={() => void refetchPlans()}
      >
        <FilterField label="Tên hoặc mã gói" htmlFor="plan-filter-keyword" className="grow">
          <Input
            id="plan-filter-keyword"
            value={planDraft.keyword}
            onChange={(e) => setPlanDraft((d) => ({ ...d, keyword: e.target.value }))}
            placeholder="Tìm gói"
            className="max-w-md"
          />
        </FilterField>
        <FilterField label="Thời hạn (năm)" htmlFor="plan-filter-years">
          <Input
            id="plan-filter-years"
            type="number"
            min={1}
            max={20}
            step={1}
            value={planDraft.durationYears}
            onChange={(e) => setPlanDraft((d) => ({ ...d, durationYears: e.target.value }))}
            placeholder="Tất cả"
            className="max-w-[140px]"
          />
        </FilterField>
      </FilterCard>

      {plansLoading && !plans ? <PageLoading message="Đang tải danh sách gói…" /> : null}
      {plansError && !plans ? <PageError message={plansError} onRetry={() => void refetchPlans()} /> : null}
      {plans ? (
        <>
          <SimpleTable
            rows={planRows}
            getRowKey={(r) => r.id}
            emptyMessage="Chưa có gói nào đang bán."
            columns={[
              {
                key: "name",
                header: "Gói",
                cell: (r) => (
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.code}</p>
                    {r.description ? <p className="mt-1 max-w-xs text-xs text-muted-foreground">{r.description}</p> : null}
                  </div>
                ),
              },
              { key: "years", header: "Thời hạn", cell: (r) => `${r.durationYears} năm` },
              { key: "price", header: "Giá chưa VAT", cell: (r) => <span className="tabular-nums">{formatVND(r.priceExclVat)}</span> },
              {
                key: "vat",
                header: "VAT",
                cell: (r) => (
                  <span className="tabular-nums">
                    {formatVND(r.vatAmount)} <span className="text-xs text-muted-foreground">({r.vatPercent}%)</span>
                  </span>
                ),
              },
              {
                key: "total",
                header: "Tổng thanh toán",
                cell: (r) => <span className="font-semibold tabular-nums">{formatVND(r.totalAmountInclVat)}</span>,
              },
              {
                key: "act",
                header: "",
                cell: (r) =>
                  owner ? (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        icon={<HiOutlineShoppingCart className="size-4" />}
                        onClick={() => setBuyPlan(r)}
                      >
                        {buyLabel}
                      </Button>
                    </div>
                  ) : null,
              },
            ]}
          />
          <TablePagination
            page={planPage}
            totalPages={plans.meta.totalPages}
            total={plans.meta.total}
            pageSize={plans.meta.limit}
            onPageChange={setPlanPage}
            unitLabel="gói"
            ariaLabel="Phân trang danh sách gói"
          />
        </>
      ) : null}

      {owner ? (
        <section className="mt-10">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lịch sử mua gói</p>
            <div className="flex items-center gap-2">
              <Select
                aria-label="Lọc trạng thái đơn mua"
                value={historyStatus}
                onChange={(e) => {
                  setHistoryStatus(e.target.value);
                  setHistoryPage(1);
                }}
                className="w-[200px]"
              >
                {HISTORY_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              <Button variant="ghost" size="sm" onClick={() => void refetchHistory()}>
                Làm mới
              </Button>
            </div>
          </div>

          {historyLoading && !history ? <PageLoading message="Đang tải lịch sử…" /> : null}
          {historyError && !history ? <PageError message={historyError} onRetry={() => void refetchHistory()} /> : null}
          {history ? (
            <>
              <SimpleTable
                rows={historyRows}
                getRowKey={(r) => r.id}
                emptyMessage="Chưa có đơn mua gói nào."
                columns={[
                  { key: "code", header: "Mã đơn", cell: (r) => <span className="font-mono text-xs">{r.purchaseCode}</span> },
                  { key: "plan", header: "Gói", cell: (r) => `${r.planName} · ${r.durationYears} năm` },
                  {
                    key: "amt",
                    header: "Thanh toán",
                    cell: (r) => <span className="tabular-nums">{formatVND(r.amountInclVat)}</span>,
                  },
                  { key: "st", header: "Trạng thái", cell: (r) => <EntityStatusBadge value={r.status} /> },
                  {
                    key: "period",
                    header: "Hiệu lực",
                    cell: (r) =>
                      r.status === "PAID" && r.startsAt && r.endsAt
                        ? `${formatDateOnly(r.startsAt)} – ${formatDateOnly(r.endsAt)}`
                        : "—",
                  },
                  { key: "order", header: "Đơn hàng", cell: (r) => r.order?.orderCode ?? "—" },
                  { key: "paid", header: "Thanh toán lúc", cell: (r) => formatDateTime(r.paidAt) },
                  { key: "created", header: "Tạo lúc", cell: (r) => formatDateTime(r.createdAt) },
                ]}
              />
              <TablePagination
                page={historyPage}
                totalPages={history.meta.totalPages}
                total={history.meta.total}
                pageSize={history.meta.limit}
                onPageChange={setHistoryPage}
                unitLabel="đơn"
                ariaLabel="Phân trang lịch sử mua gói"
              />
            </>
          ) : null}
        </section>
      ) : null}

      <SubscriptionPurchaseModal
        plan={buyPlan}
        workspaceId={workspaceId}
        onClose={() => setBuyPlan(null)}
        onPaid={handlePaid}
      />
    </div>
  );
}
