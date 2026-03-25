export type PendingOtpContext = {
  otpRequestId: string;
  email: string;
  purpose: string;
  demoOtpCode?: string;
};

const OTP_CONTEXT_KEY = "comvia_pending_otp_context";

function canUseStorage() {
  return typeof window !== "undefined";
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

export function updatePendingOtpDemoCode(otpRequestId: string, demoOtpCode?: string) {
  if (!canUseStorage()) return;
  const current = getPendingOtpContext(otpRequestId);
  if (!current) return;
  savePendingOtpContext({ ...current, demoOtpCode });
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
