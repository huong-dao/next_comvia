"use client";

import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { FilterCard, FilterField } from "@/components/app/filter-card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Select } from "@/components/ui/input";
import { SimpleTable } from "@/components/ui/simple-table";
import { comviaFetch } from "@/lib/comviaFetch";
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

type Filters = { status: string; sendType: string; limit: string };
const INITIAL_FILTERS: Filters = { status: "", sendType: "", limit: "50" };

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
  const rows = data ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Messaging"
        title="Nhật ký gửi tin"
        description="Lọc theo trạng thái và loại gửi (query API)."
      />

      <FilterCard onApply={() => setApplied({ ...draft })} onRefresh={() => void refetch()}>
        <FilterField label="Trạng thái" htmlFor="logs-status" className="sm:w-48">
          <Select
            id="logs-status"
            value={draft.status}
            onChange={(e) => setDraft((value) => ({ ...value, status: e.target.value }))}
          >
            <option value="">Mọi trạng thái</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
          </Select>
        </FilterField>
        <FilterField label="Loại gửi" htmlFor="logs-send-type" className="sm:w-48">
          <Select
            id="logs-send-type"
            value={draft.sendType}
            onChange={(e) => setDraft((value) => ({ ...value, sendType: e.target.value }))}
          >
            <option value="">Mọi loại</option>
            <option value="SINGLE">SINGLE</option>
            <option value="TEST">TEST</option>
            <option value="CAMPAIGN">CAMPAIGN</option>
          </Select>
        </FilterField>
        <FilterField label="Số dòng" htmlFor="logs-limit" className="sm:w-36">
          <Select
            id="logs-limit"
            value={draft.limit}
            onChange={(e) => setDraft((value) => ({ ...value, limit: e.target.value }))}
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
            { key: "tpl", header: "Template", cell: (r) => r.templateId ?? "—" },
            { key: "type", header: "Loại", cell: (r) => r.sendType ?? "—" },
            {
              key: "st",
              header: "Trạng thái",
              cell: (r) => (r.status ? <EntityStatusBadge value={r.status} /> : "—"),
            },
            { key: "cost", header: "Chi phí", cell: (r) => r.costAtTime ?? "—" },
            { key: "mid", header: "Provider ID", cell: (r) => r.providerMessageId ?? "—" },
          ]}
        />
      ) : null}
    </div>
  );
}
