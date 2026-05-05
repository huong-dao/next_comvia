"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineEye, HiOutlineEyeOff, HiOutlineLockClosed, HiOutlineMail, HiOutlineUser } from "react-icons/hi";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/controls";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createOtpRequestId, savePendingOtpContext } from "@/lib/otp-context";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng ký",
};

type RegisterErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
  form?: string;
};

type RegisterResponse = {
  otpRequestId?: string;
  expiredAt?: string;
  demoOtpCode?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const nextErrors: RegisterErrors = {};

    if (!fullName.trim()) nextErrors.fullName = "Họ và tên không được để trống.";
    if (!email.trim()) nextErrors.email = "Email không được để trống.";
    else if (!EMAIL_REGEX.test(email)) nextErrors.email = "Email không đúng định dạng.";

    if (!password) nextErrors.password = "Mật khẩu không được để trống.";
    else if (password.length < 8) nextErrors.password = "Mật khẩu tối thiểu 8 ký tự.";

    if (!confirmPassword) nextErrors.confirmPassword = "Vui lòng nhập lại mật khẩu.";
    else if (confirmPassword !== password) nextErrors.confirmPassword = "Mật khẩu xác nhận không khớp.";

    if (!acceptedTerms) nextErrors.terms = "Bạn cần đồng ý điều khoản trước khi tạo tài khoản.";

    return nextErrors;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:3000";

      const response = await fetch(`${baseUrl}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string | string[]; error?: string }
        | RegisterResponse
        | null;

      if (!response.ok) {
        const apiError = payload as { message?: string | string[]; error?: string } | null;
        const message =
          (typeof apiError?.message === "string" && apiError.message) ||
          (Array.isArray(apiError?.message) && apiError.message.join(", ")) ||
          apiError?.error ||
          "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.";
        setErrors({ form: message });
        return;
      }

      const registerData = payload as RegisterResponse | null;
      const otpRequestId = registerData?.otpRequestId || createOtpRequestId();

      savePendingOtpContext({
        otpRequestId,
        email: email.trim(),
        purpose: "REGISTER",
        demoOtpCode: registerData?.demoOtpCode,
      });

      router.push(`/auth/verify-otp?otpRequestId=${encodeURIComponent(otpRequestId)}`);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể kết nối server. Kiểm tra backend ở localhost:3000.";
      setErrors({ form: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-44 top-[-40px] h-[460px] w-[460px] rounded-full bg-primary/20 blur-[115px]" />
        <div className="absolute right-[-120px] top-16 h-[440px] w-[440px] rounded-full bg-secondary/20 blur-[110px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 pb-7 pt-6 sm:px-6">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-3xl font-bold tracking-tight text-secondary">
          <Image
              src="/images/comvia_light_logo.png"
              alt="COMVIA"
              className="cv-light-logo h-[46px] block dark:hidden"
            />
            <Image
              src="/images/comvia_dark_logo.png"
              alt="COMVIA"
              className="cv-dark-logo h-[46px] hidden dark:block"
            />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/auth/login">
              <Button variant="ghost">Đăng nhập</Button>
            </Link>
            <Button>Đăng ký</Button>
          </div>
        </header>

        <section className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <div className="mb-6 text-center">
            <h1 className="text-[24px] font-semibold tracking-tight text-foreground sm:text-[32px]">
              Tạo tài khoản
            </h1>
          </div>

          <div className="rounded-[20px] border border-border bg-card/90 p-7 shadow-[var(--shadow-soft)] backdrop-blur-xl dark:border-[#233256] dark:bg-[#0f1a33]/92">
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <div>
                <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Họ và tên</label>
                <Input
                  placeholder="Nguyễn Văn A"
                  leadingIcon={<HiOutlineUser className="size-[18px]" />}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  invalid={Boolean(errors.fullName)}
                  errorMessage={errors.fullName}
                  className=" dark:border-[#223155] dark:bg-[#1c2747] dark:text-[#dbe7ff]"
                />
              </div>

              <div>
                <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Email công việc</label>
                <Input
                  type="email"
                  placeholder="name@company.com"
                  leadingIcon={<HiOutlineMail className="size-[18px]" />}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  invalid={Boolean(errors.email)}
                  errorMessage={errors.email}
                  className=" dark:border-[#223155] dark:bg-[#1c2747] dark:text-[#dbe7ff]"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Mật khẩu</label>
                  <span className="text-[11px] text-muted-foreground">Tối thiểu 8 ký tự</span>
                </div>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  leadingIcon={<HiOutlineLockClosed className="size-[18px]" />}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  invalid={Boolean(errors.password)}
                  errorMessage={errors.password}
                  trailingAction={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
                      aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    >
                      {showPassword ? (
                        <HiOutlineEyeOff className="size-[18px]" aria-hidden="true" />
                      ) : (
                        <HiOutlineEye className="size-[18px]" aria-hidden="true" />
                      )}
                    </button>
                  }
                  className=" dark:border-[#223155] dark:bg-[#1c2747] dark:text-[#dbe7ff]"
                />
              </div>

              <div>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Xác nhận mật khẩu"
                  leadingIcon={<HiOutlineLockClosed className="size-[18px]" />}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  invalid={Boolean(errors.confirmPassword)}
                  errorMessage={errors.confirmPassword}
                  className=" dark:border-[#223155] dark:bg-[#1c2747] dark:text-[#dbe7ff]"
                />
              </div>

              <div>
                <Checkbox
                  checked={acceptedTerms}
                  onCheckedChange={setAcceptedTerms}
                  allowWrap
                  label="Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của COMVIA."
                />
                {errors.terms ? <p className="mt-1 text-xs text-danger/90">{errors.terms}</p> : null}
              </div>

              {errors.form ? (
                <p className="rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {errors.form}
                </p>
              ) : null}

              <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
              </Button>
            </form>
          </div>

          <p className="mt-7 text-center text-[16px] text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link href="/auth/login" className="font-semibold text-primary hover:text-primary-hover">
              Đăng nhập
            </Link>
          </p>
        </section>

        <footer className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-4 text-sm text-muted-foreground dark:border-white/10 dark:text-white/35">
          <span className="font-semibold text-secondary">COMVIA</span>
          <div className="flex items-center gap-5">
            <Link href="#" className="hover:text-foreground dark:hover:text-white/70">
              Điều khoản
            </Link>
            <Link href="#" className="hover:text-foreground dark:hover:text-white/70">
              Bảo mật
            </Link>
            <Link href="#" className="hover:text-foreground dark:hover:text-white/70">
              Hỗ trợ
            </Link>
          </div>
          <span>© 2026 COMVIA. Tất cả quyền được bảo lưu.</span>
        </footer>
      </div>
    </main>
  );
}
