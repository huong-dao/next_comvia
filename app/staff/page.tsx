"use client";

import Link from "next/link";
import { useCallback } from "react";
import {
  HiOutlineBolt,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentList,
  HiOutlineClock,
  HiOutlineNoSymbol,
  HiOutlineXCircle,
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
    title: "Submitted",
    href: "/staff/templates-review/submitted",
    icon: HiOutlineClipboardDocumentList,
    status: "SUBMITTED",
    description: "Template mới submit chờ staff xử lý.",
  },
  {
    title: "Pending Zalo Approval",
    href: "/staff/templates-review/pending-zalo-approval",
    icon: HiOutlineClock,
    status: "PENDING_ZALO_APPROVAL",
    description: "Template đang ở bước pending để theo dõi tiếp.",
  },
  {
    title: "Approved",
    href: "/staff/templates-review/approved",
    icon: HiOutlineCheckCircle,
    status: "APPROVED",
    description: "Danh sách template đã duyệt để tra cứu nhanh.",
  },
  {
    title: "Rejected",
    href: "/staff/templates-review/rejected",
    icon: HiOutlineXCircle,
    status: "REJECTED",
    description: "Theo dõi template bị từ chối và lý do kèm theo.",
  },
  {
    title: "Disabled",
    href: "/staff/templates-review/disabled",
    icon: HiOutlineNoSymbol,
    status: "DISABLED",
    description: "Template đã disable để phục vụ xác minh vận hành.",
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
            title="Staff hub"
            description="Khu vực nội bộ cho review template toàn cục và internal quick chat theo đúng router map STAFF."
            actions={
              <Button variant="outline" asChild icon={<HiOutlineBolt className="size-4" />}>
                <Link href="/staff/internal-quick-chat">Mở Internal Quick Chat</Link>
              </Button>
            }
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
                    <Link href={queue.href}>Mở queue</Link>
                  </Button>
                </Card>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
            <Card className="space-y-4">
              <div>
                <p className="text-base font-semibold text-foreground">Review template nội bộ</p>
                <p className="text-sm text-muted-foreground">
                  Staff không phụ thuộc membership workspace. Tất cả queue đều lấy từ `GET /internal/templates`.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild icon={<HiOutlineClipboardDocumentList className="size-4" />}>
                  <Link href="/staff/templates-review/submitted">Queue submitted</Link>
                </Button>
                <Button variant="outline" asChild icon={<HiOutlineClock className="size-4" />}>
                  <Link href="/staff/templates-review/pending-zalo-approval">Pending Zalo Approval</Link>
                </Button>
              </div>
            </Card>

            <Card className="space-y-4">
              <div>
                <p className="text-base font-semibold text-foreground">Internal Quick Chat</p>
                <p className="text-sm text-muted-foreground">
                  Dùng để tạo session theo `workspaceId` mục tiêu, gửi message và confirm action nội bộ.
                </p>
              </div>
              <Button variant="outline" asChild icon={<HiOutlineBolt className="size-4" />}>
                <Link href="/staff/internal-quick-chat">Vào playground</Link>
              </Button>
            </Card>
          </div>
        </div>
      ) : null}
    </StaffRoleGate>
  );
}
