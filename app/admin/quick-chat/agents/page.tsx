"use client";

import Link from "next/link";
import { useCallback } from "react";
import { HiOutlineCog6Tooth, HiOutlinePencilSquare } from "react-icons/hi2";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SimpleTable } from "@/components/ui/simple-table";
import { comviaFetch } from "@/lib/comviaFetch";
import { useComviaQuery } from "@/lib/use-comvia-query";

type AgentRow = {
  id: string;
  name?: string;
  provider?: string;
  systemPrompt?: string;
  allowedTools?: string[];
  skills?: string[];
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export default function AdminQuickChatAgentsPage() {
  const fetcher = useCallback((token: string) => comviaFetch<AgentRow[]>("/admin/quick-chat/agents", { token }), []);
  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);

  return (
    <AdminRoleGate>
      {loading ? <PageLoading /> : null}
      {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}
      {data ? (
        <div>
          <PageHeader
            title="Quick Chat — Agents"
            description="Danh sách agent quick chat admin theo `GET /admin/quick-chat/agents`, hỗ trợ mở màn edit riêng."
            actions={
              <Button variant="outline" size="sm" onClick={() => void refetch()} icon={<HiOutlineCog6Tooth className="size-4" />}>
                Làm mới
              </Button>
            }
          />
          <Card className="p-0">
            <SimpleTable
              rows={data}
              emptyMessage="Không có agent."
              getRowKey={(r) => r.id}
              columns={[
                { key: "n", header: "Tên", cell: (r) => r.name ?? "—" },
                { key: "p", header: "Provider", cell: (r) => r.provider ?? "—" },
                {
                  key: "sp",
                  header: "System Prompt",
                  cell: (r) => <span className="line-clamp-2 text-xs text-muted-foreground">{r.systemPrompt ?? "—"}</span>,
                },
                {
                  key: "t",
                  header: "Allowed Tools",
                  cell: (r) => <span className="text-xs text-muted-foreground">{r.allowedTools?.join(", ") || "—"}</span>,
                },
                {
                  key: "s",
                  header: "Skills",
                  cell: (r) => <span className="text-xs text-muted-foreground">{r.skills?.join(", ") || "—"}</span>,
                },
                {
                  key: "a",
                  header: "Active",
                  cell: (r) => (r.active === undefined ? "—" : r.active ? "Có" : "Không"),
                },
                {
                  key: "u",
                  header: "Updated",
                  cell: (r) => (r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "—"),
                },
                {
                  key: "e",
                  header: "",
                  cell: (r) => (
                    <Button variant="outline" size="sm" asChild icon={<HiOutlinePencilSquare className="size-4" />}>
                      <Link href={`/admin/quick-chat/agents/${r.id}`}>Sửa</Link>
                    </Button>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      ) : null}
    </AdminRoleGate>
  );
}
