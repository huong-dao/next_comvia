"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HiOutlineKey, HiOutlineLockClosed, HiOutlineMail } from "react-icons/hi";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAlertModal } from "@/components/ui/alert-modal";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUEST_MESSAGE = "Nếu email này thuộc một tài khoản, hướng dẫn đặt lại mật khẩu đã được gửi.";

type FieldErrors = {
  email?: string;
  otpCode?: string;
  password?: string;
  confirmPassword?: string;
};

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { showAlert } = useAlertModal();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [requestMessage, setRequestMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validateRequest() {
    if (!email.trim()) return { email: "Email không được để trống." };
    if (!EMAIL_REGEX.test(email.trim())) return { email: "Email không đúng định dạng." };
    return {};
  }

  function validateReset() {
    const nextErrors: FieldErrors = {};
    if (otpCode.length !== 6) nextErrors.otpCode = "OTP phải gồm 6 chữ số.";
    if (password.length < 8) nextErrors.password = "Mật khẩu tối thiểu 8 ký tự.";
    if (confirmPassword !== password) nextErrors.confirmPassword = "Mật khẩu xác nhận không khớp.";
    return nextErrors;
  }

  async function requestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateRequest();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setRequestMessage(null);
    try {
      const response = await comviaFetch<{ message?: string }>("/auth/forgot-password/request", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setRequestMessage(response.message || REQUEST_MESSAGE);
      setStep("reset");
    } catch {
      showAlert({ type: "error", message: "Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại." });
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateReset();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await comviaFetch("/auth/forgot-password/reset", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), otpCode, password }),
      });
      showAlert({ type: "success", message: "Mật khẩu đã được đặt lại thành công." });
      router.replace("/auth/login");
    } catch (error) {
      if (error instanceof ComviaApiError && error.statusCode === 401) {
        setErrors({ otpCode: "OTP không hợp lệ, đã hết hạn hoặc đã được sử dụng." });
      } else if (error instanceof ComviaApiError && error.statusCode === 400) {
        showAlert({ type: "error", message: error.message });
      } else {
        showAlert({ type: "error", message: "Không thể đặt lại mật khẩu. Vui lòng thử lại." });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <PageHeader
          title="Quên mật khẩu"
          description={step === "request" ? "Nhập email để nhận mã OTP đặt lại mật khẩu." : "Nhập mã OTP từ email và mật khẩu mới."}
        />
        <Card className="space-y-5">
          {step === "request" ? (
            <form className="space-y-5" onSubmit={(event) => void requestReset(event)}>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  value={email}
                  leadingIcon={<HiOutlineMail className="size-5" />}
                  placeholder="name@company.com"
                  invalid={Boolean(errors.email)}
                  errorMessage={errors.email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setErrors({});
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground">Nếu email thuộc một tài khoản, hệ thống sẽ gửi hướng dẫn đặt lại mật khẩu.</p>
              <Button className="w-full" type="submit" disabled={submitting}>
                {submitting ? "Đang gửi…" : "Gửi mã OTP"}
              </Button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={(event) => void resetPassword(event)}>
              {requestMessage ? <p className="rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary">{requestMessage}</p> : null}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Email</label>
                <Input value={email} leadingIcon={<HiOutlineMail className="size-5" />} readOnly />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Mã OTP</label>
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otpCode}
                  leadingIcon={<HiOutlineKey className="size-5" />}
                  placeholder="123456"
                  maxLength={6}
                  invalid={Boolean(errors.otpCode)}
                  errorMessage={errors.otpCode}
                  onChange={(event) => {
                    setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    setErrors((previous) => ({ ...previous, otpCode: undefined }));
                  }}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Mật khẩu mới</label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  leadingIcon={<HiOutlineLockClosed className="size-5" />}
                  invalid={Boolean(errors.password)}
                  errorMessage={errors.password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setErrors((previous) => ({ ...previous, password: undefined }));
                  }}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Xác nhận mật khẩu mới</label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  leadingIcon={<HiOutlineLockClosed className="size-5" />}
                  invalid={Boolean(errors.confirmPassword)}
                  errorMessage={errors.confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setErrors((previous) => ({ ...previous, confirmPassword: undefined }));
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="button" variant="outline" disabled={submitting} onClick={() => setStep("request")}>
                  Đổi email
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Đang đặt lại…" : "Đặt lại mật khẩu"}
                </Button>
              </div>
            </form>
          )}
          <Button className="w-full" variant="ghost" asChild>
            <Link href="/auth/login">Quay lại đăng nhập</Link>
          </Button>
        </Card>
      </div>
    </main>
  );
}
