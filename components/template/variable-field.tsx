"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { applyContentInput } from "@/lib/template-placeholders";

type Props = {
  label?: string;
  labelClassName?: string;
  value: string;
  onChange: (value: string) => void;
  /** Các biến hợp lệ đang khai báo — mỗi biến là một nút chèn vào vị trí con trỏ của ô này. */
  slugs: string[];
  /** Có `rows` thì là ô nhiều dòng (Textarea), không thì là ô một dòng (Input). */
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
};

type El = HTMLInputElement | HTMLTextAreaElement;

/**
 * Ô nhập nội dung/tiêu đề mẫu tin có nút chèn biến `{{slug}}` tại vị trí con trỏ.
 * Gõ hoặc dán "<" / ">" tự đổi thành "{{" / "}}". Mỗi ô tự nhớ con trỏ của riêng nó.
 */
export function VariableField({ label, labelClassName, value, onChange, slugs, rows, placeholder, disabled, required }: Props) {
  const elRef = useRef<El | null>(null);
  const selRef = useRef({ start: 0, end: 0 });

  function remember(el: El) {
    elRef.current = el;
    selRef.current = { start: el.selectionStart ?? el.value.length, end: el.selectionEnd ?? el.value.length };
  }

  function insert(slug: string) {
    const token = `{{${slug}}}`;
    const start = Math.min(selRef.current.start, value.length);
    const end = Math.min(selRef.current.end, value.length);
    const caret = start + token.length;
    const el = elRef.current;
    selRef.current = { start: caret, end: caret };
    onChange(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(caret, caret);
    });
  }

  const common = {
    value,
    disabled,
    required,
    placeholder,
    onSelect: (e: React.SyntheticEvent<El>) => remember(e.currentTarget),
    onBlur: (e: React.FocusEvent<El>) => remember(e.currentTarget),
    onFocus: (e: React.FocusEvent<El>) => remember(e.currentTarget),
  };

  return (
    <div>
      {label ? <label className={labelClassName}>{label}</label> : null}
      {rows ? (
        <Textarea
          {...common}
          rows={rows}
          onChange={(e) => {
            remember(e.currentTarget);
            applyContentInput(e.currentTarget, onChange);
          }}
        />
      ) : (
        <Input
          {...common}
          onChange={(e) => {
            remember(e.currentTarget);
            applyContentInput(e.currentTarget, onChange);
          }}
        />
      )}
      {slugs.length > 0 && !disabled ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Chèn biến:</span>
          {slugs.map((slug) => (
            <Button key={slug} type="button" variant="outline" size="sm" className="font-mono text-xs" onClick={() => insert(slug)}>
              {`{{${slug}}}`}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
