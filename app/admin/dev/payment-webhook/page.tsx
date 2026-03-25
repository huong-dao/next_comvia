"use client";

import { useState } from "react";
import { HiOutlineBolt, HiOutlineCreditCard, HiOutlinePaperAirplane } from "react-icons/hi2";
import { PageHeader } from "@/components/app/page-header";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";

export default function AdminDevPaymentWebhookPage() {
  const [provider, setProvider] = useState("mock_gateway");
  const [eventId, setEventId] = useState("");
  const [topupCode, setTopupCode] = useState("");
  const [status, setStatus] = useState<"success" | "failed">("success");
  const [paymentRef, setPaymentRef] = useState("");
  const [amountInclVat, setAmountInclVat] = useState("");
  const [rawPayload, setRawPayload] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const token = getAccessToken();
    if (!token) return;
    if (!eventId.trim() || !topupCode.trim()) {
      setMsg("eventId và topupCode là bắt buộc.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const body: Record<string, unknown> = {
        provider: provider.trim(),
        eventId: eventId.trim(),
        topupCode: topupCode.trim(),
        status,
      };
      if (paymentRef.trim()) body.paymentRef = paymentRef.trim();
      if (amountInclVat.trim()) {
        const n = Number(amountInclVat);
        if (!Number.isNaN(n)) body.amountInclVat = n;
      }
      if (rawPayload.trim()) {
        try {
          body.rawPayload = JSON.parse(rawPayload) as unknown;
        } catch {
          setMsg("rawPayload không phải JSON hợp lệ.");
          setBusy(false);
          return;
        }
      }
      await comviaFetch("/topups/webhook", {
        method: "POST",
        token,
        body: JSON.stringify(body),
      });
      setMsg("Đã gửi webhook (kiểm tra response backend).");
    } catch (e) {
      setMsg(e instanceof ComviaApiError ? e.message : "Gửi thất bại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminRoleGate>
      <PageHeader
        title="Dev — Payment webhook (mock)"
        description="POST `/topups/webhook` — chỉ dùng môi trường dev/demo (`FRONTEND_SITEMAP_ADMIN_STAFF.mdc` §3)."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setProvider("mock_gateway");
              setEventId("EVT_1");
              setTopupCode("TP_123");
              setStatus("success");
              setPaymentRef("");
              setAmountInclVat("110000");
              setRawPayload("");
              setMsg(null);
            }}
            icon={<HiOutlineBolt className="size-4" />}
          >
            Điền mẫu success
          </Button>
        }
      />
      <Card className="mb-6 max-w-2xl space-y-3">
        <div className="flex items-center gap-2">
          <HiOutlineCreditCard className="size-5 text-secondary" />
          <p className="text-base font-semibold text-foreground">Cảnh báo</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Đây là tool nội bộ/dev để mô phỏng webhook topup. Không dùng cho luồng production thật.
        </p>
      </Card>
      <Card className="max-w-2xl space-y-4 p-4">
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">provider</label>
          <Input className="mt-1" value={provider} onChange={(e) => setProvider(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">eventId</label>
          <Input className="mt-1" value={eventId} onChange={(e) => setEventId(e.target.value)} placeholder="EVT_1" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">topupCode</label>
          <Input className="mt-1" value={topupCode} onChange={(e) => setTopupCode(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">status</label>
          <Select className="mt-1" value={status} onChange={(e) => setStatus(e.target.value as "success" | "failed")}>
            <option value="success">success</option>
            <option value="failed">failed</option>
          </Select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">paymentRef (optional)</label>
          <Input className="mt-1" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">amountInclVat (optional)</label>
          <Input className="mt-1" type="number" value={amountInclVat} onChange={(e) => setAmountInclVat(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground">rawPayload JSON (optional)</label>
          <Textarea className="mt-1 font-mono text-xs" rows={4} value={rawPayload} onChange={(e) => setRawPayload(e.target.value)} />
        </div>
        {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
        <Button type="button" disabled={busy} onClick={() => void submit()} icon={<HiOutlinePaperAirplane className="size-4" />}>
          Gửi webhook
        </Button>
      </Card>
    </AdminRoleGate>
  );
}
