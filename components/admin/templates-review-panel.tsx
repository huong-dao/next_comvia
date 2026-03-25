"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  HiArrowRight,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineClock,
  HiOutlineNoSymbol,
  HiOutlineXCircle,
} from "react-icons/hi2";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  providerTemplateId?: string | null;
  rejectedReason?: string | null;
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
    value: "REJECTED",
    label: "Rejected",
    href: "/staff/templates-review/rejected",
    icon: HiOutlineXCircle,
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
  const [keyword, setKeyword] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [oaId, setOaId] = useState("");
  const [limit, setLimit] = useState("20");

  const queryString = useMemo(() => {
    const qs = new URLSearchParams();
    if (status) qs.set("status", status);
    if (keyword.trim()) qs.set("keyword", keyword.trim());
    if (workspaceId.trim()) qs.set("workspaceId", workspaceId.trim());
    if (oaId.trim()) qs.set("oaId", oaId.trim());
    if (limit.trim()) qs.set("limit", limit.trim());
    return qs.toString();
  }, [status, keyword, workspaceId, oaId, limit]);

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
        title={title ?? "Duyệt template"}
        description="Queue review nội bộ toàn cục cho STAFF. Dùng `GET /internal/templates` để tải theo từng trạng thái; xem chi tiết để cập nhật `pending_zalo_approval / approved / rejected / disabled`."
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

      <Card className="mb-6 space-y-4 p-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Keyword</label>
            <Input className="mt-1" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Tên template hoặc code" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Workspace filter</label>
            <Input className="mt-1" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} placeholder="workspaceId" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">OA filter</label>
            <Input className="mt-1" value={oaId} onChange={(e) => setOaId(e.target.value)} placeholder="oaId" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Limit</label>
            <Select value={limit} onChange={(e) => setLimit(e.target.value)}>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Staff dùng queue toàn cục nội bộ, không gắn membership workspace. Filter `workspace` và `oa` hiện áp dụng ở FE trên dữ liệu trả về từ API.
        </p>
      </Card>

      {loading ? <PageLoading message="Đang tải queue review…" /> : null}
      {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}

      <SimpleTable
        rows={rows}
        emptyMessage="Không có template nào khớp bộ lọc hiện tại."
        getRowKey={(r) => r.id}
        columns={[
          { key: "n", header: "Tên", cell: (r) => r.name ?? "—" },
          { key: "c", header: "Mã", cell: (r) => r.code ?? "—" },
          {
            key: "s",
            header: "Trạng thái",
            cell: (r) => (r.status ? <EntityStatusBadge value={r.status} /> : "—"),
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
            key: "rr",
            header: "Rejected Reason",
            cell: (r) => <span className="text-xs text-muted-foreground">{r.rejectedReason ?? "—"}</span>,
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
