"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { APP_PATHS } from "@/lib/paths";

export default function SecuritySettingsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Cài đặt"
        title="Bảo mật"
        // description="Đổi mật khẩu và quản lý phiên — placeholder theo sitemap; kết nối API khi backend sẵn sàng."
        actions={
          <Button variant="outline" asChild>
            <Link href={APP_PATHS.profile}>Hồ sơ</Link>
          </Button>
        }
      />

      <div className="grid max-w-xl gap-6">
        <Card className="space-y-4">
          <p className="text-sm font-semibold text-foreground">Đổi mật khẩu</p>
          <Input type="password" placeholder="Mật khẩu hiện tại" disabled />
          <Input type="password" placeholder="Mật khẩu mới" disabled />
          <Input type="password" placeholder="Xác nhận mật khẩu mới" disabled />
          <Button type="button" disabled>
            Cập nhật mật khẩu
          </Button>
          <p className="text-xs text-muted-foreground">Form tạm khóa — chờ endpoint đổi mật khẩu trong tài liệu API.</p>
        </Card>

        {/* <Card className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Phiên đăng nhập</p>
          <p className="text-sm text-muted-foreground">Quản lý thiết bị / đăng xuất mọi nơi — phase sau.</p>
          <Button type="button" variant="outline" disabled>
            Đăng xuất tất cả thiết bị
          </Button>
        </Card> */}
      </div>
    </div>
  );
}
