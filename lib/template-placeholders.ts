export type PlaceholderRow = {
  id: string;
  label: string;
  slug: string;
  defaultValue: string;
};

export function newPlaceholderRow(): PlaceholderRow {
  return { id: crypto.randomUUID(), label: "", slug: "", defaultValue: "" };
}

export function slugLooksValid(slug: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(slug);
}

export function rowsToPlaceholders(rows: PlaceholderRow[]):
  | { ok: true; data: Record<string, string> }
  | { ok: false; message: string } {
  const data: Record<string, string> = {};
  const seen = new Set<string>();

  for (const row of rows) {
    const slug = row.slug.trim();
    if (!slug) {
      if (row.defaultValue.trim()) {
        return { ok: false, message: "Mỗi trường phải có slug (tên biến) khi đã có giá trị mẫu." };
      }
      continue;
    }
    if (!slugLooksValid(slug)) {
      return {
        ok: false,
        message: `Slug "${slug}" không hợp lệ. Dùng chữ, số, gạch dưới; ký tự đầu không được là số.`,
      };
    }
    if (seen.has(slug)) {
      return { ok: false, message: `Trùng slug: "${slug}".` };
    }
    seen.add(slug);
    data[slug] = row.defaultValue;
  }

  return { ok: true, data };
}

/** Nhãn hiển thị theo slug, chỉ gồm dòng có slug hợp lệ và nhãn không rỗng. */
export function rowsToPlaceholderLabels(rows: PlaceholderRow[]): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const row of rows) {
    const slug = row.slug.trim();
    const label = row.label.trim();
    if (slug && slugLooksValid(slug) && label) labels[slug] = label;
  }
  return labels;
}

/** Load API object vào danh sách dòng chỉnh sửa. */
export function recordToPlaceholderRows(record: unknown, labels?: Record<string, string> | null): PlaceholderRow[] {
  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    return [newPlaceholderRow()];
  }
  const entries = Object.entries(record as Record<string, unknown>);
  if (entries.length === 0) return [newPlaceholderRow()];
  return entries.map(([slug, raw]) => ({
    id: crypto.randomUUID(),
    label: labels?.[slug] ?? slug,
    slug,
    defaultValue: raw === undefined || raw === null ? "" : String(raw),
  }));
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Preview: thay {{key}} bằng giá trị mẫu từ object placeholders. */
export function previewTemplateContent(content: string, placeholders: Record<string, string>) {
  let out = content;
  for (const [key, sample] of Object.entries(placeholders)) {
    const re = new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`, "g");
    out = out.replace(re, sample || `{{${key}}}`);
  }
  return out;
}
