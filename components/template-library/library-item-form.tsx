"use client";

import { useCallback, useMemo, useState } from "react";
import { HiOutlineDocumentCheck, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import { PlaceholderMoveButtons } from "@/components/template/placeholder-move-buttons";
import { TemplatePreview, type TemplateMessageType } from "@/components/template/preview/template-preview";
import { TemplateCtaFields } from "@/components/template/template-cta-fields";
import { VariableField } from "@/components/template/variable-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { formatComviaError } from "@/lib/api-message";
import { getAccessToken } from "@/lib/auth";
import { comviaFetch } from "@/lib/comviaFetch";
import {
  ADMIN_LIBRARY_API,
  buildLibraryQuery,
  libraryItemToFormValues,
  previewToLibraryType,
  type LibraryCategory,
  type LibraryItem,
  type LibraryList,
} from "@/lib/template-library";
import { normalizeCtaButtons, validateCtaButtons, type TemplateCtaDraft } from "@/lib/template-cta";
import {
  newPlaceholderRow,
  rowsToPlaceholderLabels,
  rowsToPlaceholderOrder,
  rowsToPlaceholders,
  slugLooksValid,
  type PlaceholderRow,
} from "@/lib/template-placeholders";
import { useComviaQuery } from "@/lib/use-comvia-query";

const LABEL_CLASS = "mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground";

const TYPE_OPTIONS: { value: TemplateMessageType; label: string }[] = [
  { value: "bang", label: "Dạng bảng" },
  { value: "van_ban", label: "Dạng văn bản" },
  { value: "otp", label: "Dạng OTP" },
];

// OTP có đúng hai biến hệ thống.
const OTP_PLACEHOLDERS: Record<string, string> = { otp: "", phut: "" };

/**
 * Form Admin thêm/sửa một mẫu tin thư viện (TPLLIB-01 §4.3).
 * Sửa: gửi toàn bộ field mỗi lần lưu (`null` = xóa giá trị), BE kiểm tra lại theo `type` sau khi gộp.
 */
export function LibraryItemForm({
  item,
  onSaved,
  onCancel,
}: {
  /** Có → chế độ sửa (PATCH); không → tạo mới (POST). */
  item?: LibraryItem | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const editing = Boolean(item);
  const [initial] = useState(() => (item ? libraryItemToFormValues(item) : null));

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? "");
  const [type, setType] = useState<TemplateMessageType>(initial?.type ?? "bang");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [content2, setContent2] = useState(initial?.content2 ?? "");
  const [secondaryContent, setSecondaryContent] = useState(initial?.secondaryContent ?? "");
  const [secondaryContent2, setSecondaryContent2] = useState(initial?.secondaryContent2 ?? "");
  const [otpMinutes, setOtpMinutes] = useState(initial?.otpMinutes ?? "5");
  const [placeholderRows, setPlaceholderRows] = useState<PlaceholderRow[]>(() => initial?.placeholderRows ?? [newPlaceholderRow()]);
  const [ctaButtons, setCtaButtons] = useState<TemplateCtaDraft[]>(initial?.ctaButtons ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoriesFetcher = useCallback(
    (token: string) =>
      comviaFetch<LibraryList<LibraryCategory>>(`${ADMIN_LIBRARY_API}/categories${buildLibraryQuery({ limit: 200 })}`, { token }),
    [],
  );
  const { data: categories } = useComviaQuery(true, categoriesFetcher);

  const isOtp = type === "otp";
  const placeholdersParsed = useMemo(() => rowsToPlaceholders(placeholderRows), [placeholderRows]);
  const filledSlugs = useMemo(
    () => placeholderRows.map((row) => row.slug.trim()).filter((slug) => slug && slugLooksValid(slug)),
    [placeholderRows],
  );
  const previewLabels = useMemo(
    () =>
      Object.fromEntries(
        placeholderRows
          .filter((row) => row.slug.trim() && slugLooksValid(row.slug.trim()) && row.label.trim())
          .map((row) => [row.slug.trim(), row.label.trim()]),
      ),
    [placeholderRows],
  );

  function updateRow(id: string, patch: Partial<Pick<PlaceholderRow, "label" | "slug" | "defaultValue">>) {
    setPlaceholderRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    setPlaceholderRows((rows) => {
      const next = rows.filter((row) => row.id !== id);
      return next.length > 0 ? next : [newPlaceholderRow()];
    });
  }

  /** Giá trị rỗng: sửa → `null` (xóa), tạo → bỏ field. */
  function opt<T>(value: T | undefined): T | null | undefined {
    return value === undefined ? (editing ? null : undefined) : value;
  }

  function buildBody(): { ok: true; body: Record<string, unknown> } | { ok: false; message: string } {
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 200) return { ok: false, message: "Tên mẫu tin phải từ 2 đến 200 ký tự." };
    if (description.trim().length > 1000) return { ok: false, message: "Mô tả tối đa 1000 ký tự." };

    const body: Record<string, unknown> = {
      name: trimmedName,
      type: previewToLibraryType(type),
      description: opt(description.trim() || undefined),
      categoryId: opt(categoryId || undefined),
      title: opt(title.trim() || undefined),
    };

    if (isOtp) {
      const minutes = Number(otpMinutes);
      if (!otpMinutes.trim() || !Number.isInteger(minutes) || minutes < 1) {
        return { ok: false, message: "Số phút hết hạn phải là số nguyên ≥ 1." };
      }
      Object.assign(body, {
        otpExpiryMinutes: minutes,
        placeholdersJson: OTP_PLACEHOLDERS,
        content: opt(undefined),
        secondaryContent: opt(undefined),
        content2: opt(undefined),
        secondaryContent2: opt(undefined),
        placeholder_labels: opt(undefined),
        placeholderOrder: opt(undefined),
        ctaButtons: opt(undefined),
      });
      return { ok: true, body };
    }

    if (!content.trim()) return { ok: false, message: "Nội dung là bắt buộc." };
    if (!placeholdersParsed.ok) return placeholdersParsed;
    const ctaError = validateCtaButtons(ctaButtons);
    if (ctaError) return { ok: false, message: ctaError };

    const labels = rowsToPlaceholderLabels(placeholderRows);
    const order = rowsToPlaceholderOrder(placeholderRows);
    Object.assign(body, {
      content,
      secondaryContent: opt(secondaryContent.trim() || undefined),
      content2: opt(content2.trim() || undefined),
      secondaryContent2: opt(secondaryContent2.trim() || undefined),
      otpExpiryMinutes: opt(undefined),
      placeholdersJson: placeholdersParsed.data,
      placeholder_labels: opt(Object.keys(labels).length > 0 ? labels : undefined),
      placeholderOrder: opt(order.length > 0 ? order : undefined),
      ctaButtons: opt(ctaButtons.length > 0 ? normalizeCtaButtons(ctaButtons).map(({ type: ctaType, label, target, position }) => ({ type: ctaType, label, target, position })) : undefined),
    });
    return { ok: true, body };
  }

  async function save() {
    const built = buildBody();
    if (!built.ok) {
      setError(built.message);
      return;
    }
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await comviaFetch(editing ? `${ADMIN_LIBRARY_API}/items/${item!.id}` : `${ADMIN_LIBRARY_API}/items`, {
        method: editing ? "PATCH" : "POST",
        token,
        body: JSON.stringify(built.body),
      });
      onSaved();
    } catch (saveError) {
      setError(formatComviaError(saveError, "Không lưu được mẫu tin thư viện."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,600px)]">
      <Card className="min-w-0 space-y-4">
        <div>
          <label className={LABEL_CLASS}>Tên mẫu tin</label>
          <Input value={name} maxLength={200} onChange={(event) => setName(event.target.value)} required />
        </div>

        <div>
          <label className={LABEL_CLASS}>Mô tả ngắn</label>
          <Textarea rows={2} maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL_CLASS}>Danh mục</label>
            <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">Chưa phân loại</option>
              {(categories?.data ?? []).map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className={LABEL_CLASS}>Loại tin</label>
            <Select
              value={type}
              onChange={(event) => {
                const next = event.target.value as TemplateMessageType;
                setType(next);
                if (next === "otp") setCtaButtons([]);
              }}
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <VariableField label="Tựa đề" labelClassName={LABEL_CLASS} value={title} onChange={setTitle} slugs={isOtp ? [] : filledSlugs} />

        {!isOtp ? (
          <>
            <VariableField label="Nội dung 1" labelClassName={LABEL_CLASS} rows={8} required value={content} onChange={setContent} slugs={filledSlugs} />
            <VariableField label="Nội dung 2" labelClassName={LABEL_CLASS} rows={5} value={content2} onChange={setContent2} slugs={filledSlugs} />

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Các trường thông tin</label>
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
              <ul className="space-y-3">
                {placeholderRows.map((row) => (
                  <li
                    key={row.id}
                    className="grid gap-2 rounded-xl border border-border/60 bg-surface-muted/40 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                  >
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Nhãn</label>
                      <Input value={row.label} onChange={(event) => updateRow(row.id, { label: event.target.value })} placeholder="vd: Họ và tên" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Biến</label>
                      <Input
                        value={row.slug}
                        onChange={(event) => updateRow(row.id, { slug: event.target.value })}
                        placeholder="vd: name"
                        className="font-mono text-sm"
                        aria-invalid={row.slug.trim().length > 0 && !slugLooksValid(row.slug.trim())}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Giá trị mẫu</label>
                      <Input value={row.defaultValue} onChange={(event) => updateRow(row.id, { defaultValue: event.target.value })} placeholder="vd: Nguyễn Văn A" />
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
              {!placeholdersParsed.ok ? <p className="text-xs text-danger">{placeholdersParsed.message}</p> : null}
            </div>

            <VariableField label="Nội dung phụ 1" labelClassName={LABEL_CLASS} rows={4} value={secondaryContent} onChange={setSecondaryContent} slugs={filledSlugs} />
            <VariableField label="Nội dung phụ 2" labelClassName={LABEL_CLASS} rows={4} value={secondaryContent2} onChange={setSecondaryContent2} slugs={filledSlugs} />
            <TemplateCtaFields buttons={ctaButtons} onChange={setCtaButtons} />
          </>
        ) : (
          <div>
            <label className={LABEL_CLASS}>Số phút hết hạn</label>
            <Input type="number" min={1} value={otpMinutes} onChange={(event) => setOtpMinutes(event.target.value)} placeholder="vd: 5" />
          </div>
        )}

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
          <Button type="button" icon={<HiOutlineDocumentCheck className="size-4" />} disabled={saving} onClick={() => void save()}>
            {saving ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Thêm mẫu tin"}
          </Button>
          <Button type="button" variant="outline" disabled={saving} onClick={onCancel}>
            Hủy
          </Button>
        </div>
      </Card>

      <Card className="flex min-w-0 flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Xem trước</p>
        <div className="flex-1 overflow-auto rounded-xl bg-surface-muted p-4">
          <TemplatePreview
            type={type}
            title={title}
            content={content}
            placeholders={!isOtp && placeholdersParsed.ok ? placeholdersParsed.data : {}}
            placeholderLabels={previewLabels}
            content2={content2}
            secondaryContent={secondaryContent}
            secondaryContent2={secondaryContent2}
            minutes={otpMinutes}
            ctaButtons={ctaButtons}
          />
        </div>
      </Card>
    </div>
  );
}
