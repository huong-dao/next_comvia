"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";
import { useComviaQuery } from "@/lib/use-comvia-query";
import { formatVND } from "@/lib/utils";

type MessagePricingConfig = {
  defaultMessageUnitPrice?: number | string;
};

export default function AdminMessagePricingPage() {
  const fetcher = useCallback(
    (token: string) => comviaFetch<MessagePricingConfig>("/admin/config/message-pricing", { token }),
    [],
  );
  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (data?.defaultMessageUnitPrice != null) {
      setPrice(String(data.defaultMessageUnitPrice));
    }
  }, [data]);

  async function save() {
    const token = getAccessToken();
    if (!token) return;
    const n = Number(price);
    if (!Number.isFinite(n) || n < 0) {
      setMsg("Nhập số tiền hợp lệ (VND/tin).");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await comviaFetch("/admin/config/message-pricing", {
        method: "PATCH",
        token,
        body: JSON.stringify({ defaultMessageUnitPrice: Math.round(n) }),
      });
      setMsg("Đã lưu cấu hình giá tin.");
      void refetch();
    } catch (e) {
      setMsg(e instanceof ComviaApiError ? e.message : "Không lưu được.");
    } finally {
      setBusy(false);
    }
  }

  const preview = Number(price);
  const previewOk = Number.isFinite(preview) && preview >= 0;

  return (
    <AdminRoleGate>
      {loading ? <PageLoading /> : null}
      {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}
      {data ? (
        <div>
          <PageHeader
            title="Cấu hình giá tin nhắn"
            description="Giá mặc định VND cho mỗi tin ZNS khi template không có đơn giá riêng (ADMIN chỉnh trên template)."
          />
          <Card className="max-w-lg space-y-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Giá mặc định (VND / tin)</label>
              <Input
                type="number"
                min={0}
                step={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="400"
              />
            </div>
            {previewOk ? (
              <p className="text-sm text-muted-foreground">
                Ví dụ: 10 tin × {formatVND(preview)} = <strong>{formatVND(preview * 10)}</strong>
              </p>
            ) : null}
            <Button type="button" disabled={busy} onClick={() => void save()}>
              Lưu cấu hình
            </Button>
            {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
          </Card>
        </div>
      ) : null}
    </AdminRoleGate>
  );
}
