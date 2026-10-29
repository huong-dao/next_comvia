"use client";

import { useCallback, useMemo, useState } from "react";
import { HiOutlineArrowTopRightOnSquare, HiOutlineNoSymbol } from "react-icons/hi2";
import { FilterCard, FilterField } from "@/components/app/filter-card";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Input, Select } from "@/components/ui/input";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { SimpleTable } from "@/components/ui/simple-table";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken, getStoredUser, type ImpersonationMeta, type StoredUser } from "@/lib/auth";
import { useComviaQuery } from "@/lib/use-comvia-query";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "ACTIVE", label: "ACTIVE" },
  { value: "DISABLED", label: "DISABLED" },
  { value: "SUSPENDED", label: "SUSPENDED" },
  { value: "DELETED", label: "DELETED" },
];

type WsRow = {
  id: string;
  name?: string;
  slug?: string;
  ownerUserId?: string;
  status?: string;
  createdAt?: string;
};

type ImpersonateResponse = {
  accessToken: string;
  tokenType?: string;
  expiresInMinutes: number;
  workspace: { id: string; name?: string; slug?: string };
  owner: { id: string; email?: string; fullName?: string };
};

export default function AdminWorkspacesPage() {
  const fetcher = useCallback((token: string) => comviaFetch<WsRow[]>("/admin/workspaces", { token }), []);
  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);
  const [busy, setBusy] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const rows = useMemo(() => data ?? [], [data]);
  const activeCount = rows.filter((item) => (item.status ?? "").toUpperCase() === "ACTIVE").length;

  // GET /admin/workspaces chưa hỗ trợ filter/phân trang phía BE — lọc và phân trang
  // ngay trên danh sách đã tải để vẫn tìm kiếm được khi số lượng workspace tăng lên.
  const [keywordDraft, setKeywordDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState("");
  const [applied, setApplied] = useState({ keyword: "", status: "" });
  const [page, setPage] = useState(1);

  const filteredRows = useMemo(() => {
    const keyword = applied.keyword.trim().toLowerCase();
    return rows.filter((row) => {
      if (applied.status && (row.status ?? "").toUpperCase() !== applied.status) return false;
      if (!keyword) return true;
      return [row.name, row.slug, row.ownerUserId, row.id].some((field) =>
        (field ?? "").toLowerCase().includes(keyword),
      );
    });
  }, [rows, applied]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function applyFilters() {
    setApplied({ keyword: keywordDraft, status: statusDraft });
    setPage(1);
  }

  async function disable(wsId: string) {
    if (!confirm("Disable workspace này?")) return;
    const token = getAccessToken();
    if (!token) return;
    setBusy(wsId);
    try {
      await comviaFetch(`/admin/workspaces/${wsId}/disable`, { method: "PATCH", token });
      void refetch();
    } catch (e) {
      alert(e instanceof ComviaApiError ? e.message : "Lỗi");
    } finally {
      setBusy(null);
    }
  }

  /**
   * ISSUE-002: mở tab mới đăng nhập hộ Owner của workspace. Token KHÔNG đi
   * qua query string (dữ liệu nhạy cảm) — truyền sang tab mới bằng
   * `postMessage` sau khi tab đó báo sẵn sàng, theo đúng contract
   * `FRONTEND_ADMIN_ROUTER_API_MAP.mdc` mục 3.
   */
  async function impersonateOwner(ws: WsRow) {
    const newTab = window.open("/auth/impersonate", "_blank");
    if (!newTab) {
      alert("Trình duyệt đã chặn mở tab mới. Vui lòng cho phép popup cho trang này rồi thử lại.");
      return;
    }

    let childReady = false;
    let pendingMessage: Record<string, unknown> | null = null;

    function sendIfReady() {
      if (childReady && pendingMessage) {
        newTab!.postMessage(pendingMessage, window.location.origin);
        window.removeEventListener("message", onMessage);
        window.clearTimeout(timeoutId);
      }
    }

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== newTab) return;
      if ((event.data as { type?: string } | undefined)?.type === "comvia:impersonate-ready") {
        childReady = true;
        sendIfReady();
      }
    }
    window.addEventListener("message", onMessage);
    const timeoutId = window.setTimeout(() => window.removeEventListener("message", onMessage), 20000);

    const token = getAccessToken();
    if (!token) return;
    setImpersonating(ws.id);
    try {
      const response = await comviaFetch<ImpersonateResponse>(`/admin/workspaces/${ws.id}/impersonate`, {
        method: "POST",
        token,
      });
      const adminUser: StoredUser | null = getStoredUser();
      const meta: ImpersonationMeta = {
        workspaceId: response.workspace.id,
        workspaceName: response.workspace.name,
        adminId: adminUser?.id,
        adminEmail: adminUser?.email,
        adminFullName: adminUser?.fullName,
        expiresAt: Date.now() + response.expiresInMinutes * 60_000,
      };
      pendingMessage = {
        type: "comvia:impersonate-token",
        accessToken: response.accessToken,
        user: { id: response.owner.id, email: response.owner.email, fullName: response.owner.fullName, role: "OWNER" },
        meta,
      };
      sendIfReady();
    } catch (e) {
      pendingMessage = {
        type: "comvia:impersonate-error",
        message: e instanceof ComviaApiError ? e.message : "Không đăng nhập hộ được.",
      };
      sendIfReady();
    } finally {
      setImpersonating(null);
    }
  }

  return (
    <AdminRoleGate>
      {loading ? <PageLoading /> : null}
      {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}
      {data ? (
        <div>
          <PageHeader title="Workspaces" />
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <Card className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tổng workspaces</p>
              <p className="text-3xl font-semibold text-foreground">{rows.length}</p>
            </Card>
            <Card className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Đang kích hoạt</p>
              <p className="text-3xl font-semibold text-foreground">{activeCount}</p>
            </Card>
            <Card className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Chưa kích hoạt</p>
              <p className="text-3xl font-semibold text-foreground">{rows.length - activeCount}</p>
            </Card>
          </div>

          <FilterCard onApply={applyFilters} onRefresh={() => void refetch()}>
            <FilterField label="Tìm kiếm" htmlFor="ws-filter-keyword" className="grow">
              <Input
                id="ws-filter-keyword"
                value={keywordDraft}
                onChange={(e) => setKeywordDraft(e.target.value)}
                placeholder="Tên, slug hoặc ID chủ workspace"
                className="max-w-md"
              />
            </FilterField>
            <FilterField label="Trạng thái" htmlFor="ws-filter-status">
              <Select
                id="ws-filter-status"
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value)}
                className="max-w-[180px]"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </FilterField>
          </FilterCard>

          <SimpleTable
            rows={pageRows}
            getRowKey={(r) => r.id}
            columns={[
              { key: "n", header: "Tên", cell: (r) => r.name ?? "—" },
              { key: "s", header: "Slug", cell: (r) => r.slug ?? "—" },
              { key: "o", header: "Chủ Workspace", cell: (r) => r.ownerUserId ?? "—" },
              {
                key: "st",
                header: "Trạng thái",
                cell: (r) => (r.status ? <EntityStatusBadge value={r.status} /> : "—"),
              },
              {
                key: "c",
                header: "Ngày tạo",
                cell: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"),
              },
              {
                key: "a",
                header: "",
                cell: (r) => {
                  const inactive = (r.status ?? "").toUpperCase() !== "ACTIVE";
                  return (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={impersonating === r.id || inactive}
                        title={inactive ? "Chỉ đăng nhập hộ được workspace đang ACTIVE." : undefined}
                        onClick={() => void impersonateOwner(r)}
                        icon={<HiOutlineArrowTopRightOnSquare className="size-4" />}
                      >
                        {impersonating === r.id ? "Đang mở..." : "Đăng nhập Owner"}
                      </Button>
                      <Button
                        className="bg-red-600 text-white"
                        type="button"
                        size="sm"
                        variant="primary"
                        disabled={busy === r.id}
                        onClick={() => void disable(r.id)}
                        icon={<HiOutlineNoSymbol className="size-4" />}
                      >
                        Ngừng kích hoạt
                      </Button>
                    </div>
                  );
                },
              },
            ]}
          />

          <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
            <p className="text-center text-sm text-muted-foreground">
              Hiển thị{" "}
              {filteredRows.length > 0
                ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredRows.length)}`
                : "0"}{" "}
              trong {filteredRows.length} workspace
              {filteredRows.length !== rows.length ? ` (lọc từ ${rows.length})` : ""}
            </p>
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
              ariaLabel="Phân trang danh sách workspace"
            />
          </div>
        </div>
      ) : null}
    </AdminRoleGate>
  );
}
