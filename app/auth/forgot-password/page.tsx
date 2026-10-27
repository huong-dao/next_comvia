"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HiOutlineKey, HiOutlineLockClosed, HiOutlineMail } from "react-icons/hi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAlertModal } from "@/components/ui/alert-modal";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUEST_MESSAGE = "Nếu email này thuộc một tài khoản, hướng dẫn đặt lại mật khẩu đã được gửi.";
const LABEL_CLASS = "mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground dark:text-[#94a4c6]";
const INPUT_CLASS = "rounded-xl border-border bg-surface-muted text-base text-foreground placeholder:text-muted-foreground focus:border-primary dark:border-[#223155] dark:bg-[#1c2747] dark:text-[#dbe7ff] dark:placeholder:text-[#7380a4]";

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
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-44 top-[-40px] h-[460px] w-[460px] rounded-full bg-primary/20 blur-[115px] dark:bg-primary/20" />
        <div className="absolute right-[-120px] top-16 h-[440px] w-[440px] rounded-full bg-secondary/20 blur-[110px] dark:bg-secondary/25" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 pb-7 pt-6 sm:px-6">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-3xl font-bold tracking-tight text-secondary">
            <Image src="/images/comvia_light_logo.png" alt="COMVIA" width={176} height={46} className="cv-light-logo h-[46px] block dark:hidden" />
            <Image src="/images/comvia_dark_logo.png" alt="COMVIA" width={176} height={46} className="cv-dark-logo h-[46px] hidden dark:block" />
          </Link>
          <ThemeToggle />
        </header>

        <section className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <div className="mb-7 text-center">
            <h1 className="text-[24px] font-semibold tracking-tight text-foreground sm:text-[26px]">
              {step === "request" ? "Khôi phục mật khẩu" : "Đặt mật khẩu mới"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground dark:text-[#b7c3dc]">
              {step === "request" ? "Nhập email để nhận mã OTP đặt lại mật khẩu." : "Nhập mã OTP từ email và mật khẩu mới."}
            </p>
          </div>

          <div className="rounded-[20px] border border-border bg-card/90 p-7 shadow-[var(--shadow-soft)] backdrop-blur-xl dark:border-[#233256] dark:bg-[#0f1a33]/92 dark:shadow-[0_22px_50px_rgba(4,10,27,0.6)]">
            {step === "request" ? (
              <form className="space-y-5" onSubmit={(event) => void requestReset(event)} noValidate>
                <div>
                  <label className={LABEL_CLASS}>Email</label>
                  <Input
                    type="email"
                    value={email}
                    leadingIcon={<HiOutlineMail className="size-[18px]" />}
                    placeholder="name@company.com"
                    className={INPUT_CLASS}
                    invalid={Boolean(errors.email)}
                    errorMessage={errors.email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setErrors({});
                    }}
                  />
                </div>
                <p className="text-sm text-muted-foreground dark:text-[#b7c3dc]">
                  Nếu email thuộc một tài khoản, hệ thống sẽ gửi hướng dẫn đặt lại mật khẩu.
                </p>
                <Button className="w-full" size="lg" type="submit" disabled={submitting}>
                  {submitting ? "Đang gửi…" : "Gửi mã OTP"}
                </Button>
              </form>
            ) : (
              <form className="space-y-5" onSubmit={(event) => void resetPassword(event)} noValidate>
                {requestMessage ? <p className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">{requestMessage}</p> : null}
                <div>
                  <label className={LABEL_CLASS}>Email</label>
                  <Input value={email} className={INPUT_CLASS} leadingIcon={<HiOutlineMail className="size-[18px]" />} readOnly />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Mã OTP</label>
                  <Input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otpCode}
                    className={INPUT_CLASS}
                    leadingIcon={<HiOutlineKey className="size-[18px]" />}
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
                  <label className={LABEL_CLASS}>Mật khẩu mới</label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    className={INPUT_CLASS}
                    leadingIcon={<HiOutlineLockClosed className="size-[18px]" />}
                    invalid={Boolean(errors.password)}
                    errorMessage={errors.password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setErrors((previous) => ({ ...previous, password: undefined }));
                    }}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>Xác nhận mật khẩu mới</label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    className={INPUT_CLASS}
                    leadingIcon={<HiOutlineLockClosed className="size-[18px]" />}
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
          </div>

          <p className="mt-7 text-center text-[16px] text-muted-foreground dark:text-[#b7c3dc]">
            Nhớ mật khẩu?{" "}
            <Link href="/auth/login" className="font-semibold text-primary hover:text-primary-hover">
              Đăng nhập
            </Link>
          </p>
        </section>

        <footer className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-4 text-sm text-muted-foreground dark:border-white/10 dark:text-white/35">
          <span className="font-semibold text-secondary">COMVIA</span>
          <div className="flex items-center gap-5">
            <Link href="#" className="hover:text-foreground dark:hover:text-white/70">Điều khoản</Link>
            <Link href="#" className="hover:text-foreground dark:hover:text-white/70">Bảo mật</Link>
            <Link href="#" className="hover:text-foreground dark:hover:text-white/70">Hỗ trợ</Link>
          </div>
          <span>© 2026 COMVIA. Tất cả quyền được bảo lưu.</span>
        </footer>
        <div className="mt-[35px] flex items-center justify-center rounded-[10px] bg-card/90 p-2 text-center text-sm shadow-[var(--shadow-soft)]">
          COMVIA một sản phẩm công nghệ của SoftX.asia
        </div>
      </div>
    </main>
  );
}
