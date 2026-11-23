"use client";

import { useCallback, useMemo, useState } from "react";
import { HiMiniPlus, HiOutlinePencilSquare } from "react-icons/hi2";
import { FilterCard, FilterField } from "@/components/app/filter-card";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { SubscriptionPlanModal } from "@/components/admin/subscription-plan-modal";
import { Button } from "@/components/ui/button";
import { useAlertModal } from "@/components/ui/alert-modal";
import { Input, Select } from "@/components/ui/input";
import { SimpleTable } from "@/components/ui/simple-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { TablePagination } from "@/components/ui/table-pagination";
import { getAccessToken } from "@/lib/auth";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { MIN_PAY2S_AMOUNT, type Paginated, type SubscriptionPlan } from "@/lib/subscription";
import { useComviaQuery } from "@/lib/use-comvia-query";
import { formatVND } from "@/lib/utils";

const PAGE_SIZE = 20;

type Filters = { keyword: string; isActive: string; durationYears: string };
const emptyFilters = (): Filters => ({ keyword: "", isActive: "", durationYears: "" });

/** `undefined` = đóng modal, `null` = tạo mới, gói = sửa gói đó. */
type ModalTarget = SubscriptionPlan | null | undefined;

export default function AdminSubscriptionPlansPage() {
  const { showAlert } = useAlertModal();
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [modal, setModal] = useState<ModalTarget>(undefined);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", String(PAGE_SIZE));
    if (applied.keyword.trim()) p.set("keyword", applied.keyword.trim());
    if (applied.isActive) p.set("isActive", applied.isActive);
    if (applied.durationYears.trim()) p.set("durationYears", applied.durationYears.trim());
    return p.toString();
  }, [page, applied]);

  const fetcher = useCallback(
    (token: string) => comviaFetch<Paginated<SubscriptionPlan>>(`/admin/subscription-plans?${qs}`, { token }),
    [qs],
  );
  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);
  const rows = data?.data ?? [];
  const meta = data?.meta;

  /** Không có xoá gói: ngừng bán = `isActive=false`. */
  async function toggleActive(plan: SubscriptionPlan) {
    const token = getAccessToken();
    if (!token || togglingId) return;
    setTogglingId(plan.id);
    try {
      await comviaFetch(`/admin/subscription-plans/${plan.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      void refetch();
    } catch (e) {
      showAlert({ type: "error", message: e instanceof ComviaApiError ? e.message : "Không đổi được trạng thái bán." });
    } finally {
      setTogglingId(null);
    }
  }

  function handleSaved(result: SubscriptionPlan, mode: "created" | "updated") {
    setModal(undefined);
    showAlert({
      type: "success",
      message: mode === "created" ? `Đã tạo gói ${result.name} (${result.code}).` : `Đã lưu gói ${result.name}.`,
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
            title="Gói subscription"
            description="Gói dịch vụ theo thời hạn (năm). Không có xoá gói: muốn ngừng bán hãy chọn “Ngừng bán”."
            actions={
              <Button icon={<HiMiniPlus className="size-4" />} onClick={() => setModal(null)}>
                Tạo gói
              </Button>
            }
          />

          <FilterCard
            onApply={() => {
              setApplied({ ...draft });
              setPage(1);
            }}
            onRefresh={() => void refetch()}
          >
            <FilterField label="Tên hoặc mã gói" htmlFor="plans-filter-keyword" className="grow">
              <Input
                id="plans-filter-keyword"
                value={draft.keyword}
                onChange={(e) => setDraft((d) => ({ ...d, keyword: e.target.value }))}
                placeholder="Tìm gói"
                className="max-w-md"
              />
            </FilterField>
            <FilterField label="Trạng thái bán" htmlFor="plans-filter-active">
              <Select
                id="plans-filter-active"
                value={draft.isActive}
                onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.value }))}
                className="max-w-[180px]"
              >
                <option value="">Tất cả</option>
                <option value="true">Đang bán</option>
                <option value="false">Đã tắt</option>
              </Select>
            </FilterField>
            <FilterField label="Thời hạn (năm)" htmlFor="plans-filter-years">
              <Input
                id="plans-filter-years"
                type="number"
                min={1}
                max={20}
                value={draft.durationYears}
                onChange={(e) => setDraft((d) => ({ ...d, durationYears: e.target.value }))}
                className="max-w-[140px]"
              />
            </FilterField>
          </FilterCard>

          <SimpleTable
            rows={rows}
            getRowKey={(r) => r.id}
            columns={[
              {
                key: "name",
                header: "Gói",
                cell: (r) => (
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.code}</p>
                  </div>
                ),
              },
              { key: "years", header: "Thời hạn", cell: (r) => `${r.durationYears} năm` },
              { key: "price", header: "Giá chưa VAT", cell: (r) => <span className="tabular-nums">{formatVND(r.priceExclVat)}</span> },
              { key: "vat", header: "VAT", cell: (r) => `${r.vatPercent}% (${formatVND(r.vatAmount)})` },
              {
                key: "total",
                header: "Tổng sau VAT",
                cell: (r) => (
                  <div>
                    <span className="font-semibold tabular-nums">{formatVND(r.totalAmountInclVat)}</span>
                    {r.totalAmountInclVat < MIN_PAY2S_AMOUNT ? (
                      <p className="text-xs text-danger">Dưới {formatVND(MIN_PAY2S_AMOUNT)} — chưa mua được</p>
                    ) : null}
                  </div>
                ),
              },
              { key: "sort", header: "Thứ tự", cell: (r) => String(r.sortOrder) },
              {
                key: "active",
                header: "Trạng thái",
                cell: (r) => (
                  <StatusBadge tone={r.isActive ? "active" : "neutral"}>{r.isActive ? "ĐANG BÁN" : "ĐÃ TẮT"}</StatusBadge>
                ),
              },
              {
                key: "act",
                header: "",
                cell: (r) => (
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<HiOutlinePencilSquare className="size-4" />}
                      onClick={() => setModal(r)}
                    >
                      Sửa
                    </Button>
                    <Button size="sm" variant="outline" disabled={togglingId === r.id} onClick={() => void toggleActive(r)}>
                      {r.isActive ? "Ngừng bán" : "Bán lại"}
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
            unitLabel="gói"
            ariaLabel="Phân trang danh sách gói"
          />

          {modal !== undefined ? (
            <SubscriptionPlanModal
              key={modal?.id ?? "new"}
              plan={modal}
              onClose={() => setModal(undefined)}
              onSaved={handleSaved}
            />
          ) : null}
        </div>
      ) : null}
    </AdminRoleGate>
  );
}
