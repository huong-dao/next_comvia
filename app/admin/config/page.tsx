import Link from "next/link";
import { HiOutlineChatBubbleLeftRight, HiOutlineCursorArrowRays } from "react-icons/hi2";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";

const configItems = [
  {
    title: "Giá tin nhắn",
    description: "Cấu hình đơn giá mặc định cho mỗi tin ZBS.",
    href: "/admin/config/message-pricing",
    icon: HiOutlineChatBubbleLeftRight,
  },
  {
    title: "Giá nút CTA",
    description: "Cấu hình đơn giá global theo từng loại nút CTA.",
    href: "/admin/config/cta-pricing",
    icon: HiOutlineCursorArrowRays,
  },
];

export default function AdminConfigPage() {
  return (
    <AdminRoleGate>
      <div>
        <PageHeader title="Cấu hình chung" description="Các đơn giá được hệ thống áp dụng cho dữ liệu tạo mới hoặc cập nhật sau khi lưu." />
        <div className="grid gap-4 md:grid-cols-2">
          {configItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Card className="h-full transition hover:border-secondary/40 hover:bg-surface-muted/50">
                  <Icon className="mb-4 size-6 text-secondary" />
                  <h2 className="font-semibold text-foreground">{item.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </AdminRoleGate>
  );
}
