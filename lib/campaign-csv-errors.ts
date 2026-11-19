/**
 * Việt hóa lỗi import CSV của BE (`Row <n>: …`, `row_id <id>: …`) và bổ sung giá trị số điện thoại
 * thực tế trong file để user biết chính xác chỗ cần sửa.
 */

/** Tách CSV thành các record, kèm số dòng vật lý (header = dòng 1) nơi record bắt đầu. */
function parseCsvRecords(text: string): { line: number; cells: string[] }[] {
  const src = text.replace(/^﻿/, "");
  const records: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  let line = 1;
  let startLine = 1;
  const pushCell = () => {
    cells.push(cell);
    cell = "";
  };
  const pushRecord = () => {
    pushCell();
    if (!(cells.length === 1 && cells[0].trim() === "")) records.push({ line: startLine, cells });
    cells = [];
  };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else {
        if (ch === "\n") line++;
        cell += ch;
      }
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") pushCell();
    else if (ch === "\r") continue;
    else if (ch === "\n") {
      pushRecord();
      line++;
      startLine = line;
    } else cell += ch;
  }
  if (cell !== "" || cells.length > 0) pushRecord();
  return records;
}

/** Map số dòng vật lý → giá trị cột Phone của dòng đó. */
export function readPhonesByLine(csvText: string): Map<number, string> {
  const records = parseCsvRecords(csvText);
  const result = new Map<number, string>();
  if (records.length === 0) return result;
  const phoneIdx = records[0].cells.findIndex((h) => h.trim().toLowerCase() === "phone");
  if (phoneIdx < 0) return result;
  for (const rec of records.slice(1)) result.set(rec.line, (rec.cells[phoneIdx] ?? "").trim());
  return result;
}

function translateReason(reason: string, phone?: string): string {
  const r = reason.trim();
  const low = r.toLowerCase();
  if (/phone|số điện thoại/.test(low)) {
    if (/missing|required|empty|thiếu|trống/.test(low)) {
      return "chưa nhập số điện thoại. Vui lòng điền số điện thoại (ví dụ 0901234567).";
    }
    return phone
      ? `số điện thoại "${phone}" không hợp lệ. Vui lòng sửa lại (ví dụ 0901234567, +84901234567 hoặc 84901234567).`
      : "số điện thoại không hợp lệ. Vui lòng sửa lại (ví dụ 0901234567, +84901234567 hoặc 84901234567).";
  }
  if (/row_id/.test(low) && /duplicate|trùng/.test(low)) return "cột row_id bị trùng.";
  if (/row_id/.test(low) && /missing|required|thiếu/.test(low)) return "thiếu giá trị cột row_id.";
  if (/placeholder|empty|blank|trống/.test(low)) return `có ô dữ liệu bị trống (${r}).`;
  if (/success row cannot be changed/.test(low)) {
    return "dòng đã gửi thành công nên không thể thay đổi dữ liệu.";
  }
  return r;
}

/** Trả về danh sách lỗi tiếng Việt; `csvText` (nếu có) dùng để chèn số điện thoại sai. */
export function localizeCsvErrors(errors: string[], csvText?: string): string[] {
  const phones = csvText ? readPhonesByLine(csvText) : undefined;
  return errors.map((err) => {
    const rowMatch = /^Row\s+(\d+)\s*:\s*(.*)$/i.exec(err.trim());
    if (rowMatch) {
      const n = Number(rowMatch[1]);
      return `Dòng ${n} trong file: ${translateReason(rowMatch[2], phones?.get(n))}`;
    }
    const idMatch = /^row_id\s+(\S+?)\s*:\s*(.*)$/i.exec(err.trim());
    if (idMatch) return `Dòng có row_id ${idMatch[1]}: ${translateReason(idMatch[2])}`;
    return err;
  });
}
