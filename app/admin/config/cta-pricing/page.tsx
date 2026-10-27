"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";
import { CTA_TYPE_OPTIONS, type TemplateCtaType } from "@/lib/template-cta";
import { useComviaQuery } from "@/lib/use-comvia-query";

type CtaPricing = Partial<Record<TemplateCtaType, number>>;

export default function AdminCtaPricingPage() {
  const fetcher = useCallback((token: string) => comviaFetch<CtaPricing>("/admin/config/cta-pricing", { token }), []);
  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);
  const [prices, setPrices] = useState<Partial<Record<TemplateCtaType, string>>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setPrices(Object.fromEntries(CTA_TYPE_OPTIONS.map((option) => [option.value, data[option.value] == null ? "" : String(data[option.value])])));
  }, [data]);

  async function save() {
    const values: CtaPricing = {};
    for (const option of CTA_TYPE_OPTIONS) {
      const raw = prices[option.value]?.trim() ?? "";
      if (!raw) continue;
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 0) {
        setMessage("Tất cả giá CTA cần là số nguyên không âm.");
        return;
      }
      values[option.value] = value;
    }
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setMessage(null);
    try {
      await comviaFetch("/admin/config/cta-pricing", { method: "PATCH", token, body: JSON.stringify({ prices: values }) });
      setMessage("Đã lưu cấu hình giá CTA. Giá mới chỉ áp dụng khi CTA được tạo hoặc cập nhật sau này.");
      void refetch();
    } catch (cause) {
      setMessage(cause instanceof ComviaApiError ? cause.message : "Không thể lưu cấu hình giá CTA.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminRoleGate>
      {loading && !data ? <PageLoading /> : null}
      {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}
      {data ? (
        <div>
          <PageHeader title="Cấu hình giá nút CTA" description="Đơn giá global được BE snapshot khi khách hàng tạo hoặc cập nhật nút CTA." />
          <Card className="max-w-3xl">
            <div className="mb-5 grid gap-2 border-b border-border/70 pb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid-cols-[1fr_180px]"><span>Loại nút CTA</span><span>Giá (VND)</span></div>
            <div className="space-y-4">
              {CTA_TYPE_OPTIONS.map((option) => (
                <div key={option.value} className="grid gap-2 sm:grid-cols-[1fr_180px] sm:items-center">
                  <div><p className="font-medium">{option.label}</p><p className="text-xs text-muted-foreground">{option.value}</p></div>
                  <Input type="number" min={0} step={1} value={prices[option.value] ?? ""} onChange={(event) => setPrices((current) => ({ ...current, [option.value]: event.target.value }))} placeholder="Chưa cấu hình" />
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border/70 pt-4">
              <Button type="button" disabled={busy} onClick={() => void save()}>{busy ? "Đang lưu..." : "Lưu cấu hình"}</Button>
              {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
            </div>
          </Card>
        </div>
      ) : null}
    </AdminRoleGate>
  );
}
