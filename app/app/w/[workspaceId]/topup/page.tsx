"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageForbidden } from "@/components/app/page-state";
import { isWorkspaceOwner, useWorkspaceContext } from "@/components/workspace/workspace-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken, getStoredUser } from "@/lib/auth";
import { formatVND } from "@/lib/utils";
import { HiQrCode } from "react-icons/hi2";

type QrRes = {
  id?: string;
  topupCode?: string;
  paymentProvider?: string;
  paymentRef?: string;
  qrContent?: string;
  qrExpiredAt?: string;
};

export default function TopupPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { role } = useWorkspaceContext();
  const owner = isWorkspaceOwner(role);

  const [amount, setAmount] = useState("100000");
  const [qr, setQr] = useState<QrRes | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [whProvider, setWhProvider] = useState("mock_gateway");
  const [whEvent, setWhEvent] = useState("EVT_DEMO_1");
  const [whCode, setWhCode] = useState("");
  const [whAmount, setWhAmount] = useState("110000");
  const [whBusy, setWhBusy] = useState(false);
  const [whMsg, setWhMsg] = useState<string | null>(null);

  const vat = useMemo(() => {
    const n = Number(amount.replace(/\D/g, "")) || 0;
    return Math.round(n * 0.1);
  }, [amount]);

  const incl = useMemo(() => {
    const n = Number(amount.replace(/\D/g, "")) || 0;
    return n + vat;
  }, [amount, vat]);

  const isAdmin = (getStoredUser()?.role ?? "").toUpperCase() === "ADMIN";

  if (!owner) {
    return <PageForbidden message="Chỉ Owner mới được tạo QR nạp tiền." backHref={`/app/w/${workspaceId}/wallet`} />;
  }

  async function createQr() {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setErr(null);
    const n = Number(amount.replace(/\D/g, "")) || 0;
    if (n <= 0) {
      setErr("Số tiền phải lớn hơn 0.");
      setBusy(false);
      return;
    }
    try {
      const res = await comviaFetch<QrRes>(`/topups/workspaces/${workspaceId}/qr`, {
        method: "POST",
        token,
        body: JSON.stringify({ amountExclVat: n }),
      });
      setQr(res);
      setWhCode(res.topupCode ?? "");
    } catch (e) {
      setErr(e instanceof ComviaApiError ? e.message : "Không tạo được QR.");
    } finally {
      setBusy(false);
    }
  }

  async function sendWebhook(success: boolean) {
    const token = getAccessToken();
    if (!token) return;
    setWhBusy(true);
    setWhMsg(null);
    try {
      await comviaFetch(`/topups/webhook`, {
        method: "POST",
        token,
        body: JSON.stringify({
          provider: whProvider,
          eventId: whEvent,
          topupCode: whCode,
          status: success ? "success" : "failed",
          amountInclVat: Number(whAmount.replace(/\D/g, "")) || 0,
        }),
      });
      setWhMsg(success ? "Webhook success đã gửi." : "Webhook failed đã gửi.");
    } catch (e) {
      setWhMsg(e instanceof ComviaApiError ? e.message : "Webhook lỗi (cần role ADMIN).");
    } finally {
      setWhBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Topup"
        title="Nạp credit (QR mock)"
        description="Hiển thị breakdown VAT 10% theo MAIN_RULES. Thanh toán qua cổng mock."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Số tiền nạp (trước VAT)
            </label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
          </div>
          <div className="rounded-xl bg-surface-muted p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trước VAT</span>
              <span className="font-medium tabular-nums">{formatVND(Number(amount.replace(/\D/g, "")) || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">VAT 10%</span>
              <span className="font-medium tabular-nums">{formatVND(vat)}</span>
            </div>
            <div className="flex justify-between border-t border-border/60 pt-2 font-semibold">
              <span>Tổng thanh toán</span>
              <span className="tabular-nums">{formatVND(incl)}</span>
            </div>
          </div>
          <Button icon={<HiQrCode className="size-4" />} type="button" disabled={busy} onClick={() => void createQr()}>
            {busy ? "Đang tạo…" : "Tạo QR"}
          </Button>
          {err ? <p className="text-sm text-danger">{err}</p> : null}
        </Card>

        <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kết quả QR</p>
          {qr ? (
            <>
              <p className="text-sm">
                <span className="text-muted-foreground">Mã topup: </span>
                {qr.topupCode}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Payment ref: </span>
                {qr.paymentRef}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Provider: </span>
                {qr.paymentProvider}
              </p>
              <p className="text-xs text-muted-foreground">
                Hết hạn QR: {qr.qrExpiredAt ? new Date(qr.qrExpiredAt).toLocaleString() : "—"}
              </p>
              <Textarea readOnly rows={4} value={qr.qrContent ?? ""} className="font-mono text-xs" />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Chưa có QR. Nhập số tiền và bấm Tạo QR.</p>
          )}
        </Card>
      </div>

      {isAdmin ? (
        <Card className="mt-6 space-y-4">
          <p className="text-sm font-semibold text-foreground">Mô phỏng webhook (ADMIN)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={whProvider} onChange={(e) => setWhProvider(e.target.value)} placeholder="provider" />
            <Input value={whEvent} onChange={(e) => setWhEvent(e.target.value)} placeholder="eventId" />
            <Input value={whCode} onChange={(e) => setWhCode(e.target.value)} placeholder="topupCode" />
            <Input value={whAmount} onChange={(e) => setWhAmount(e.target.value)} placeholder="amountInclVat" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={whBusy} onClick={() => void sendWebhook(true)}>
              Webhook success
            </Button>
            <Button type="button" variant="outline" disabled={whBusy} onClick={() => void sendWebhook(false)}>
              Webhook failed
            </Button>
          </div>
          {whMsg ? <p className="text-sm text-muted-foreground">{whMsg}</p> : null}
        </Card>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          Mô phỏng webhook chỉ hiển thị khi tài khoản có role ADMIN (theo tài liệu API).
        </p>
      )}
    </div>
  );
}
