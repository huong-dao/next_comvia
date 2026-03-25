"use client";

import { useCallback, useState } from "react";
import { HiOutlineClipboardDocumentList, HiOutlineDocumentDuplicate } from "react-icons/hi2";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { comviaFetch } from "@/lib/comviaFetch";
import { useComviaQuery } from "@/lib/use-comvia-query";

export default function AdminQuickChatToolsPage() {
  const fetcher = useCallback((token: string) => comviaFetch<unknown>("/admin/quick-chat/tools", { token }), []);
  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);
  const [copied, setCopied] = useState<string | null>(null);

  const text = data === undefined || data === null ? "" : typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const tools =
    Array.isArray(data) && data.every((item) => typeof item === "string")
      ? (data as string[])
      : [];

  async function copy(value: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(value);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <AdminRoleGate>
      {loading ? <PageLoading /> : null}
      {error ? <PageError message={error} onRetry={() => void refetch()} /> : null}
      {!loading && !error ? (
        <div>
          <PageHeader
            title="Quick Chat — Tools"
            description="Danh sách tool name read-only theo `GET /admin/quick-chat/tools`, có thể sao chép từng tool hoặc toàn bộ payload."
          />
          {tools.length > 0 ? (
            <div className="space-y-4">
              <Card className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <HiOutlineClipboardDocumentList className="size-5 text-secondary" />
                    <p className="text-base font-semibold text-foreground">Tool names</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => void copy(text)} disabled={!text} icon={<HiOutlineDocumentDuplicate className="size-4" />}>
                    {copied === text ? "Đã copy" : "Copy tất cả"}
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {tools.map((tool) => (
                    <div key={tool} className="rounded-xl border border-border/70 bg-surface-muted/40 p-4">
                      <p className="font-mono text-sm text-foreground">{tool}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-3"
                        onClick={() => void copy(tool)}
                        icon={<HiOutlineDocumentDuplicate className="size-4" />}
                      >
                        {copied === tool ? "Đã copy" : "Copy tool"}
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="space-y-3 p-4">
                <p className="text-sm font-semibold text-foreground">Raw response</p>
                <pre className="max-h-[320px] overflow-auto rounded-lg bg-surface-muted p-3 text-xs">{text || "—"}</pre>
              </Card>
            </div>
          ) : (
            <Card className="space-y-3 p-4">
              <Button type="button" variant="outline" size="sm" onClick={() => void copy(text)} disabled={!text} icon={<HiOutlineDocumentDuplicate className="size-4" />}>
                {copied === text ? "Đã copy" : "Copy JSON"}
              </Button>
              <pre className="max-h-[480px] overflow-auto rounded-lg bg-surface-muted p-3 text-xs">{text || "—"}</pre>
            </Card>
          )}
        </div>
      ) : null}
    </AdminRoleGate>
  );
}
