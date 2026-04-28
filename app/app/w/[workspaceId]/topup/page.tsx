"use client";

import { useParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageForbidden } from "@/components/app/page-state";
import { isWorkspaceOwner, useWorkspaceContext } from "@/components/workspace/workspace-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken, getStoredUser } from "@/lib/auth";
import { formatVND } from "@/lib/utils";
import { HiQrCode } from "react-icons/hi2";

type QrRes = {
  id?: string;
  topupCode?: string;
  paymentProvider?: string;
  paymentRef?: string;
  qrCodeUrl?: string; // Thêm dòng này
  amountExclVat?: number;
  vatAmount?: number;
  amountInclVat?: number;
};

type MoneyAccountRow = {
  id?: string;
  accountNumber?: string;
  bankName?: string;
  bankCode?: string;
  pay2sBankId?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
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

  const [moneyAccounts, setMoneyAccounts] = useState<MoneyAccountRow[]>([]);
  const [moneyAccountId, setMoneyAccountId] = useState("");

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

  const fetchMoneyAccounts = async () => {
    try {
      const res = await comviaFetch<{ success: boolean; data: MoneyAccountRow[]; message: string }>(`/public/money-accounts/active-for-topup`, {
        token: getAccessToken() ?? undefined,
      });
      if (!res.success) {
        throw new Error(res.message);
      }
      setMoneyAccounts(res.data);
      setMoneyAccountId(res.data[0]?.id ?? "");
    } catch (err) {
      alert(err instanceof ComviaApiError ? err.message : "Không lấy được danh sách tài khoản ngân hàng.");
    }
  };
    
  useEffect(() => {
    void fetchMoneyAccounts();
  }, []);

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
      const res = await comviaFetch<QrRes>(`/topups/create-with-pay2s`, {
        method: "POST",
        token,
        headers: {
          "x-workspace-id": workspaceId, // Tên header này phải khớp với WorkspaceHeaderGuard
        },
        body: JSON.stringify({ amountExclVat: n, moneyAccountId: moneyAccountId }),
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
        title="Nạp credit"
        description="VAT 10%"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Số tiền nạp (trước VAT)
            </label>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tài khoản ngân hàng
            </label>
            <Select value={moneyAccountId} onChange={(e) => setMoneyAccountId(e.target.value)}>
              {moneyAccounts.map((account) => (
                <option selected={moneyAccountId === account.id} key={account.id} value={account.id}>
                  {account.bankCode} - {account.bankName} - {account.accountNumber}
                </option>
              ))}
            </Select>
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

        <Card className="overflow-hidden">
          <div className="border-b border-border/60 bg-surface-muted/50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Thông tin thanh toán
            </p>
          </div>

          <div className="p-5 space-y-6">
            {qr ? (
              <>
                {/* Phần hiển thị mã QR */}
                <div className="flex flex-col items-center justify-center space-y-3 rounded-xl border border-dashed border-border p-6 bg-white">
                  {qr.qrCodeUrl ? (
                    <div className="relative aspect-square w-64 overflow-hidden rounded-lg border shadow-sm">
                      <img 
                        src={qr.qrCodeUrl} 
                        alt="QR Code thanh toán" 
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-square w-64 items-center justify-center bg-muted">
                      <p className="text-xs text-muted-foreground">Đang tải ảnh QR...</p>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground italic">
                    Quét mã qua ứng dụng Ngân hàng hoặc Ví điện tử
                  </p>
                </div>

                {/* Thông tin chi tiết */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">Mã nạp tiền</p>
                    <p className="font-mono font-semibold text-primary">{qr.topupCode}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">Nhà cung cấp</p>
                    <p className="font-medium">{qr.paymentProvider?.toUpperCase()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium uppercase text-muted-foreground">Tổng tiền</p>
                    <p className="font-bold text-success">{formatVND(qr.amountInclVat || 0)}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center space-y-3 text-center opacity-50">
                <HiQrCode className="size-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Chưa có yêu cầu thanh toán.<br />Vui lòng nhập số tiền ở bên trái.
                </p>
              </div>
            )}
          </div>
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
          Vui lòng liên hệ số điện thoại 0909090909 nếu có bất kỳ lỗi liên quan đến nạp tiền.
        </p>
      )}
    </div>
  );
}
