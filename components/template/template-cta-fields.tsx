"use client";

import { HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  CTA_TYPE_OPTIONS,
  ctaNeedsTarget,
  newTemplateCta,
  type TemplateCtaDraft,
  type TemplateCtaType,
} from "@/lib/template-cta";

export function TemplateCtaFields({
  buttons,
  onChange,
  disabled = false,
}: {
  buttons: TemplateCtaDraft[];
  onChange: (buttons: TemplateCtaDraft[]) => void;
  disabled?: boolean;
}) {
  function update(index: number, patch: Partial<TemplateCtaDraft>) {
    onChange(buttons.map((button, itemIndex) => (itemIndex === index ? { ...button, ...patch } : button)));
  }

  return (
    <div className="space-y-3 border-t border-border/60 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nút CTA</p>
          <p className="mt-1 text-xs text-muted-foreground">Tối đa 2 nút; có thể để trống nếu mẫu tin không cần CTA.</p>
        </div>
        {buttons.length < 2 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<HiOutlinePlus className="size-4" />}
            disabled={disabled}
            onClick={() => onChange([...buttons, newTemplateCta(buttons.length as 0 | 1)])}
          >
            Thêm nút CTA
          </Button>
        ) : null}
      </div>

      {buttons.map((button, index) => (
        <div key={button.id ?? index} className="grid gap-3 rounded-xl border border-border/60 bg-surface-muted/40 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Loại nút</label>
            <Select
              value={button.type}
              disabled={disabled}
              onChange={(event) => update(index, { type: event.target.value as TemplateCtaType })}
            >
              {CTA_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nhãn nút (tuỳ chọn)</label>
            <Input value={button.label} maxLength={100} disabled={disabled} onChange={(event) => update(index, { label: event.target.value })} placeholder="vd: Xem chi tiết" />
          </div>
          <div className="flex items-end justify-end">
            <Button type="button" variant="ghost" size="sm" disabled={disabled} className="px-2 text-muted-foreground hover:text-danger" aria-label="Xóa nút CTA" title="Xóa nút CTA" icon={<HiOutlineTrash className="size-4" />} onClick={() => onChange(buttons.filter((_, itemIndex) => itemIndex !== index))} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {button.type === "PHONE_CALL" ? "Số điện thoại" : "Đích đến URL"}{ctaNeedsTarget(button.type) ? " *" : " (tuỳ chọn)"}
            </label>
            <Input
              value={button.target}
              disabled={disabled}
              onChange={(event) => update(index, { target: event.target.value })}
              placeholder={button.type === "PHONE_CALL" ? "vd: 0901234567" : "https://..."}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
