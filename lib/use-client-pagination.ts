"use client";

import { useMemo, useState } from "react";

/** Số dòng mỗi trang mặc định cho bảng phân trang phía client. */
export const DEFAULT_PAGE_SIZE = 20;

export type ClientPagination<T> = {
  /** Dòng của trang hiện tại. */
  rows: T[];
  /** Trang hiện tại, đã kẹp trong [1, totalPages]. */
  page: number;
  totalPages: number;
  /** Tổng số dòng trước khi cắt trang. */
  total: number;
  pageSize: number;
  setPage: (page: number) => void;
};

/**
 * Phân trang phía client cho các endpoint **không** hỗ trợ `page`/`offset`
 * (phần lớn list của backend hiện chỉ nhận `limit`, trả mảng thuần).
 *
 * Trang hiện tại tự kẹp lại khi `items` co lại (đổi bộ lọc, refetch) nên không
 * bao giờ rơi vào trang rỗng. Khi đổi bộ lọc, call site vẫn nên `setPage(1)`.
 */
export function useClientPagination<T>(items: T[], pageSize: number = DEFAULT_PAGE_SIZE): ClientPagination<T> {
  const [page, setPage] = useState(1);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const rows = useMemo(
    () => items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [items, currentPage, pageSize],
  );

  return { rows, page: currentPage, totalPages, total, pageSize, setPage };
}
