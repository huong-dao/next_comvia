"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { FilterCard, FilterField } from "@/components/app/filter-card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Input, Select } from "@/components/ui/input";
import { SimpleTable } from "@/components/ui/simple-table";
import { TablePagination } from "@/components/ui/table-pagination";
import { comviaFetch } from "@/lib/comviaFetch";
import { useClientPagination } from "@/lib/use-client-pagination";
import { useComviaQuery } from "@/lib/use-comvia-query";

type LogRow = {
  id?: string;
  sentAt?: string;
  phoneNumber?: string;
  templateId?: string;
  sendType?: string;
  status?: string;
  providerMessageId?: string;
  costAtTime?: string;
};

/** BE giới hạn limit là số nguyên trong khoảng 1–100. */
const LIMIT_OPTIONS = ["20", "50", "100"];

const SEND_TYPE_LABELS: Record<string, string> = {
  SINGLE: "ĐƠN LẺ",
  CAMPAIGN: "CHIẾN DỊCH",
  TEST: "GỬI THỬ",
};

type TemplateOption = { id: string; name?: string; code?: string };

type Filters = { status: string; sendType: string; limit: string; phone: string };
const INITIAL_FILTERS: Filters = { status: "", sendType: "", limit: "50", phone: "" };

/** Độ trễ trước khi áp dụng ô tìm số điện thoại khi đang gõ. */
const PHONE_DEBOUNCE_MS = 300;

const normalizePhone = (v: string) => v.replace(/[\s.\-()+]/g, "");

export default function MessageLogsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const [draft, setDraft] = useState<Filters>(INITIAL_FILTERS);
  const [applied, setApplied] = useState<Filters>(INITIAL_FILTERS);

  const qs = new URLSearchParams();
  if (applied.status) qs.set("status", applied.status);
  if (applied.sendType) qs.set("sendType", applied.sendType);
  if (applied.limit) qs.set("limit", applied.limit);
  const query = qs.toString();

  const fetcher = useCallback(
    (token: string) =>
      comviaFetch<LogRow[]>(`/workspaces/${workspaceId}/messages/logs${query ? `?${query}` : ""}`, { token }),
    [workspaceId, query],
  );

  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId), fetcher);
  const phoneKeyword = normalizePhone(applied.phone);
  const allRows = useMemo(() => {
    const list = data ?? [];
    if (!phoneKeyword) return list;
    return list.filter((r) => normalizePhone(r.phoneNumber ?? "").includes(phoneKeyword));
  }, [data, phoneKeyword]);
  const { rows, page, totalPages, total, pageSize, setPage } = useClientPagination(allRows);

  // Select đổi là áp dụng ngay; ô số điện thoại áp dụng sau khi ngừng gõ.
  const changeSelect = (key: "status" | "sendType" | "limit", value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setApplied((a) => ({ ...a, [key]: value }));
    setPage(1);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setApplied((a) => (a.phone === draft.phone ? a : { ...a, phone: draft.phone }));
      setPage(1);
    }, PHONE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [draft.phone, setPage]);

  const templatesFetcher = useCallback(
    (token: string) => comviaFetch<TemplateOption[]>(`/workspaces/${workspaceId}/templates`, { token }),
    [workspaceId],
  );
  const { data: templates } = useComviaQuery(Boolean(workspaceId), templatesFetcher);
  const templateNames = useMemo(
    () => new Map((templates ?? []).map((t) => [t.id, t.name ?? t.code ?? t.id])),
    [templates],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Messaging"
        title="Nhật ký gửi tin"
        description="Lọc theo số điện thoại, trạng thái và loại gửi; thay đổi bộ lọc được áp dụng ngay."
      />

      <FilterCard
        onApply={() => {
          setApplied({ ...draft });
          setPage(1);
        }}
        onRefresh={() => void refetch()}
      >
        <FilterField label="Số điện thoại" htmlFor="logs-phone" className="sm:w-56">
          <Input
            id="logs-phone"
            type="search"
            inputMode="tel"
            placeholder="Tìm theo SĐT"
            value={draft.phone}
            onChange={(e) => setDraft((value) => ({ ...value, phone: e.target.value }))}
          />
        </FilterField>
        <FilterField label="Trạng thái" htmlFor="logs-status" className="sm:w-48">
          <Select
            id="logs-status"
            value={draft.status}
            onChange={(e) => changeSelect("status", e.target.value)}
          >
            <option value="">Mọi trạng thái</option>
            <option value="SUCCESS">Thành công</option>
            <option value="FAILED">Thất bại</option>
          </Select>
        </FilterField>
        <FilterField label="Loại gửi" htmlFor="logs-send-type" className="sm:w-48">
          <Select
            id="logs-send-type"
            value={draft.sendType}
            onChange={(e) => changeSelect("sendType", e.target.value)}
          >
            <option value="">Mọi loại</option>
            <option value="SINGLE">Đơn lẻ</option>
            <option value="TEST">Gửi thử</option>
            <option value="CAMPAIGN">Chiến dịch</option>
          </Select>
        </FilterField>
        <FilterField label="Số dòng" htmlFor="logs-limit" className="sm:w-36">
          <Select
            id="logs-limit"
            value={draft.limit}
            onChange={(e) => changeSelect("limit", e.target.value)}
          >
            {LIMIT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} dòng
              </option>
            ))}
          </Select>
        </FilterField>
      </FilterCard>

      {loading ? <PageLoading /> : null}
      {!loading && error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}

      {!loading && !(error && !data) ? (
        <SimpleTable
          rows={rows}
          getRowKey={(r, i) => r.id ?? String(i)}
          columns={[
            {
              key: "sent",
              header: "Gửi lúc",
              cell: (r) => (r.sentAt ? new Date(r.sentAt).toLocaleString() : "—"),
            },
            { key: "phone", header: "SĐT", cell: (r) => r.phoneNumber ?? "—" },
            {
              key: "tpl",
              header: "Mẫu tin",
              cell: (r) => {
                if (!r.templateId) return "—";
                if (!templates) return "…";
                return templateNames.get(r.templateId) ?? "Không xác định";
              },
            },
            {
              key: "type",
              header: "Loại",
              cell: (r) => (r.sendType ? (SEND_TYPE_LABELS[r.sendType] ?? r.sendType) : "—"),
            },
            {
              key: "st",
              header: "Trạng thái",
              cell: (r) =>
                r.status ? <EntityStatusBadge value={r.status} kind="message" /> : "—",
            },
            { key: "cost", header: "Chi phí", cell: (r) => r.costAtTime ?? "—" },
          ]}
        />
      ) : null}

      {!loading && !(error && !data) ? (
        <TablePagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          unitLabel="bản ghi"
          ariaLabel="Phân trang nhật ký gửi tin"
        />
      ) : null}
    </div>
  );
}
