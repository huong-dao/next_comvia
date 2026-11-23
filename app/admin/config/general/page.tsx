"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAccessToken } from "@/lib/auth";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { useComviaQuery } from "@/lib/use-comvia-query";
import { formatVND } from "@/lib/utils";

/** `GET/PATCH /admin/config/general` — admin map 8A. */
type GeneralConfig = {
  subscriptionExpiryReminderDays?: number | null;
  /** `0` hoặc `null` = tắt nhắc ví sắp hết. */
  walletLowBalanceThreshold?: number | null;
};

export default function AdminGeneralConfigPage() {
  const fetcher = useCallback(
    (token: string) => comviaFetch<GeneralConfig>("/admin/config/general", { token }),
    [],
  );
  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);
  const [reminderDays, setReminderDays] = useState("");
  const [threshold, setThreshold] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!data) return;
    setReminderDays(data.subscriptionExpiryReminderDays != null ? String(data.subscriptionExpiryReminderDays) : "");
    // null/0 = tắt → hiện ô trống (placeholder 0) thay vì số 0 gây hiểu nhầm là ngưỡng thật.
    setThreshold(data.walletLowBalanceThreshold ? String(data.walletLowBalanceThreshold) : "");
  }, [data]);

  async function save() {
    if (busy) return;
    const token = getAccessToken();
    if (!token) return;

    const days = Number(reminderDays);
    if (reminderDays.trim() === "" || !Number.isInteger(days) || days < 1 || days > 365) {
      setMsg({ tone: "error", text: "Số ngày nhắc hết hạn phải là số nguyên từ 1 đến 365." });
      return;
    }
    // Để trống = tắt → gửi 0 (hợp lệ theo contract: ≥ 0, 0 hoặc null = tắt).
    const limit = threshold.trim() === "" ? 0 : Number(threshold);
    if (!Number.isFinite(limit) || limit < 0) {
      setMsg({ tone: "error", text: "Ngưỡng ví phải là số tiền (VND) ≥ 0, hoặc để trống để tắt." });
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      await comviaFetch("/admin/config/general", {
        method: "PATCH",
        token,
        body: JSON.stringify({
          subscriptionExpiryReminderDays: days,
          walletLowBalanceThreshold: Math.round(limit),
        }),
      });
      setMsg({ tone: "ok", text: "Đã lưu cấu hình chung." });
      void refetch();
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ComviaApiError ? e.message : "Không lưu được cấu hình." });
    } finally {
      setBusy(false);
    }
  }

  const thresholdNum = Number(threshold);
  const thresholdOff = threshold.trim() === "" || thresholdNum === 0;

  return (
    <AdminRoleGate>
      {loading && !data ? <PageLoading /> : null}
      {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}
      {data ? (
        <div>
          <PageHeader
            title="Cấu hình nhắc nhở"
            description="Thông số email nhắc owner: gói sắp hết hạn và ví sắp hết tiền."
          />
          <Card className="max-w-lg space-y-5">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground" htmlFor="cfg-reminder-days">
                Nhắc trước khi gói hết hạn (ngày)
              </label>
              <Input
                id="cfg-reminder-days"
                type="number"
                min={1}
                max={365}
                step={1}
                value={reminderDays}
                onChange={(e) => setReminderDays(e.target.value)}
                placeholder="7"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Từ 1 đến 365 (mặc định 7). Email gửi owner, mỗi kỳ một lần.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground" htmlFor="cfg-wallet-threshold">
                Ngưỡng nhắc ví sắp hết (VND)
              </label>
              <Input
                id="cfg-wallet-threshold"
                type="number"
                min={0}
                step={1}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="0"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {thresholdOff
                  ? "Đang tắt nhắc ví sắp hết (để trống hoặc 0)."
                  : `Gửi email khi số dư ví ≤ ${formatVND(thresholdNum)}, tối đa 1 email/ngày cho mỗi ví.`}
              </p>
            </div>

            <Button type="button" disabled={busy} onClick={() => void save()}>
              {busy ? "Đang lưu…" : "Lưu cấu hình"}
            </Button>
            {msg ? (
              <p className={msg.tone === "error" ? "text-sm text-danger" : "text-sm text-muted-foreground"}>{msg.text}</p>
            ) : null}
          </Card>
        </div>
      ) : null}
    </AdminRoleGate>
  );
}
