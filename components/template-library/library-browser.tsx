"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { HiOutlineMagnifyingGlass } from "react-icons/hi2";
import { PageError, PageForbidden } from "@/components/app/page-state";
import { TemplatePreview } from "@/components/template/preview/template-preview";
import { Input, Select } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { cn } from "@/lib/cn";
import { ComviaApiError, comviaFetch, resolvePublicAssetUrl } from "@/lib/comviaFetch";
import {
  buildLibraryQuery,
  libraryCtaToDrafts,
  libraryTypeToPreview,
  LIBRARY_TYPE_LABELS,
  type LibraryCategory,
  type LibraryItem,
  type LibraryItemType,
  type LibraryList,
} from "@/lib/template-library";
import { useComviaQuery } from "@/lib/use-comvia-query";

/** Card một mẫu thư viện — trình bày như "Preview mẫu tin" ở form tạo/sửa. */
export function LibraryCard({ item, actions, logoUrl }: { item: LibraryItem; actions?: ReactNode; logoUrl?: string | null }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="min-w-0">
        <h3 className="truncate text-base font-semibold text-foreground" title={item.name}>
          {item.name}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {item.category?.name ?? "Chưa phân loại"} · {LIBRARY_TYPE_LABELS[item.type] ?? item.type}
        </p>
        {item.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground" title={item.description}>
            {item.description}
          </p>
        ) : null}
      </div>
      <div className="flex-1 overflow-hidden rounded-xl bg-surface-muted p-3">
        <TemplatePreview
          type={libraryTypeToPreview(item.type)}
          title={item.title ?? ""}
          content={item.content ?? ""}
          placeholders={item.placeholdersJson ?? {}}
          placeholderLabels={item.placeholder_labels ?? undefined}
          placeholderOrder={item.placeholderOrder}
          content2={item.content2 ?? ""}
          secondaryContent={item.secondaryContent ?? ""}
          secondaryContent2={item.secondaryContent2 ?? ""}
          minutes={String(item.otpExpiryMinutes ?? 5)}
          ctaButtons={libraryCtaToDrafts(item.ctaButtons)}
          logoUrl={logoUrl}
        />
      </div>
      {actions ? <div className="flex flex-wrap justify-end gap-2">{actions}</div> : null}
    </div>
  );
}

function CardSkeletons({ count, gridClassName }: { count: number; gridClassName: string }) {
  return (
    <div className={gridClassName} aria-busy="true" aria-label="Đang tải mẫu tin">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="h-80 animate-pulse rounded-2xl border border-border bg-surface-muted/60" />
      ))}
    </div>
  );
}

type Props = {
  /** `/template-library` (xem) hoặc `/admin/template-library` (Admin). */
  apiBase: string;
  /** Số mẫu mỗi trang. */
  limit?: number;
  /** Class lưới card. */
  gridClassName?: string;
  /** Chỉ lấy một loại tin (vd sửa mẫu tin đang có loại cố định). */
  lockedType?: LibraryItemType;
  /** Nút hành động trên mỗi card (Sử dụng / Sửa / Xóa). */
  renderActions?: (item: LibraryItem, refresh: () => void) => ReactNode;
  /** Đổi giá trị để tải lại danh sách + danh mục (sau khi thêm/sửa/xóa). */
  reloadToken?: number;
  /** Workspace đang xem: card hiển thị logo OA của workspace này (cá nhân hóa). Bỏ trống (Admin) = logo mặc định. */
  workspaceId?: string;
  /** Hiện khi thư viện hoàn toàn trống (Admin: nút "Thêm mẫu tin"). */
  emptyAction?: ReactNode;
  className?: string;
};

/**
 * Lưới card thư viện + lọc danh mục (áp dụng ngay) + tìm theo tên (debounce) + phân trang.
 * Dùng chung cho trang thư viện (User/Admin) và popup "Tạo từ thư viện".
 */
export function LibraryBrowser({
  apiBase,
  limit = 12,
  gridClassName = "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
  lockedType,
  renderActions,
  reloadToken = 0,
  emptyAction,
  workspaceId,
  className,
}: Props) {
  const [categoryId, setCategoryId] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [localReload, setLocalReload] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword((prev) => {
        const next = keywordInput.trim();
        if (prev !== next) setPage(1);
        return next;
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  const categoriesFetcher = useCallback(
    (token: string) =>
      comviaFetch<LibraryList<LibraryCategory>>(`${apiBase}/categories${buildLibraryQuery({ limit: 200 })}`, { token }),
    // reloadToken chỉ để đổi identity của fetcher → tải lại danh mục (itemCount) sau khi Admin sửa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiBase, reloadToken],
  );
  const { data: categories } = useComviaQuery(true, categoriesFetcher);

  const itemsFetcher = useCallback(
    (token: string) =>
      comviaFetch<LibraryList<LibraryItem>>(
        `${apiBase}/items${buildLibraryQuery({ page, limit, keyword, categoryId, type: lockedType })}`,
        { token },
      ),
    // reloadToken/localReload chỉ để đổi identity của fetcher → useComviaQuery tự gọi lại.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiBase, page, limit, keyword, categoryId, lockedType, reloadToken, localReload],
  );
  const { data, loading, error, forbidden, refetch } = useComviaQuery(true, itemsFetcher);

  // Xóa mẫu cuối của một trang → lùi về trang cuối còn dữ liệu.
  useEffect(() => {
    if (!data || data.data.length > 0 || page <= 1) return;
    setPage(Math.max(1, data.meta.totalPages));
  }, [data, page]);

  // Logo OA của workspace hiện tại; workspace chưa kết nối OA (404) hoặc lỗi → dùng logo mặc định.
  const oaFetcher = useCallback(
    async (token: string): Promise<{ logoLightUrl?: string | null } | null> => {
      try {
        return await comviaFetch<{ logoLightUrl?: string | null }>(`/workspaces/${workspaceId}/oa`, { token });
      } catch (oaError) {
        if (oaError instanceof ComviaApiError) return null;
        throw oaError;
      }
    },
    [workspaceId],
  );
  const { data: oa } = useComviaQuery(Boolean(workspaceId), oaFetcher);
  const logoUrl = resolvePublicAssetUrl(oa?.logoLightUrl);

  const refresh = useCallback(() => setLocalReload((value) => value + 1), []);

  const filtering = Boolean(keyword || categoryId);
  const categoryOptions = useMemo(() => categories?.data ?? [], [categories]);

  if (forbidden) {
    return <PageForbidden message="Bạn không có quyền xem thư viện mẫu tin." backHref="/app/workspaces" />;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-64">
          <Select
            aria-label="Lọc theo danh mục"
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả danh mục</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {typeof category.itemCount === "number" ? ` (${category.itemCount})` : ""}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-full sm:w-72">
          <Input
            type="search"
            leadingIcon={<HiOutlineMagnifyingGlass className="size-4" aria-hidden />}
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            placeholder="Tìm theo tên mẫu tin"
            aria-label="Tìm mẫu tin theo tên"
          />
        </div>
      </div>

      {error && !data ? (
        <PageError message={error} onRetry={() => void refetch()} />
      ) : loading && !data ? (
        <CardSkeletons count={Math.min(limit, 6)} gridClassName={gridClassName} />
      ) : data && data.data.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/80 px-4 py-10 text-center text-sm text-muted-foreground">
          <p>{filtering ? "Không tìm thấy mẫu tin phù hợp" : "Chưa có mẫu tin nào"}</p>
          {!filtering && emptyAction ? <div className="mt-3 flex justify-center">{emptyAction}</div> : null}
        </div>
      ) : (
        <div className={cn(loading && "pointer-events-none opacity-60 transition-opacity")}>
          <div className={gridClassName}>
            {(data?.data ?? []).map((item) => (
              <LibraryCard key={item.id} item={item} logoUrl={logoUrl} actions={renderActions?.(item, refresh)} />
            ))}
          </div>
        </div>
      )}

      {data ? (
        <PaginationBar
          currentPage={data.meta.page}
          totalPages={data.meta.totalPages}
          onPageChange={setPage}
          ariaLabel="Phân trang thư viện mẫu tin"
        />
      ) : null}
    </div>
  );
}
