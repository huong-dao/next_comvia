"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";
import {
  newPlaceholderRow,
  rowsToPlaceholders,
  slugLooksValid,
  type PlaceholderRow,
} from "@/lib/template-placeholders";
import {
  TemplatePreview,
  type TemplateMessageType,
} from "@/components/template/preview/template-preview";
import {
  HiOutlineDocumentArrowUp,
  HiOutlineDocumentCheck,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineXMark,
} from "react-icons/hi2";

export type CreateTemplateResponse = {
  id: string;
  code?: string;
  name?: string;
};

export type TemplateFormProps = {
  workspaceId: string;
  /** Gọi sau khi tạo (và submit nếu có) thành công. `submitted` = đã gửi duyệt. */
  onCreated: (tpl: CreateTemplateResponse, opts: { submitted: boolean }) => void;
  onCancel?: () => void;
};

/** Enum loại tin backend (BR-05). FE dùng nhãn nội bộ bang/van_ban/otp → map sang đây khi gửi. */
type BackendTemplateType = "TABLE" | "TEXT" | "OTP";

const TYPE_TO_BACKEND: Record<TemplateMessageType, BackendTemplateType> = {
  bang: "TABLE",
  van_ban: "TEXT",
  otp: "OTP",
};

/** Body gửi lên `POST /workspaces/:workspaceId/templates` theo tên field chuẩn backend (BR-05). */
type CreateTemplateBody = {
  name: string;
  type: BackendTemplateType;
  title?: string;
  trackingId?: string;
  content?: string;
  secondaryContent?: string;
  otpExpiryMinutes?: number;
  placeholdersJson?: Record<string, string>;
};

const TYPE_OPTIONS: { value: TemplateMessageType; label: string }[] = [
  { value: "bang", label: "Dạng bảng" },
  { value: "van_ban", label: "Dạng văn bản" },
  { value: "otp", label: "Dạng OTP" },
];

const LABEL_CLASS = "mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground";

export function TemplateForm({ workspaceId, onCreated, onCancel }: TemplateFormProps) {
  const router = useRouter();

  // Field mới (ISSUE-004) — gửi lên API theo tên chuẩn backend (BR-05).
  const [trackingId, setTrackingId] = useState("");
  const [type, setType] = useState<TemplateMessageType>("bang");
  const [title, setTitle] = useState("");
  const [secondaryContent, setSecondaryContent] = useState("");
  const [otpMinutes, setOtpMinutes] = useState("5");

  // Field gửi lên API.
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [placeholderRows, setPlaceholderRows] = useState<PlaceholderRow[]>(() => [newPlaceholderRow()]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const contentSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const showContentFields = type === "bang" || type === "van_ban";
  const showSecondaryContent = type === "bang";
  const showOtpField = type === "otp";

  const placeholdersParsed = useMemo(() => rowsToPlaceholders(placeholderRows), [placeholderRows]);

  // Giá trị mẫu cho preview: chỉ dùng placeholders khi loại tin có phần nội dung.
  const previewPlaceholders = useMemo(
    () => (showContentFields && placeholdersParsed.ok ? placeholdersParsed.data : {}),
    [showContentFields, placeholdersParsed],
  );

  const filledSlugs = useMemo(() => {
    return placeholderRows
      .map((r) => r.slug.trim())
      .filter((s) => s.length > 0 && slugLooksValid(s));
  }, [placeholderRows]);

  const insertPlaceholder = useCallback(
    (slug: string) => {
      const token = `{{${slug.trim()}}}`;
      const el = contentRef.current;
      const { start, end } = contentSelectionRef.current;
      const before = content.slice(0, start);
      const after = content.slice(end);
      const next = before + token + after;
      setContent(next);
      const caret = start + token.length;
      contentSelectionRef.current = { start: caret, end: caret };
      queueMicrotask(() => {
        el?.focus();
        el?.setSelectionRange(caret, caret);
      });
    },
    [content],
  );

  function updateRow(id: string, patch: Partial<Pick<PlaceholderRow, "slug" | "defaultValue">>) {
    setPlaceholderRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    setPlaceholderRows((rows) => {
      const next = rows.filter((r) => r.id !== id);
      return next.length > 0 ? next : [newPlaceholderRow()];
    });
  }

  /**
   * Chỉ dựng payload theo loại tin đang chọn để không rò dữ liệu của loại khác.
   * OTP: gửi `otpExpiryMinutes`, không gửi content/placeholders (backend lưu null).
   * TABLE: gửi thêm `secondaryContent`. TEXT: content + placeholders.
   */
  function buildSubmit(): { ok: true; body: CreateTemplateBody } | { ok: false; message: string } {
    if (!name.trim()) {
      return { ok: false, message: "Tên mẫu là bắt buộc." };
    }

    const body: CreateTemplateBody = {
      name: name.trim(),
      type: TYPE_TO_BACKEND[type],
    };
    if (title.trim()) body.title = title.trim();
    if (trackingId.trim()) body.trackingId = trackingId.trim();

    if (type === "otp") {
      const mins = Number(otpMinutes);
      if (!otpMinutes.trim() || !Number.isInteger(mins) || mins < 1) {
        return { ok: false, message: "Số phút hết hạn phải là số nguyên ≥ 1." };
      }
      body.otpExpiryMinutes = mins;
      return { ok: true, body };
    }

    const ph = rowsToPlaceholders(placeholderRows);
    if (!ph.ok) return ph;
    if (!content.trim()) {
      return { ok: false, message: "Nội dung là bắt buộc." };
    }
    body.content = content;
    body.placeholdersJson = ph.data;
    if (type === "bang" && secondaryContent.trim()) {
      body.secondaryContent = secondaryContent.trim();
    }
    return { ok: true, body };
  }

  async function createTemplate(): Promise<CreateTemplateResponse> {
    const v = buildSubmit();
    if (!v.ok) {
      setError(v.message);
      throw new Error(v.message);
    }
    const token = getAccessToken();
    if (!token) {
      router.replace("/auth/login");
      throw new Error("Chưa đăng nhập");
    }

    return comviaFetch<CreateTemplateResponse>(`/workspaces/${workspaceId}/templates`, {
      method: "POST",
      token,
      body: JSON.stringify(v.body),
    });
  }

  async function handleSave(submitAfter: boolean) {
    setError(null);
    setLoading(true);
    try {
      const created = await createTemplate();
      if (submitAfter) {
        const token = getAccessToken();
        if (!token) {
          router.replace("/auth/login");
          return;
        }
        await comviaFetch(`/workspaces/${workspaceId}/templates/${created.id}/submit`, {
          method: "POST",
          token,
        });
      }
      onCreated(created, { submitted: submitAfter });
    } catch (err) {
      if (err instanceof ComviaApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        if (err.message === "Chưa đăng nhập") return;
        setError(err.message);
      } else {
        setError("Không lưu được template.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-4">
        <div>
          <label className={LABEL_CLASS}>Tên mẫu</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div>
          <label className={LABEL_CLASS}>Tracking ID</label>
          <Input
            value={trackingId}
            onChange={(e) => setTrackingId(e.target.value)}
            placeholder="Nhập mã theo dõi (tùy chọn)"
          />
        </div>

        <div>
          <label className={LABEL_CLASS}>Loại tin</label>
          <Select value={type} onChange={(e) => setType(e.target.value as TemplateMessageType)}>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className={LABEL_CLASS}>Tựa đề</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        {showContentFields ? (
          <>
            <div>
              <label className={LABEL_CLASS}>Nội dung</label>
              <Textarea
                ref={contentRef}
                rows={10}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onSelect={(e) => {
                  contentSelectionRef.current = {
                    start: e.currentTarget.selectionStart,
                    end: e.currentTarget.selectionEnd,
                  };
                }}
                onBlur={(e) => {
                  contentSelectionRef.current = {
                    start: e.currentTarget.selectionStart,
                    end: e.currentTarget.selectionEnd,
                  };
                }}
                required
              />
              {filledSlugs.length > 0 ? (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-muted-foreground">Chèn biến vào vị trí con trỏ:</p>
                  <div className="flex flex-wrap gap-2">
                    {filledSlugs.map((slug) => (
                      <Button
                        key={slug}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="font-mono text-xs"
                        onClick={() => insertPlaceholder(slug)}
                      >
                        {`{{${slug}}}`}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Thêm các trường thông tin bên dưới để hiện nút chèn vào nội dung.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Các trường thông tin
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={<HiOutlinePlus className="size-4" />}
                  onClick={() => setPlaceholderRows((rows) => [...rows, newPlaceholderRow()])}
                >
                  Thêm trường
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Mỗi dòng: tên biến (slug, ví dụ <code className="rounded bg-surface-muted px-1">name</code>) và giá trị
                mẫu để xem trước.
              </p>
              <ul className="space-y-3">
                {placeholderRows.map((row) => (
                  <li
                    key={row.id}
                    className="grid gap-2 rounded-xl border border-border/60 bg-surface-muted/40 p-3 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Slug</label>
                      <Input
                        value={row.slug}
                        onChange={(e) => updateRow(row.id, { slug: e.target.value })}
                        placeholder="vd: name"
                        className="font-mono text-sm"
                        aria-invalid={row.slug.trim().length > 0 && !slugLooksValid(row.slug.trim())}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Giá trị mẫu (xem trước)
                      </label>
                      <Input
                        value={row.defaultValue}
                        onChange={(e) => updateRow(row.id, { defaultValue: e.target.value })}
                        placeholder="vd: Nguyễn Văn A"
                      />
                    </div>
                    <div className="flex items-end justify-end sm:justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 px-2 text-muted-foreground hover:text-danger"
                        title="Xóa trường"
                        aria-label="Xóa trường"
                        icon={<HiOutlineTrash className="size-4" />}
                        onClick={() => removeRow(row.id)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              {!placeholdersParsed.ok ? (
                <p className="text-xs text-danger">{placeholdersParsed.message}</p>
              ) : null}
            </div>
          </>
        ) : null}

        {showSecondaryContent ? (
          <div>
            <label className={LABEL_CLASS}>Nội dung phụ</label>
            <Textarea
              rows={4}
              value={secondaryContent}
              onChange={(e) => setSecondaryContent(e.target.value)}
              placeholder="Nội dung phụ hiển thị dưới bảng thông tin."
            />
          </div>
        ) : null}

        {showOtpField ? (
          <div>
            <label className={LABEL_CLASS}>Số phút hết hạn</label>
            <Input
              type="number"
              min={1}
              value={otpMinutes}
              onChange={(e) => setOtpMinutes(e.target.value)}
              placeholder="vd: 5"
            />
          </div>
        ) : null}

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <div className="space-y-2 border-t border-border/60 pt-4">
          <div className="flex flex-wrap gap-2">
            <Button
              icon={<HiOutlineDocumentCheck className="size-4" />}
              type="button"
              disabled={loading}
              onClick={() => void handleSave(false)}
            >
              {loading ? "Đang xử lý…" : "Lưu template"}
            </Button>
            <Button
              icon={<HiOutlineDocumentArrowUp className="size-4" />}
              type="button"
              variant="accent"
              disabled={loading}
              onClick={() => void handleSave(true)}
            >
              Lưu và gửi duyệt
            </Button>
            {onCancel ? (
              <Button
                icon={<HiOutlineXMark className="size-4" />}
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Hủy
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Xem trước</p>
        <div className="flex-1 overflow-auto rounded-xl bg-surface-muted p-4">
          <TemplatePreview
            type={type}
            title={title}
            content={content}
            placeholders={previewPlaceholders}
            secondaryContent={secondaryContent}
            minutes={otpMinutes}
          />
        </div>
      </Card>
    </div>
  );
}
