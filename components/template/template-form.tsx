"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { ComviaApiError, comviaFetch, resolvePublicAssetUrl } from "@/lib/comviaFetch";
import { VariableField } from "@/components/template/variable-field";
import { PlaceholderMoveButtons } from "@/components/template/placeholder-move-buttons";
import { getAccessToken } from "@/lib/auth";
import {
  newPlaceholderRow,
  rowsToPlaceholderLabels,
  rowsToPlaceholderOrder,
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
import { useComviaQuery } from "@/lib/use-comvia-query";
import { TemplateCtaFields } from "@/components/template/template-cta-fields";
import { normalizeCtaButtons, validateCtaButtons, type TemplateCtaDraft } from "@/lib/template-cta";
import { isWorkspaceOwner, useWorkspaceContext } from "@/components/workspace/workspace-gate";
import { LibrarySourceSelect } from "@/components/template-library/library-source-select";
import { libraryItemToFormValues, type LibraryItem } from "@/lib/template-library";

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
  /** Điền sẵn form từ mẫu thư viện (nút "Sử dụng" ở trang Thư viện mẫu tin). */
  initialLibraryItem?: LibraryItem | null;
};

/** Enum loại tin backend (BR-05). FE dùng nhãn nội bộ bang/van_ban/otp → map sang đây khi gửi. */
type BackendTemplateType = "TABLE" | "TEXT" | "OTP";

const TYPE_TO_BACKEND: Record<TemplateMessageType, BackendTemplateType> = {
  bang: "TABLE",
  van_ban: "TEXT",
  otp: "OTP",
};

// OTP có đúng hai biến hệ thống. Người tạo template không cần cấu hình chúng.
const OTP_PLACEHOLDERS: Record<string, string> = { otp: "", phut: "" };

/** Body gửi lên `POST /workspaces/:workspaceId/templates` theo tên field chuẩn backend (BR-05). */
type CreateTemplateBody = {
  name: string;
  type: BackendTemplateType;
  title?: string;
  trackingId?: string;
  content?: string;
  content2?: string;
  secondaryContent?: string;
  secondaryContent2?: string;
  otpExpiryMinutes?: number;
  placeholdersJson?: Record<string, string>;
  placeholder_labels?: Record<string, string>;
  placeholderOrder?: string[];
  ctaButtons?: ReturnType<typeof normalizeCtaButtons>;
};

const TYPE_OPTIONS: { value: TemplateMessageType; label: string }[] = [
  { value: "bang", label: "Dạng bảng" },
  { value: "van_ban", label: "Dạng văn bản" },
  { value: "otp", label: "Dạng OTP" },
];

const LABEL_CLASS = "mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground";

type OaPreviewAsset = { logoLightUrl?: string | null };

export function TemplateForm({ workspaceId, onCreated, onCancel, initialLibraryItem }: TemplateFormProps) {
  const [initial] = useState(() => (initialLibraryItem ? libraryItemToFormValues(initialLibraryItem) : null));
  const router = useRouter();
  const { role } = useWorkspaceContext();
  const owner = isWorkspaceOwner(role);

  const oaFetcher = useCallback(
    async (token: string): Promise<OaPreviewAsset | null> => {
      try {
        return await comviaFetch<OaPreviewAsset>(`/workspaces/${workspaceId}/oa`, { token });
      } catch (error) {
        if (error instanceof ComviaApiError && error.statusCode === 404) return null;
        throw error;
      }
    },
    [workspaceId],
  );
  const { data: oa } = useComviaQuery(Boolean(workspaceId), oaFetcher);

  // Field mới (ISSUE-004) — gửi lên API theo tên chuẩn backend (BR-05).
  const [trackingId, setTrackingId] = useState("");
  const [type, setType] = useState<TemplateMessageType>(initial?.type ?? "bang");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content2, setContent2] = useState(initial?.content2 ?? "");
  const [secondaryContent, setSecondaryContent] = useState(initial?.secondaryContent ?? "");
  const [secondaryContent2, setSecondaryContent2] = useState(initial?.secondaryContent2 ?? "");
  const [otpMinutes, setOtpMinutes] = useState(initial?.otpMinutes ?? "5");

  // Field gửi lên API.
  const [name, setName] = useState(initial?.name ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [placeholderRows, setPlaceholderRows] = useState<PlaceholderRow[]>(() => initial?.placeholderRows ?? [newPlaceholderRow()]);
  const [ctaButtons, setCtaButtons] = useState<TemplateCtaDraft[]>(initial?.ctaButtons ?? []);
  const [createdTemplate, setCreatedTemplate] = useState<CreateTemplateResponse | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);


  const showContentFields = type === "bang" || type === "van_ban";
  const showOtpField = type === "otp";

  const placeholdersParsed = useMemo(() => rowsToPlaceholders(placeholderRows), [placeholderRows]);

  // Giá trị mẫu cho preview: chỉ dùng placeholders khi loại tin có phần nội dung.
  const previewPlaceholders = useMemo(
    () => (showContentFields && placeholdersParsed.ok ? placeholdersParsed.data : {}),
    [showContentFields, placeholdersParsed],
  );
  // Không fallback label về slug — biến không nhập Nhãn thì bị loại khỏi bảng ở TablePreview.
  const previewPlaceholderLabels = useMemo(
    () =>
      Object.fromEntries(
        placeholderRows
          .filter((row) => row.slug.trim() && slugLooksValid(row.slug.trim()) && row.label.trim())
          .map((row) => [row.slug.trim(), row.label.trim()]),
      ),
    [placeholderRows],
  );
  const previewLogoUrl = useMemo(() => resolvePublicAssetUrl(oa?.logoLightUrl), [oa?.logoLightUrl]);

  const filledSlugs = useMemo(() => {
    return placeholderRows
      .map((r) => r.slug.trim())
      .filter((s) => s.length > 0 && slugLooksValid(s));
  }, [placeholderRows]);


  /** Form đã có dữ liệu user nhập → hỏi xác nhận trước khi ghi đè từ thư viện. */
  const isDirty = Boolean(
    name.trim() ||
      title.trim() ||
      content.trim() ||
      content2.trim() ||
      secondaryContent.trim() ||
      secondaryContent2.trim() ||
      ctaButtons.length > 0 ||
      placeholderRows.some((row) => row.slug.trim() || row.label.trim() || row.defaultValue.trim()),
  );

  /** Ghi đè toàn bộ nội dung form bằng mẫu thư viện; giữ nguyên Tracking ID (user tự nhập). */
  function applyLibraryItem(item: LibraryItem) {
    const values = libraryItemToFormValues(item);
    setName(values.name);
    setType(values.type);
    setTitle(values.title);
    setContent(values.content);
    setContent2(values.content2);
    setSecondaryContent(values.secondaryContent);
    setSecondaryContent2(values.secondaryContent2);
    setOtpMinutes(values.otpMinutes);
    setPlaceholderRows(values.placeholderRows);
    setCtaButtons(values.ctaButtons);
    setError(null);
  }

  function updateRow(id: string, patch: Partial<Pick<PlaceholderRow, "label" | "slug" | "defaultValue">>) {
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
   * OTP: gửi `otpExpiryMinutes` và hai placeholder hệ thống `otp`/`phut`, không gửi content.
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

    if (secondaryContent.trim()) body.secondaryContent = secondaryContent.trim();
    if (secondaryContent2.trim()) body.secondaryContent2 = secondaryContent2.trim();

    if (type === "otp") {
      const mins = Number(otpMinutes);
      if (!otpMinutes.trim() || !Number.isInteger(mins) || mins < 1) {
        return { ok: false, message: "Số phút hết hạn phải là số nguyên ≥ 1." };
      }
      body.otpExpiryMinutes = mins;
      body.placeholdersJson = OTP_PLACEHOLDERS;
      return { ok: true, body };
    }

    const ctaError = validateCtaButtons(ctaButtons);
    if (ctaError) return { ok: false, message: ctaError };
    if (ctaButtons.length > 0) body.ctaButtons = normalizeCtaButtons(ctaButtons);

    const ph = rowsToPlaceholders(placeholderRows);
    if (!ph.ok) return ph;
    if (!content.trim()) {
      return { ok: false, message: "Nội dung là bắt buộc." };
    }
    body.content = content;
    if (content2.trim()) body.content2 = content2.trim();
    body.placeholdersJson = ph.data;
    body.placeholder_labels = rowsToPlaceholderLabels(placeholderRows);
    body.placeholderOrder = rowsToPlaceholderOrder(placeholderRows);
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

  async function handleSave() {
    setError(null);
    setLoading(true);
    try {
      const created = await createTemplate();
      setCreatedTemplate(created);
      onCreated(created, { submitted: false });
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

  async function submitCreatedTemplate() {
    if (!createdTemplate || !owner) return;
    const token = getAccessToken();
    if (!token) {
      router.replace("/auth/login");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await comviaFetch(`/workspaces/${workspaceId}/templates/${createdTemplate.id}/submit`, {
        method: "POST",
        token,
      });
      onCreated(createdTemplate, { submitted: true });
    } catch (err) {
      setError(err instanceof ComviaApiError ? err.message : "Không gửi duyệt được mẫu tin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,600px)]">
      <Card className="min-w-0 space-y-4">
        <fieldset disabled={createdTemplate !== null} className="space-y-4">
        <LibrarySourceSelect isDirty={isDirty} onApply={applyLibraryItem} />

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
          <Select
            value={type}
            onChange={(e) => {
              const nextType = e.target.value as TemplateMessageType;
              setType(nextType);
              // OTP không hỗ trợ nút CTA — xóa luôn để không gửi nhầm lên API khi submit.
              if (nextType === "otp") setCtaButtons([]);
            }}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        <VariableField label="Tựa đề" labelClassName={LABEL_CLASS} value={title} onChange={setTitle} slugs={showContentFields ? filledSlugs : []} />

        {showContentFields ? (
          <>
            <VariableField label="Nội dung 1" labelClassName={LABEL_CLASS} rows={10} required value={content} onChange={setContent} slugs={filledSlugs} />

            <VariableField label="Nội dung 2" labelClassName={LABEL_CLASS} rows={6} value={content2} onChange={setContent2} slugs={filledSlugs} />

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
                Mỗi dòng gồm nhãn hiển thị, biến (slug, ví dụ <code className="rounded bg-surface-muted px-1">name</code>)
                và giá trị mẫu để xem trước.
              </p>
              <ul className="space-y-3">
                {placeholderRows.map((row) => (
                  <li
                    key={row.id}
                    className="grid gap-2 rounded-xl border border-border/60 bg-surface-muted/40 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                  >
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Nhãn</label>
                      <Input
                        value={row.label}
                        onChange={(e) => updateRow(row.id, { label: e.target.value })}
                        placeholder="vd: Họ và tên"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Biến</label>
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
                      <PlaceholderMoveButtons rows={placeholderRows} rowId={row.id} setRows={setPlaceholderRows} />
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

        <VariableField label="Nội dung phụ 1" labelClassName={LABEL_CLASS} rows={4} placeholder="Nội dung phụ hiển thị cuối tin nhắn." value={secondaryContent} onChange={setSecondaryContent} slugs={showContentFields ? filledSlugs : []} />
        <VariableField label="Nội dung phụ 2" labelClassName={LABEL_CLASS} rows={4} placeholder="Nội dung phụ hiển thị cuối tin nhắn." value={secondaryContent2} onChange={setSecondaryContent2} slugs={showContentFields ? filledSlugs : []} />

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

        {type !== "otp" ? <TemplateCtaFields buttons={ctaButtons} onChange={setCtaButtons} /> : null}
        </fieldset>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <div className="space-y-2 border-t border-border/60 pt-4">
          <div className="flex flex-wrap gap-2">
            {createdTemplate && owner ? (
              <Button
                icon={<HiOutlineDocumentArrowUp className="size-4" />}
                type="button"
                variant="accent"
                disabled={loading}
                onClick={() => void submitCreatedTemplate()}
              >
                {loading ? "Đang gửi Staff xử lý…" : "Gửi Staff xử lý"}
              </Button>
            ) : !createdTemplate ? (
              <Button
                icon={<HiOutlineDocumentCheck className="size-4" />}
                type="button"
                disabled={loading}
                onClick={() => void handleSave()}
              >
                {loading ? "Đang xử lý…" : "Lưu mẫu tin"}
              </Button>
            ) : null}
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
          {createdTemplate ? (
            <p className="text-xs text-success">
              {owner
                ? "Đã lưu mẫu tin. Bạn có thể gửi Staff xử lý ngay hoặc đóng popup để tiếp tục sửa tại trang chi tiết."
                : "Đã lưu mẫu tin. Chủ Workspace có thể gửi mẫu tin cho Staff xử lý."}
            </p>
          ) : null}
        </div>
      </Card>

      <Card className="flex min-w-0 flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Xem trước</p>
        <div className="flex-1 overflow-auto rounded-xl bg-surface-muted p-4">
          <TemplatePreview
            type={type}
            title={title}
            content={content}
            placeholders={previewPlaceholders}
            placeholderLabels={previewPlaceholderLabels}
            content2={content2}
            secondaryContent={secondaryContent}
            secondaryContent2={secondaryContent2}
            minutes={otpMinutes}
            logoUrl={previewLogoUrl}
            ctaButtons={ctaButtons}
          />
        </div>
      </Card>
    </div>
  );
}
