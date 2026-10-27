"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";
import { ctaTypeLabel, type TemplateCtaType } from "@/lib/template-cta";
import { useComviaQuery } from "@/lib/use-comvia-query";

type AdminCta = { id: string; type: TemplateCtaType; label?: string | null; target?: string | null; position?: number; defaultUnitPrice?: number | null; unitPrice?: number | null };
type TemplateDetail = {
  id: string; name?: string; code?: string; status?: string; content?: string;
  workspace?: { id?: string; name?: string }; oaConnection?: { id?: string; oaName?: string; name?: string };
  ctaButtons?: AdminCta[];
};

export default function AdminTemplateDetailPage() {
  const params = useParams<{ templateId: string }>();
  const templateId = params.templateId;
  const fetcher = useCallback((token: string) => comviaFetch<TemplateDetail>("/admin/templates/" + templateId, { token }), [templateId]);
  const { data, loading, error, refetch } = useComviaQuery(Boolean(templateId), fetcher);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setPrices(Object.fromEntries((data.ctaButtons ?? []).map((button) => [button.id, button.unitPrice == null ? "" : String(button.unitPrice)])));
  }, [data]);

  async function savePrice(button: AdminCta) {
    const raw = prices[button.id] ?? "";
    const unitPrice = raw.trim() === "" ? null : Number(raw);
    if (unitPrice !== null && (!Number.isInteger(unitPrice) || unitPrice < 0)) {
      setMessage("Giá override phải là số nguyên không âm.");
      return;
    }
    const token = getAccessToken();
    if (!token) return;
    setSaving(button.id);
    setMessage(null);
    try {
      await comviaFetch("/admin/templates/" + templateId + "/cta-buttons/" + button.id + "/unit-price", {
        method: "PATCH", token, body: JSON.stringify({ unitPrice }),
      });
      setMessage(unitPrice === null ? "Đã xoá giá override." : "Đã lưu giá override.");
      void refetch();
    } catch (cause) {
      setMessage(cause instanceof ComviaApiError ? cause.message : "Không thể lưu giá CTA.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <AdminRoleGate>
      {loading && !data ? <PageLoading /> : null}
      {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}
      {data ? (
        <div>
          <PageHeader title={data.name ?? data.code ?? "Mẫu tin ZBS"} description="Cấu hình giá override cho từng nút CTA của mẫu tin." actions={<Button variant="outline" asChild><Link href="/admin/templates">Quay lại danh sách</Link></Button>} />
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <Card><p className="text-xs text-muted-foreground">Workspace</p><p className="mt-1 font-semibold">{data.workspace?.name ?? data.workspace?.id ?? "—"}</p></Card>
            <Card><p className="text-xs text-muted-foreground">Zalo OA</p><p className="mt-1 font-semibold">{data.oaConnection?.oaName ?? data.oaConnection?.name ?? "—"}</p></Card>
            <Card><p className="text-xs text-muted-foreground">Trạng thái</p><p className="mt-1 font-semibold">{data.status ?? "—"}</p></Card>
          </div>
          <Card className="mb-6"><p className="mb-2 text-sm font-semibold">Nội dung</p><p className="whitespace-pre-wrap text-sm text-muted-foreground">{data.content ?? "—"}</p></Card>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Nút CTA</h2>
            {(data.ctaButtons ?? []).length === 0 ? <Card>Không có nút CTA.</Card> : null}
            {(data.ctaButtons ?? []).map((button) => (
              <Card key={button.id} className="grid gap-4 lg:grid-cols-[1fr_180px_auto] lg:items-end">
                <div>
                  <p className="font-semibold">{button.label || ctaTypeLabel(button.type)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{ctaTypeLabel(button.type)} · {button.target || "Không có đích đến"}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Giá snapshot: {button.defaultUnitPrice ?? 0} VND · Giá hiệu lực: {button.unitPrice ?? button.defaultUnitPrice ?? 0} VND</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Giá override (VND)</label>
                  <Input type="number" min={0} step={1} value={prices[button.id] ?? ""} onChange={(event) => setPrices((current) => ({ ...current, [button.id]: event.target.value }))} placeholder="Dùng giá snapshot" />
                </div>
                <Button type="button" disabled={saving === button.id} onClick={() => void savePrice(button)}>{saving === button.id ? "Đang lưu..." : "Lưu giá"}</Button>
              </Card>
            ))}
          </div>
          {message ? <p className="mt-4 text-sm text-muted-foreground">{message}</p> : null}
        </div>
      ) : null}
    </AdminRoleGate>
  );
}
