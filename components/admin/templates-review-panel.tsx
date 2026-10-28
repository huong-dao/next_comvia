"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  HiArrowRight,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineClock,
  HiOutlineNoSymbol,
} from "react-icons/hi2";
import { FilterCard, FilterField } from "@/components/app/filter-card";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Input, Select } from "@/components/ui/input";
import { SimpleTable } from "@/components/ui/simple-table";
import { comviaFetch } from "@/lib/comviaFetch";
import { useComviaQuery } from "@/lib/use-comvia-query";

type InternalTemplateItem = {
  id: string;
  name?: string;
  code?: string;
  status?: string;
  requiresOwnerRevision?: boolean;
  providerTemplateId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  workspace?: {
    id?: string;
    name?: string;
    slug?: string;
    status?: string;
  };
  oaConnection?: {
    id?: string;
    oaId?: string;
    oaName?: string;
    status?: string;
  };
};

type Filters = { keyword: string; workspaceId: string; oaId: string; limit: string };
const INITIAL_FILTERS: Filters = { keyword: "", workspaceId: "", oaId: "", limit: "20" };

const staffStatuses = [
  {
    value: "SUBMITTED",
    label: "Submitted",
    href: "/staff/templates-review/submitted",
    icon: HiOutlineClipboardDocumentList,
  },
  {
    value: "PENDING_ZALO_APPROVAL",
    label: "Pending Zalo Approval",
    href: "/staff/templates-review/pending-zalo-approval",
    icon: HiOutlineClock,
  },
  {
    value: "APPROVED",
    label: "Approved",
    href: "/staff/templates-review/approved",
    icon: HiOutlineCheckCircle,
  },
  {
    value: "DISABLED",
    label: "Disabled",
    href: "/staff/templates-review/disabled",
    icon: HiOutlineNoSymbol,
  },
] as const;

export function TemplatesReviewPanel({
  title,
  status,
}: {
  title?: string;
  status: (typeof staffStatuses)[number]["value"];
}) {
  const [draft, setDraft] = useState<Filters>(INITIAL_FILTERS);
  const [applied, setApplied] = useState<Filters>(INITIAL_FILTERS);

  const queryString = useMemo(() => {
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (applied.keyword.trim()) qs.set("keyword", applied.keyword.trim());
    if (applied.workspaceId.trim()) qs.set("workspaceId", applied.workspaceId.trim());
    if (applied.oaId.trim()) qs.set("oaId", applied.oaId.trim());
    if (applied.limit.trim()) qs.set("limit", applied.limit.trim());
    return qs.toString();
  }, [status, applied]);

  const fetcher = useCallback(
    (token: string) =>
      comviaFetch<InternalTemplateItem[]>(`/internal/templates${queryString ? `?${queryString}` : ""}`, { token }),
    [queryString],
  );
  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);

  const rows = useMemo(
    () =>
      [...(data ?? [])].sort((a, b) => {
        const at = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
        const bt = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
        return bt - at;
      }),
    [data],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Review"
        title={title ?? "Duyệt mẫu tin"}
        // description=""
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {staffStatuses.map((option) => (
          <Button
            key={option.label}
            size="sm"
            variant={status === option.value ? "secondary" : "outline"}
            asChild
            icon={<option.icon className="size-4" />}
          >
            <Link href={option.href}>{option.label}</Link>
          </Button>
        ))}
      </div>

      <FilterCard
        onApply={() => setApplied({ ...draft })}
        onRefresh={() => void refetch()}
        note="Staff dùng queue toàn cục nội bộ, không gắn membership workspace. Filter `workspace` và `oa` hiện áp dụng ở FE trên dữ liệu trả về từ API."
      >
        <FilterField label="Keyword" htmlFor="review-keyword" className="grow">
          <Input
            id="review-keyword"
            value={draft.keyword}
            onChange={(e) => setDraft((value) => ({ ...value, keyword: e.target.value }))}
            placeholder="Tên template hoặc code"
          />
        </FilterField>
        <FilterField label="Workspace filter" htmlFor="review-workspace" className="grow">
          <Input
            id="review-workspace"
            value={draft.workspaceId}
            onChange={(e) => setDraft((value) => ({ ...value, workspaceId: e.target.value }))}
            placeholder="workspaceId"
          />
        </FilterField>
        <FilterField label="OA filter" htmlFor="review-oa" className="grow">
          <Input
            id="review-oa"
            value={draft.oaId}
            onChange={(e) => setDraft((value) => ({ ...value, oaId: e.target.value }))}
            placeholder="oaId"
          />
        </FilterField>
        <FilterField label="Limit" htmlFor="review-limit" className="sm:w-28">
          <Select
            id="review-limit"
            value={draft.limit}
            onChange={(e) => setDraft((value) => ({ ...value, limit: e.target.value }))}
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </Select>
        </FilterField>
      </FilterCard>

      {loading ? <PageLoading message="Đang tải queue review…" /> : null}
      {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}

      <SimpleTable
        rows={rows}
        emptyMessage="Không có template nào khớp bộ lọc hiện tại."
        getRowKey={(r) => r.id}
        columns={[
          { key: "n", header: "Tên", cell: (r) => (
            <Link href={`/staff/templates-review/${r.id}`}>{r.name}</Link>
          ) },
          { key: "c", header: "Mã", cell: (r) => r.code ?? "—" },
          {
            key: "s",
            header: "Trạng thái",
            cell: (r) => (
              <div className="flex flex-wrap items-center gap-1.5">
                {r.status ? <EntityStatusBadge value={r.status} /> : "—"}
                {r.requiresOwnerRevision ? <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted-foreground">Chờ Owner sửa</span> : null}
              </div>
            ),
          },
          {
            key: "w",
            header: "Workspace",
            cell: (r) => (
              <div className="min-w-[180px]">
                <p className="font-medium text-foreground">{r.workspace?.name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{r.workspace?.slug ?? r.workspace?.id ?? ""}</p>
              </div>
            ),
          },
          {
            key: "oa",
            header: "OA",
            cell: (r) => (
              <div className="min-w-[180px]">
                <p className="font-medium text-foreground">{r.oaConnection?.oaName ?? "—"}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{r.oaConnection?.oaId ?? ""}</span>
                  {r.oaConnection?.status ? <EntityStatusBadge value={r.oaConnection.status} /> : null}
                </div>
              </div>
            ),
          },
          {
            key: "u",
            header: "Cập nhật",
            cell: (r) => (r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "—"),
          },
          {
            key: "p",
            header: "Provider Template ID",
            cell: (r) => <span className="font-mono text-xs">{r.providerTemplateId ?? "—"}</span>,
          },
          {
            key: "d",
            header: "Chi tiết",
            cell: (r) => (
              <Button variant="ghost" size="sm" asChild icon={<HiArrowRight className="size-4" />}>
                <Link href={`/staff/templates-review/${r.id}`}>Chi tiết</Link>
              </Button>
            ),
          },
        ]}
      />
    </div>
  );
}
