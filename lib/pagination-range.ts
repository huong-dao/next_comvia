/** Trả về các số trang + khoảng `ellipsis` để hiển thị thanh phân trang dạng 1 2 … 9 10 11. */
export function getPaginationRange(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages < 1) return [];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const boundary = 2;
  const windowRadius = 2;
  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (let i = 1; i <= boundary; i++) {
    pages.add(i);
    pages.add(totalPages - i + 1);
  }
  for (let p = currentPage - windowRadius; p <= currentPage + windowRadius; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const out: Array<number | "ellipsis"> = [];
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i];
    const prev = sorted[i - 1];
    if (i > 0 && prev !== undefined && n - prev > 1) {
      out.push("ellipsis");
    }
    out.push(n);
  }
  return out;
}
