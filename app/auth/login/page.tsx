"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { HiOutlineEye, HiOutlineEyeOff, HiOutlineLockClosed, HiOutlineMail, HiOutlineKey } from "react-icons/hi";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/controls";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/cn";
import { getAccessToken, getStoredUser, postLoginPathForRole, saveAuthSession } from "@/lib/auth";
import { createOtpRequestId, savePendingOtpContext } from "@/lib/otp-context";

type LoginErrors = {
  email?: string;
  password?: string;
  form?: string;
};

type LoginResponse = {
  accessToken: string;
  tokenType?: string;
  user?: {
    id?: string;
    email?: string;
    fullName?: string;
    role?: string;
  };
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      router.replace(postLoginPathForRole(getStoredUser()?.role));
    }
  }, [router]);

  function validate(nextEmail: string, nextPassword: string) {
    const nextErrors: LoginErrors = {};

    if (!nextEmail.trim()) {
      nextErrors.email = "Email không được để trống.";
    } else if (!EMAIL_REGEX.test(nextEmail)) {
      nextErrors.email = "Email không đúng định dạng.";
    }

    if (!nextPassword) {
      nextErrors.password = "Mật khẩu không được để trống.";
    } else if (nextPassword.length < 8) {
      nextErrors.password = "Mật khẩu tối thiểu 8 ký tự.";
    }

    return nextErrors;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    const nextErrors = validate(email, password);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:3000";

      const response = await fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      let payload: unknown = null;
      const isJson = response.headers.get("content-type")?.includes("application/json");
      if (isJson) {
        payload = await response.json().catch(() => null);
      }

      if (!response.ok) {
        const apiError = payload as { message?: string | string[]; error?: string } | null;
        const message =
          (typeof apiError?.message === "string" && apiError.message) ||
          (Array.isArray(apiError?.message) && apiError.message.join(", ")) ||
          apiError?.error ||
          "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.";

        const normalizedMessage = message.toLowerCase();
        const isUnverifiedError =
          normalizedMessage.includes("not verified") ||
          normalizedMessage.includes("chưa xác thực") ||
          normalizedMessage.includes("unverified") ||
          normalizedMessage.includes("pending_verification");

        if (isUnverifiedError) {
          const otpRequestId = createOtpRequestId();
          savePendingOtpContext({
            otpRequestId,
            email: email.trim(),
            purpose: "REGISTER",
          });

          router.push(`/auth/verify-otp?otpRequestId=${encodeURIComponent(otpRequestId)}`);
          return;
        }

        setErrors({ form: message });
        return;
      }

      const data = payload as LoginResponse | null;
      if (!data?.accessToken) {
        setErrors({ form: "API không trả về access token hợp lệ." });
        return;
      }

      saveAuthSession({
        accessToken: data.accessToken,
        user: data.user,
        remember,
      });

      router.push(postLoginPathForRole(data.user?.role));
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

  function onEmailBlur() {
    if (!submitted) return;
    setErrors((prev) => ({ ...prev, ...validate(email, password) }));
  }

  function onPasswordBlur() {
    if (!submitted) return;
    setErrors((prev) => ({ ...prev, ...validate(email, password) }));
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
            <Image src="/images/comvia_light_logo.png" alt="COMVIA" height={36} className="cv-light-logo" />
            <Image src="/images/comvia_dark_logo.png" alt="COMVIA" height={36} className="cv-dark-logo" />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost">
              Đăng nhập
            </Button>
            <Button>Đăng ký</Button>
          </div>
        </header>

        <section className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <div className="mb-7 text-center">
            <h1 className="text-[24px] font-semibold tracking-tight text-foreground sm:text-[32px]">Chào mừng trở lại</h1>
          </div>

          <div className="rounded-[20px] border border-border bg-card/90 p-7 shadow-[var(--shadow-soft)] backdrop-blur-xl dark:border-[#233256] dark:bg-[#0f1a33]/92 dark:shadow-[0_22px_50px_rgba(4,10,27,0.6)]">
            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div>
                <label className="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground dark:text-[#94a4c6]">Email</label>
                <div className="relative">
                  <Input
                    type="email"
                    placeholder="name@company.com"
                    leadingIcon={<HiOutlineMail className="size-[18px]" />}
                    invalid={Boolean(errors.email)}
                    errorMessage={errors.email}
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    onBlur={onEmailBlur}
                    className={cn(
                      " rounded-xl border-border bg-surface-muted pr-11 text-base text-foreground placeholder:text-muted-foreground focus:border-primary dark:border-[#223155] dark:bg-[#1c2747] dark:text-[#dbe7ff] dark:placeholder:text-[#7380a4]",
                    )}
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground dark:text-[#94a4c6]">Mật khẩu</label>
                  <Link href="/auth/forgot-password" className="text-[12px] font-semibold text-primary hover:text-primary-hover">
                    Quên mật khẩu?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    leadingIcon={<HiOutlineLockClosed className="size-[18px]" />}
                    invalid={Boolean(errors.password)}
                    errorMessage={errors.password}
                    trailingAction={
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-surface-muted hover:text-foreground dark:text-[#63759d] dark:hover:bg-white/10 dark:hover:text-white"
                        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showPassword ? (
                          <HiOutlineEyeOff className="size-[18px]" aria-hidden="true" />
                        ) : (
                          <HiOutlineEye className="size-[18px]" aria-hidden="true" />
                        )}
                      </button>
                    }
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    onBlur={onPasswordBlur}
                    className={cn(
                      " rounded-xl border-border bg-surface-muted pr-11 text-base text-foreground placeholder:text-muted-foreground focus:border-primary dark:border-[#223155] dark:bg-[#1c2747] dark:text-[#dbe7ff] dark:placeholder:text-[#7380a4]",
                    )}
                  />
                </div>
              </div>

              <div className="text-muted-foreground dark:text-[#b9c6dd]">
                <Checkbox
                  checked={remember}
                  onCheckedChange={setRemember}
                  label="Ghi nhớ đăng nhập"
                />
              </div>

              {errors.form ? (
                <p className="rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-red-200">{errors.form}</p>
              ) : null}

              <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>

              <div className="pt-2">
                <p className="text-center text-[11px] uppercase tracking-[0.25em] text-muted-foreground/70 dark:text-[#4c5f85]">Hoặc tiếp tục với</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
                    <FcGoogle className="size-[18px]" aria-hidden="true" />
                    Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
                    <HiOutlineKey className="size-[18px]" aria-hidden="true" />
                    SSO
                  </Button>
                </div>
              </div>
            </form>
          </div>

          <p className="mt-7 text-center text-[16px] text-muted-foreground dark:text-[#b7c3dc]">
            Chưa có tài khoản?{" "}
            <Link href="/auth/register" className="font-semibold text-primary hover:text-primary-hover">
              Đăng ký ngay
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
