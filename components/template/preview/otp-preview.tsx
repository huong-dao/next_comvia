"use client";

import { HiOutlineSquare2Stack } from "react-icons/hi2";
import { PreviewFrame } from "./preview-frame";

type OtpPreviewProps = {
  title: string;
  minutes: string;
};

/** Preview mẫu tin "Dạng OTP" (hình 6): tiêu đề + mã lớn + icon copy + cảnh báo bảo mật + thời hạn. */
export function OtpPreview({ title, minutes }: OtpPreviewProps) {
  const displayMinutes = minutes.trim() || "5";

  return (
    <PreviewFrame>
      <p className="mb-3 text-sm font-bold text-zinc-900">{title || "Mã xác thực của bạn là"}</p>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-3xl font-bold tracking-wider text-zinc-900">123456</span>
        <HiOutlineSquare2Stack className="size-5 text-zinc-400" />
      </div>
      <p className="text-[13px] leading-relaxed text-zinc-600">
        Tuyệt đối KHÔNG chia sẻ mã xác thực cho bất kỳ ai dưới bất kỳ hình thức nào. Mã xác thực có hiệu lực trong{" "}
        {displayMinutes} phút.
      </p>
    </PreviewFrame>
  );
}
