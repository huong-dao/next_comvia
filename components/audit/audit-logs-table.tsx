"use client";

import { useMemo } from "react";
import { SimpleTable, type SimpleColumn } from "@/components/ui/simple-table";

/** Chuẩn docs `FRONTEND_API_GUIDE_NEXTJS.mdc` §11.3 (+ tương thích `metadata` cũ). */
export type AuditLogRow = {
  id?: string;
  createdAt?: string;
  actorUserId?: string;
  workspaceId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  metadataJson?: unknown;
  metadata?: unknown;
  actor?: {
    id?: string;
    email?: string;
    fullName?: string | null;
  };
};

function metaPayload(r: AuditLogRow): unknown {
  return r.metadataJson ?? r.metadata;
}

function actorLabel(r: AuditLogRow): string {
  const a = r.actor;
  if (a?.fullName?.trim()) return a.fullName.trim();
  if (a?.email?.trim()) return a.email.trim();
  if (r.actorUserId) return r.actorUserId;
  return "—";
}

export function AuditLogsTable({ rows, showWorkspaceColumn }: { rows: AuditLogRow[]; showWorkspaceColumn: boolean }) {
  const columns: SimpleColumn<AuditLogRow>[] = useMemo(() => {
    const base: SimpleColumn<AuditLogRow>[] = [
      {
        key: "t",
        header: "Thời gian",
        cell: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString("vi-VN") : "—"),
      },
      {
        key: "actor",
        header: "Người thực hiện",
        cell: (r) => <span title={r.actor?.email ?? undefined}>{actorLabel(r)}</span>,
      },
    ];

    const workspaceCol: SimpleColumn<AuditLogRow> = {
      key: "w",
      header: "Workspace",
      cell: (r) => <span className="font-mono text-xs">{r.workspaceId ?? "—"}</span>,
    };

    const rest: SimpleColumn<AuditLogRow>[] = [
      { key: "action", header: "Hành động", cell: (r) => r.action ?? "—" },
      { key: "rt", header: "Resource", cell: (r) => r.resourceType ?? "—" },
      {
        key: "rid",
        header: "Resource ID",
        cell: (r) => <span className="font-mono text-xs">{r.resourceId ?? "—"}</span>,
      },
      {
        key: "meta",
        header: "Metadata",
        cell: (r) => {
          const m = metaPayload(r);
          return <span className="line-clamp-2 font-mono text-xs">{m != null ? JSON.stringify(m) : "—"}</span>;
        },
      },
    ];

    return showWorkspaceColumn ? [...base, workspaceCol, ...rest] : [...base, ...rest];
  }, [showWorkspaceColumn]);

  return (
    <SimpleTable rows={rows} getRowKey={(r, i) => r.id ?? String(i)} columns={columns} emptyMessage="Chưa có bản ghi." />
  );
}
