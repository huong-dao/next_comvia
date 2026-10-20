"use client";

import Link from "next/link";
import { useCallback } from "react";
import {
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineClock,
  HiOutlineNoSymbol,
} from "react-icons/hi2";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { StaffRoleGate } from "@/components/admin/role-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { comviaFetch } from "@/lib/comviaFetch";
import { useComviaQuery } from "@/lib/use-comvia-query";

type TemplatePreview = { id: string };

const staffQueues = [
  {
    title: "Đã gửi",
    href: "/staff/templates-review/submitted",
    icon: HiOutlineClipboardDocumentList,
    status: "SUBMITTED",
    description: "Mẫu tin mới gửi chờ xử lý.",
  },
  {
    title: "Đang chờ duyệt",
    href: "/staff/templates-review/pending-zalo-approval",
    icon: HiOutlineClock,
    status: "PENDING_ZALO_APPROVAL",
    description: "Mẫu tin đang chờ Zalo duyệt.",
  },
  {
    title: "Đã duyệt",
    href: "/staff/templates-review/approved",
    icon: HiOutlineCheckCircle,
    status: "APPROVED",
    description: "Mẫu tin đã được duyệt.",
  },
  {
    title: "Khóa",
    href: "/staff/templates-review/disabled",
    icon: HiOutlineNoSymbol,
    status: "DISABLED",
    description: "Mẫu tin đã khóa.",
  },
] as const;

export default function StaffHomePage() {
  const fetcher = useCallback(async (token: string) => {
    const counts = await Promise.all(
      staffQueues.map(async (queue) => {
        const rows = await comviaFetch<TemplatePreview[]>(`/internal/templates?status=${queue.status}&limit=10`, {
          token,
        }).catch(() => []);
        return [queue.status, Array.isArray(rows) ? rows.length : 0] as const;
      }),
    );
    return Object.fromEntries(counts) as Record<(typeof staffQueues)[number]["status"], number>;
  }, []);

  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);

  return (
    <StaffRoleGate>
      {loading ? <PageLoading /> : null}
      {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}
      {!loading && data ? (
        <div>
          <PageHeader
            title="Staff Hub"
            description="Khu vực nội bộ để duyệt mẫu tin."
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {staffQueues.map((queue) => {
              const Icon = queue.icon;
              return (
                <Card key={queue.href} className="space-y-3">
                  <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-surface-muted text-secondary">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">{queue.title}</p>
                    <p className="mt-1 text-3xl font-semibold text-foreground">{data[queue.status] ?? 0}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{queue.description}</p>
                  </div>
                  <Button size="sm" variant="outline" asChild icon={<Icon className="size-4" />}>
                    <Link href={queue.href}>Xem tất cả</Link>
                  </Button>
                </Card>
              );
            })}
          </div>

          <div className="mt-6">
            <Card className="space-y-4">
              <div>
                <p className="text-base font-semibold text-foreground">Duyệt mẫu tin nội bộ</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild icon={<HiOutlineClipboardDocumentList className="size-4" />}>
                  <Link href="/staff/templates-review/submitted">Tất cả mẫu tin đã gửi</Link>
                </Button>
                <Button variant="outline" asChild icon={<HiOutlineClock className="size-4" />}>
                  <Link href="/staff/templates-review/pending-zalo-approval">Tất cả mẫu tin đang chờ duyệt</Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </StaffRoleGate>
  );
}
