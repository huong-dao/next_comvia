export type PendingOtpContext = {
  otpRequestId: string;
  email: string;
  purpose: string;
  demoOtpCode?: string;
  expiredAt?: string;
};

export const OTP_VALIDITY_MINUTES = 5;
export const OTP_VALIDITY_MS = OTP_VALIDITY_MINUTES * 60 * 1000;

const OTP_CONTEXT_KEY = "comvia_pending_otp_context";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function createDefaultOtpExpiredAt(from = Date.now()) {
  return new Date(from + OTP_VALIDITY_MS).toISOString();
}

export function resolveOtpExpiredAtMs(expiredAt?: string) {
  if (expiredAt) {
    const parsed = Date.parse(expiredAt);
    if (!Number.isNaN(parsed)) return parsed;
  }

  return Date.now() + OTP_VALIDITY_MS;
}

export function getOtpRemainingSeconds(expiredAtMs: number) {
  return Math.max(0, Math.ceil((expiredAtMs - Date.now()) / 1000));
}

export function formatOtpCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function createOtpRequestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `otp_${Date.now()}`;
}

export function savePendingOtpContext(context: PendingOtpContext) {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(OTP_CONTEXT_KEY, JSON.stringify(context));
}

export function getPendingOtpContext(otpRequestId: string) {
  if (!canUseStorage()) return null;

  const raw = window.sessionStorage.getItem(OTP_CONTEXT_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PendingOtpContext;
    if (parsed.otpRequestId !== otpRequestId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function updatePendingOtpContext(
  otpRequestId: string,
  updates: Partial<Pick<PendingOtpContext, "demoOtpCode" | "expiredAt">>,
) {
  if (!canUseStorage()) return;
  const current = getPendingOtpContext(otpRequestId);
  if (!current) return;
  savePendingOtpContext({ ...current, ...updates });
}

export function clearPendingOtpContext(otpRequestId?: string) {
  if (!canUseStorage()) return;
  if (!otpRequestId) {
    window.sessionStorage.removeItem(OTP_CONTEXT_KEY);
    return;
  }

  const current = getPendingOtpContext(otpRequestId);
  if (!current) return;
  window.sessionStorage.removeItem(OTP_CONTEXT_KEY);
}
