"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { HiOutlinePhoto, HiOutlineXMark } from "react-icons/hi2";
import { cn } from "@/lib/cn";
import { resolvePublicAssetUrl } from "@/lib/comviaFetch";

/** Định dạng ảnh được chấp nhận (khớp ràng buộc backend BR-03/04). */
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg"];
/** Dung lượng tối đa cho một ảnh (2MB). */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export type ImageUploadFieldProps = {
  /** Nhãn hiển thị phía trên field. */
  label: string;
  /** File đang chọn (controlled bởi nơi gọi). */
  value: File | null;
  /** Gọi khi file hợp lệ được chọn, hoặc null khi xóa / file bị từ chối. */
  onChange: (file: File | null) => void;
  /** Ràng buộc chiều rộng (px). Có cả width+height mới validate kích thước. */
  requiredWidth?: number;
  /** Ràng buộc chiều cao (px). */
  requiredHeight?: number;
  /** accept của input file (mặc định PNG/JPEG). */
  accept?: string;
  /**
   * URL ảnh đã có (mode edit). Khi chưa chọn file mới (`value === null`) mà có
   * `existingUrl` thì hiện ảnh cũ làm preview. Nơi gọi hiểu `value === null` là
   * "giữ ảnh cũ, không upload lại" — chỉ upload ảnh user thực sự chọn mới.
   */
  existingUrl?: string | null;
  /** Class bổ sung cho wrapper. */
  className?: string;
};

/**
 * Field chọn ảnh client-side có preview + validate kích thước (ISSUE-003, ADR-001).
 * Dùng cho avatar (không ràng buộc) và logo sáng/tối (400x96).
 *
 * Chỉ giữ File + preview — KHÔNG tự gọi API. Upload multipart thật
 * (comviaMultipartFetch) do oa-record-modal.tsx xử lý ở ticket tích hợp.
 */
export function ImageUploadField({
  label,
  value,
  onChange,
  requiredWidth,
  requiredHeight,
  accept = "image/png,image/jpeg",
  existingUrl,
  className,
}: ImageUploadFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasSizeConstraint =
    typeof requiredWidth === "number" && typeof requiredHeight === "number";

  // Preview bám theo `value` (controlled). Dựng object URL khi render, revoke
  // ở cleanup khi `value` đổi / unmount — tránh setState trong effect.
  const previewUrl = useMemo(() => (value ? URL.createObjectURL(value) : null), [value]);
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // Khi chưa chọn file mới mà có ảnh cũ (mode edit) → hiện ảnh cũ làm preview.
  const existingPreviewUrl = useMemo(() => resolvePublicAssetUrl(existingUrl), [existingUrl]);
  const displayUrl = previewUrl ?? existingPreviewUrl;

  function handleFile(file: File | null) {
    setError(null);
    if (!file) {
      onChange(null);
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("Chỉ chấp nhận ảnh PNG hoặc JPEG.");
      onChange(null);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Ảnh vượt quá dung lượng tối đa 2MB.");
      onChange(null);
      return;
    }
    if (!hasSizeConstraint) {
      onChange(file);
      return;
    }
    // Đọc kích thước thật trước khi chấp nhận.
    const probeUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(probeUrl);
      if (img.naturalWidth !== requiredWidth || img.naturalHeight !== requiredHeight) {
        setError(
          `Ảnh phải đúng kích thước ${requiredWidth}×${requiredHeight}px ` +
            `(ảnh đã chọn ${img.naturalWidth}×${img.naturalHeight}px).`,
        );
        onChange(null);
        return;
      }
      onChange(file);
    };
    img.onerror = () => {
      URL.revokeObjectURL(probeUrl);
      setError("Không đọc được ảnh. Vui lòng chọn tệp khác.");
      onChange(null);
    };
    img.src = probeUrl;
  }

  function clearSelection() {
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onChange(null);
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block text-xs font-medium text-muted-foreground" htmlFor={inputId}>
        {label}
        {hasSizeConstraint ? (
          <span className="ml-1 font-normal text-muted-foreground">
            ({requiredWidth}×{requiredHeight}px)
          </span>
        ) : null}
      </label>

      <div className="flex items-start gap-3">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-muted">
          {displayUrl ? (
            // next/image không tối ưu được blob URL / ảnh public backend → dùng <img> thuần.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayUrl} alt={`Xem trước ${label}`} className="size-full object-contain" />
          ) : (
            <HiOutlinePhoto className="size-6 text-muted-foreground" aria-hidden />
          )}
        </div>

        <div className="min-w-0 space-y-2">
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept={accept}
            className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-2 file:text-sm file:font-medium"
            onChange={(ev) => handleFile(ev.target.files?.[0] ?? null)}
          />
          {value ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={clearSelection}
            >
              <HiOutlineXMark className="size-4" aria-hidden />
              Xóa ảnh
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
