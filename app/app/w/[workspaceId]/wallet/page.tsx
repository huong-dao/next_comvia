"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { isWorkspaceOwner, useWorkspaceContext } from "@/components/workspace/workspace-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Select } from "@/components/ui/input";
import { SimpleTable } from "@/components/ui/simple-table";
import { comviaFetch } from "@/lib/comviaFetch";
import { workspacePath } from "@/lib/paths";
import { useComviaQuery } from "@/lib/use-comvia-query";
import { formatVND } from "@/lib/utils";
import { HiOutlineCreditCard } from "react-icons/hi2";

type WalletBalance = {
  balance?: string;
  totalTopup?: string;
  totalSpent?: string;
  totalRefund?: string;
};

type TxRow = {
  transactionCode?: string;
  type?: string;
  amount?: string;
  balanceBefore?: string;
  balanceAfter?: string;
  createdAt?: string;
};

export default function WalletPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { role } = useWorkspaceContext();
  const owner = isWorkspaceOwner(role);
  const [type, setType] = useState("");

  const balanceFetcher = useCallback(
    (token: string) => comviaFetch<WalletBalance>(`/workspaces/${workspaceId}/wallet/balance`, { token }),
    [workspaceId],
  );

  const { data: bal, loading: lb, error: eb, refetch: rb } = useComviaQuery(Boolean(workspaceId), balanceFetcher);

  const txQuery = type ? `?type=${encodeURIComponent(type)}` : "";
  const txFetcher = useCallback(
    (token: string) =>
      comviaFetch<TxRow[]>(`/workspaces/${workspaceId}/wallet/transactions${txQuery}`, { token }),
    [workspaceId, txQuery],
  );

  const {
    data: txs,
    loading: lt,
    error: et,
    refetch: rt,
  } = useComviaQuery(Boolean(workspaceId), txFetcher);

  if (lb) return <PageLoading />;
  if (eb && !bal) return <PageError message={eb} onRetry={() => void rb()} />;

  return (
    <div>
      <PageHeader
        eyebrow="Wallet"
        title="Ví tiền"
        description="Số dư và lịch sử giao dịch theo Workspace."
        actions={
          owner ? (
            <Button icon={<HiOutlineCreditCard className="size-4" />} variant="secondary" asChild>
              <Link href={workspacePath(workspaceId, "topup")}>Nạp tiền</Link>
            </Button>
          ) : (
            <EntityStatusBadge value="MEMBER" />
          )
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm text-muted-foreground">Số dư</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{bal?.balance != null ? formatVND(Number(bal.balance)) : "—"}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Tổng nạp</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{bal?.totalTopup != null ? formatVND(Number(bal.totalTopup)) : "—"}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Đã chi</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{bal?.totalSpent != null ? formatVND(Number(bal.totalSpent)) : "—"}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Hoàn</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{bal?.totalRefund != null ? formatVND(Number(bal.totalRefund)) : "—"}</p>
        </Card>
      </div>

      <div className="mb-4 flex justify-between items-center gap-3">
        {/* <Select value={type} onChange={(e) => setType(e.target.value)} className="max-w-sm">
          <option value="">Mọi loại giao dịch</option>
          <option value="TOPUP_CREDIT">TOPUP_CREDIT</option>
          <option value="MESSAGE_DEBIT">MESSAGE_DEBIT</option>
          <option value="CAMPAIGN_HOLD">CAMPAIGN_HOLD</option>
          <option value="CAMPAIGN_REFUND">CAMPAIGN_REFUND</option>
          <option value="MANUAL_ADJUSTMENT">MANUAL_ADJUSTMENT</option>
        </Select> */}
        <Button className="w-40" type="button" variant="outline" size="sm" onClick={() => void rt()}>
          Làm mới lịch sử
        </Button>
      </div>

      {lt ? <PageLoading message="Đang tải giao dịch…" /> : null}
      {et && !txs ? <PageError message={et} onRetry={() => void rt()} /> : null}

      <SimpleTable
        rows={txs ?? []}
        getRowKey={(r, i) => r.transactionCode ?? String(i)}
        columns={[
          { key: "code", header: "Mã", cell: (r) => r.transactionCode ?? "—" },
          { key: "type", header: "Loại", cell: (r) => r.type ?? "—" },
          { key: "amt", header: "Số tiền", cell: (r) => r.amount != null ? formatVND(Number(r.amount)) : "—" },
          { key: "before", header: "Trước", cell: (r) => r.balanceBefore != null ? formatVND(Number(r.balanceBefore)) : "—" },
          { key: "after", header: "Sau", cell: (r) => r.balanceAfter != null ? formatVND(Number(r.balanceAfter)) : "—" },
          {
            key: "at",
            header: "Thời gian",
            cell: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"),
          },
        ]}
      />
    </div>
  );
}
