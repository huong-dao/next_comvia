"use client";

import Link from "next/link";
import { HiOutlineDocumentText, HiOutlineCreditCard, HiOutlinePaperAirplane, HiMiniPlus } from "react-icons/hi2";
import { useParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageForbidden, PageLoading } from "@/components/app/page-state";
import { isWorkspaceOwner, useWorkspaceContext } from "@/components/workspace/workspace-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { comviaFetch } from "@/lib/comviaFetch";
import { workspacePath } from "@/lib/paths";
import { useComviaQuery } from "@/lib/use-comvia-query";
import { formatVND } from "@/lib/utils";

type WalletBalance = {
  balance?: string;
  totalTopup?: string;
  totalSpent?: string;
  totalRefund?: string;
};

type TemplateRow = { id: string; status?: string };
type MessageLog = { id?: string; status?: string };

export default function DashboardPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { role } = useWorkspaceContext();
  const owner = isWorkspaceOwner(role);

  const fetcher = useCallback(
    async (token: string) => {
      const [balance, templates, logs] = await Promise.all([
        comviaFetch<WalletBalance>(`/workspaces/${workspaceId}/wallet/balance`, { token }).catch(() => null),
        comviaFetch<TemplateRow[]>(`/workspaces/${workspaceId}/templates`, { token }).catch(() => []),
        comviaFetch<MessageLog[]>(`/workspaces/${workspaceId}/messages/logs?limit=50`, { token }).catch(() => []),
      ]);
      return { balance, templates: Array.isArray(templates) ? templates : [], logs: Array.isArray(logs) ? logs : [] };
    },
    [workspaceId],
  );

  const { data, loading, error, forbidden, refetch } = useComviaQuery(Boolean(workspaceId), fetcher);

  const stats = useMemo(() => {
    if (!data) return null;
    const failedRecent = data.logs.filter((l) => l.status === "FAILED").length;
    return {
      balance: data.balance?.balance ?? "—",
      templateCount: data.templates.length,
      sentCount: data.logs.length,
      failures: failedRecent,
    };
  }, [data]);

  if (forbidden) {
    return <PageForbidden backHref="/app/workspaces" />;
  }

  if (loading) return <PageLoading />;
  if (error && !data) {
    return <PageError message={error} onRetry={() => void refetch()} />;
  }

  return (
    <div>
      <PageHeader
        // eyebrow="Dashboard"
        title="Tổng quan workspace"
        // description="Số liệu lấy từ API ví, template và nhật ký tin nhắn."
        // actions={
        //   owner ? (
        //     <EntityStatusBadge value="OWNER" />
        //   ) : (
        //     <EntityStatusBadge value="MEMBER" />
        //   )
        // }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-muted-foreground">Số dư credit</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {stats?.balance != null && stats.balance !== "—" ? formatVND(Number(stats.balance)) : "—"}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Tổng template</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{stats?.templateCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Tin gần đây (50 bản ghi)</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{stats?.sentCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Tin lỗi (trong 50 bản ghi)</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-danger">{stats?.failures}</p>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        {owner ? (
          <Button icon={<HiOutlineCreditCard className="size-4" />} variant="secondary" asChild>
            <Link href={workspacePath(workspaceId, "topup")}>Nạp tiền</Link>
          </Button>
        ) : null}
        <Button icon={<HiMiniPlus className="size-4" />} variant="accent" asChild>
          <Link href={workspacePath(workspaceId, "templates", "new")}>Tạo template</Link>
        </Button>
        <Button icon={<HiOutlinePaperAirplane className="size-4" />} variant="outline" asChild>
          <Link href={workspacePath(workspaceId, "messages", "send-single")}>Gửi tin</Link>
        </Button>
        <Button icon={<HiOutlineDocumentText className="size-4" />} variant="outline" asChild>
          <Link href={workspacePath(workspaceId, "messages", "logs")}>Nhật ký tin</Link>
        </Button>
      </div>
    </div>
  );
}
