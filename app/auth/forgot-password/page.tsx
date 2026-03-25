"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <PageHeader
          title="Quên mật khẩu"
          description="Theo sitemap đây là placeholder phase sau — flow OTP/reset sẽ nối backend khi có API."
        />
        <Card className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tính năng đang được chuẩn bị. Vui lòng liên hệ quản trị hoặc dùng tài khoản demo nếu có.
          </p>
          <Button asChild>
            <Link href="/auth/login">Quay lại đăng nhập</Link>
          </Button>
        </Card>
      </div>
    </main>
  );
}
