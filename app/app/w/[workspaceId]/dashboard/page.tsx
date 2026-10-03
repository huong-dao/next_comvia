"use client";

import Link from "next/link";
import { HiOutlineDocumentText, HiOutlineCreditCard, HiOutlinePaperAirplane, HiMiniPlus } from "react-icons/hi2";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { OverviewSection } from "@/components/app/overview-section";
import { OaInfoBox } from "@/components/oa/oa-info-box";
import { DashboardTemplateList } from "@/components/template/dashboard-template-list";
import { WalletSection } from "@/components/wallet/wallet-section";
import { isWorkspaceOwner, useWorkspaceContext } from "@/components/workspace/workspace-gate";
import { Button } from "@/components/ui/button";
import { workspacePath } from "@/lib/paths";

export default function DashboardPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const { role } = useWorkspaceContext();
  const owner = isWorkspaceOwner(role);

  return (
    <div>
      <PageHeader
        // eyebrow="Dashboard"
        title="Chào mừng bạn đến với Comvia!"
        description="Quản lý OA, mẫu tin Zalo và kết nối khách hàng dễ dàng hơn mỗi ngày."
        // actions={
        //   owner ? (
        //     <EntityStatusBadge value="OWNER" />
        //   ) : (
        //     <EntityStatusBadge value="MEMBER" />
        //   )
        // }
      />

      <OverviewSection />

      {/* Section OA (TICKET-014): trái = thông tin OA, phải = danh sách mẫu tin.
          Thứ tự dashboard theo PO: Tổng quan → Thông tin OA → Thông tin Ví. */}
      <section className="mb-6 grid gap-4 lg:grid-cols-5">
        <OaInfoBox className="lg:col-span-2" />
        <DashboardTemplateList className="lg:col-span-3" />
      </section>

      <WalletSection />

      <div className="flex flex-wrap gap-3">
        {owner ? (
          <Button icon={<HiOutlineCreditCard className="size-4" />} variant="secondary" asChild>
            <Link href={workspacePath(workspaceId, "topup")}>Nạp tiền</Link>
          </Button>
        ) : null}
        <Button icon={<HiMiniPlus className="size-4" />} variant="accent" asChild>
          <Link href={workspacePath(workspaceId, "templates", "new")}>Tạo template</Link>
        </Button>
        <Button icon={<HiOutlinePaperAirplane className="size-4" />} variant="outline" asChild>
          <Link href={workspacePath(workspaceId, "messages", "send-single")}>Gửi tin</Link>
        </Button>
        <Button icon={<HiOutlineDocumentText className="size-4" />} variant="outline" asChild>
          <Link href={workspacePath(workspaceId, "messages", "logs")}>Nhật ký tin</Link>
        </Button>
      </div>
    </div>
  );
}
