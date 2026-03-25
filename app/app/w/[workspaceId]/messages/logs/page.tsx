"use client";

import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Input, Select } from "@/components/ui/input";
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

export default function MessageLogsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const [status, setStatus] = useState("");
  const [sendType, setSendType] = useState("");
  const [limit, setLimit] = useState("50");

  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (sendType) qs.set("sendType", sendType);
  if (limit) qs.set("limit", limit);
  const query = qs.toString();

  const fetcher = useCallback(
    (token: string) =>
      comviaFetch<LogRow[]>(`/workspaces/${workspaceId}/messages/logs${query ? `?${query}` : ""}`, { token }),
    [workspaceId, query],
  );

  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId), fetcher);
  const rows = data ?? [];

  if (loading) return <PageLoading />;
  if (error && !data) return <PageError message={error} onRetry={() => void refetch()} />;

  return (
    <div>
      <PageHeader
        eyebrow="Messaging"
        title="Nhật ký gửi tin"
        description="Lọc theo trạng thái và loại gửi (query API)."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            Làm mới
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-44">
          <option value="">Mọi trạng thái</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="FAILED">FAILED</option>
        </Select>
        <Select value={sendType} onChange={(e) => setSendType(e.target.value)} className="w-44">
          <option value="">Mọi loại</option>
          <option value="SINGLE">SINGLE</option>
          <option value="TEST">TEST</option>
          <option value="CAMPAIGN">CAMPAIGN</option>
        </Select>
        <Input
          className="w-24"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          placeholder="limit"
        />
      </div>

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
    </div>
  );
}
