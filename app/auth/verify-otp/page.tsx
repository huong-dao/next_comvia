"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HiMiniClock, HiOutlinePencil } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { postLoginPathForRole, saveAuthSession } from "@/lib/auth";
import {
  clearPendingOtpContext,
  getPendingOtpContext,
  updatePendingOtpDemoCode,
} from "@/lib/otp-context";

type VerifyOtpResponse = {
  accessToken: string;
  user?: {
    id?: string;
    email?: string;
    fullName?: string;
    role?: string;
  };
};

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const otpRequestId = searchParams.get("otpRequestId") ?? "";
  const [email, setEmail] = useState("");
  const [purpose, setPurpose] = useState("REGISTER");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [demoOtpCode, setDemoOtpCode] = useState("");

  useEffect(() => {
    if (!otpRequestId) {
      setError("Thiếu otpRequestId. Vui lòng đăng ký lại.");
      return;
    }

    const context = getPendingOtpContext(otpRequestId);
    if (!context) {
      setError("Phiên xác thực OTP không hợp lệ hoặc đã hết hạn. Vui lòng đăng ký lại.");
      return;
    }

    setEmail(context.email);
    setPurpose(context.purpose);
    setDemoOtpCode(context.demoOtpCode || "");
  }, [otpRequestId]);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => setCooldown((prev) => Math.max(prev - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const otpChars = useMemo(() => Array.from({ length: 6 }, (_, i) => otpCode[i] ?? ""), [otpCode]);

  function updateOtp(value: string) {
    const sanitized = value.replace(/\D/g, "").slice(0, 6);
    setOtpCode(sanitized);
    if (error) setError("");
  }

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email) {
      setError("Thiếu email đăng ký. Vui lòng đăng ký lại.");
      return;
    }

    if (otpCode.length !== 6) {
      setError("Mã OTP phải đủ 6 ký tự.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:3000";

      const response = await fetch(`${baseUrl}/auth/otp/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetType: "EMAIL",
          targetValue: email,
          purpose,
          otpCode,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string | string[]; error?: string }
        | VerifyOtpResponse
        | null;

      if (!response.ok) {
        const apiError = payload as { message?: string | string[]; error?: string } | null;
        const message =
          (typeof apiError?.message === "string" && apiError.message) ||
          (Array.isArray(apiError?.message) && apiError.message.join(", ")) ||
          apiError?.error ||
          "Mã xác thực không hợp lệ. Vui lòng kiểm tra lại.";
        setError(message);
        return;
      }

      const data = payload as VerifyOtpResponse | null;
      if (!data?.accessToken) {
        setError("API không trả về access token hợp lệ.");
        return;
      }

      saveAuthSession({
        accessToken: data.accessToken,
        user: data.user,
        remember: true,
      });
      clearPendingOtpContext(otpRequestId);

      router.push(postLoginPathForRole(data.user?.role));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể kết nối server. Kiểm tra backend ở localhost:3000.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!email || cooldown > 0 || isResending) return;

    setIsResending(true);
    setError("");

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/auth/otp/resend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetType: "EMAIL",
          targetValue: email,
          purpose,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string | string[]; error?: string; demoOtpCode?: string }
        | null;

      if (!response.ok) {
        const message =
          (typeof payload?.message === "string" && payload.message) ||
          (Array.isArray(payload?.message) && payload.message.join(", ")) ||
          payload?.error ||
          "Không thể gửi lại OTP.";
        setError(message);
        return;
      }

      setCooldown(60);
      if (payload?.demoOtpCode) {
        setDemoOtpCode(payload.demoOtpCode);
        updatePendingOtpDemoCode(otpRequestId, payload.demoOtpCode);
      }
    } catch {
      setError("Không thể gửi lại OTP.");
    } finally {
      setIsResending(false);
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
            COMVIA
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/auth/login">
              <Button variant="ghost">Đăng nhập</Button>
            </Link>
            <Link href="/auth/register">
              <Button>Đăng ký</Button>
            </Link>
          </div>
        </header>

        <section className="mx-auto my-auto w-full max-w-[400px] py-8 text-center">
          <h1 className="text-[24px] font-semibold tracking-tight text-foreground sm:text-[32px]">Xác thực OTP</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-lg">
            Chúng tôi đã gửi mã xác thực đến email
          </p>
          <p className="text-md font-semibold text-primary sm:text-lg">{email || "user.contact@example.com"}</p>

          <div className="mt-8 rounded-[20px] border border-border bg-card/90 p-7 shadow-[var(--shadow-soft)] backdrop-blur-xl dark:border-[#233256] dark:bg-[#0f1a33]/92">
            <form onSubmit={handleVerify} className="space-y-5">
              <input
                ref={inputRef}
                value={otpCode}
                onChange={(event) => updateOtp(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="sr-only"
              />

              <div
                className="grid grid-cols-6 gap-3"
                onClick={() => inputRef.current?.focus()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    inputRef.current?.focus();
                  }
                }}
              >
                {otpChars.map((char, index) => (
                  <Input
                    key={index}
                    readOnly
                    value={char}
                    forceActive={index === otpCode.length && otpCode.length < 6}
                    className="pointer-events-none h-12 rounded-2xl px-0 text-center text-3xl font-semibold dark:border-[#223155] dark:bg-[#1c2747] dark:text-[#dbe7ff]"
                  />
                ))}
              </div>

              {error ? (
                <p className="text-left text-base text-danger">
                  {error}
                </p>
              ) : null}

              {demoOtpCode ? (
                <p className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
                  Demo OTP: <strong>{demoOtpCode}</strong>
                </p>
              ) : null}

              <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Đang xác thực..." : "Xác thực OTP"}
              </Button>
            </form>

            <div className="mt-6 space-y-3 text-base text-muted-foreground">
              <Button
                type="button"
                variant="ghost"
                onClick={handleResend}
                disabled={cooldown > 0 || isResending}
                className="mx-auto"
              >
                <HiMiniClock className="size-4" />
                {cooldown > 0 ? `Gửi lại mã trong ${cooldown}s` : isResending ? "Đang gửi..." : "Gửi lại OTP"}
              </Button>

              <div className="flex justify-center">
                <Link href="/auth/register">
                  <Button variant="ghost" className="text-primary hover:text-primary-hover">
                    <HiOutlinePencil className="size-4" />
                    Đổi email đăng ký
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-6 text-base text-muted-foreground">
            Quay lại{" "}
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

function VerifyOtpFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <p className="text-sm text-muted-foreground">Đang tải...</p>
    </main>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<VerifyOtpFallback />}>
      <VerifyOtpContent />
    </Suspense>
  );
}
