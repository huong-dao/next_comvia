"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { clearAuthSession, getAccessToken } from "@/lib/auth";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { APP_PATHS } from "@/lib/paths";
import { clearActiveWorkspace } from "@/lib/workspace-session";

export function SecuritySettingsPage({
  profileHref = APP_PATHS.profile,
  profileLabel = "Hồ sơ",
}: {
  profileHref?: string;
  profileLabel?: string;
}) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (currentPassword.length < 8 || newPassword.length < 8) {
      setError("Mật khẩu hiện tại và mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (newPassword !== confirmation) {
      setError("Xác nhận mật khẩu mới không khớp.");
      return;
    }
    const token = getAccessToken();
    if (!token) {
      clearActiveWorkspace();
      clearAuthSession();
      router.replace("/auth/login");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await comviaFetch("/auth/change-password", {
        method: "POST",
        token,
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      clearActiveWorkspace();
      clearAuthSession();
      router.replace("/auth/login");
    } catch (changeError) {
      setError(changeError instanceof ComviaApiError ? changeError.message : "Không thể đổi mật khẩu. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        // eyebrow="Cài đặt"
        title="Bảo mật"
        // description="Đổi mật khẩu và quản lý phiên — placeholder theo sitemap; kết nối API khi backend sẵn sàng."
        actions={
          <Button variant="outline" asChild>
            <Link href={profileHref}>{profileLabel}</Link>
          </Button>
        }
      />

      <div className="grid max-w-xl gap-6">
        <Card className="space-y-4">
          <p className="text-sm font-semibold text-foreground">Đổi mật khẩu</p>
          <form className="space-y-4" onSubmit={(event) => void changePassword(event)}>
            <Input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Mật khẩu hiện tại" minLength={8} disabled={submitting} required />
            <Input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Mật khẩu mới (ít nhất 8 ký tự)" minLength={8} disabled={submitting} required />
            <Input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Xác nhận mật khẩu mới" minLength={8} disabled={submitting} required />
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" disabled={submitting}>
              {submitting ? "Đang cập nhật…" : "Cập nhật mật khẩu"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">Sau khi đổi mật khẩu, bạn sẽ được đăng xuất khỏi tất cả phiên và cần đăng nhập lại.</p>
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

export default function TenantSecuritySettingsPage() {
  return <SecuritySettingsPage />;
}
