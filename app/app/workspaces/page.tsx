"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { PageEmpty, PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { Modal } from "@/components/ui/modal";
import {
  WorkspaceForm,
  type BillingType,
  type WorkspaceFormValue,
} from "@/components/workspace/workspace-form";
import { getAccessToken } from "@/lib/auth";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { APP_PATHS, workspacePath } from "@/lib/paths";
import { useActiveWorkspace } from "@/lib/use-active-workspace";
import { useComviaQuery } from "@/lib/use-comvia-query";
import {
  getActiveWorkspaceId,
  notifyWorkspacesListChanged,
  setActiveWorkspace,
} from "@/lib/workspace-session";

type WorkspaceRow = {
  id: string;
  name: string;
  slug?: string;
  status?: string;
  role?: string;
  joinedAt?: string;
};

/**
 * Billing profile trả về từ `GET /workspaces/:id` (BR-10). Field theo `billingType`
 * (field không thuộc loại đó = null). Chỉ Owner đọc được; `null` nếu workspace chưa có billing.
 */
type BillingProfile = {
  billingType: BillingType;
  fullName?: string | null;
  citizenId?: string | null;
  taxCode?: string | null;
  address?: string | null;
  invoiceEmail?: string | null;
  phone?: string | null;
  companyName?: string | null;
  representativeName?: string | null;
};

/** Response của `GET /workspaces/:id` (BR-10). */
type WorkspaceDetail = {
  id: string;
  name: string;
  slug?: string | null;
  status?: string;
  role?: string;
  billingProfile: BillingProfile | null;
};

/** Dựng initialValue cho WorkspaceForm từ detail (hoặc fallback list item khi GET detail lỗi). */
function toFormValue(fallback: WorkspaceRow, detail: WorkspaceDetail | null): WorkspaceFormValue {
  const bp = detail?.billingProfile ?? null;
  return {
    id: fallback.id,
    name: detail?.name ?? fallback.name,
    slug: detail?.slug ?? fallback.slug,
    billingType: bp?.billingType,
    companyName: bp?.companyName ?? undefined,
    representativeName: bp?.representativeName ?? undefined,
    fullName: bp?.fullName ?? undefined,
    citizenId: bp?.citizenId ?? undefined,
    taxCode: bp?.taxCode ?? undefined,
    address: bp?.address ?? undefined,
    invoiceEmail: bp?.invoiceEmail ?? undefined,
    phone: bp?.phone ?? undefined,
  };
}

export default function WorkspacesListPage() {
  const router = useRouter();
  const { activeWorkspaceId } = useActiveWorkspace();
  const autoEnteredRef = useRef(false);
  // Workspace đang mở trong popup "Sửa Workspace" (null = đóng).
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceRow | null>(null);
  // Chi tiết billing lấy qua GET /workspaces/:id (BR-10) để prefill form edit.
  const [detail, setDetail] = useState<WorkspaceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const fetcher = useCallback((token: string) => comviaFetch<WorkspaceRow[]>("/workspaces", { token }), []);
  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);

  const rows = data ?? [];

  const enterWorkspace = useCallback(
    async (workspace: WorkspaceRow) => {
      const token = getAccessToken();
      if (!token) {
        router.replace("/auth/login");
        return;
      }

      try {
        await comviaFetch(`/workspaces/${workspace.id}/switch`, { method: "POST", token });
      } catch {
        /* vẫn điều hướng local nếu switch lỗi */
      }

      setActiveWorkspace(workspace.id, workspace.name);
      notifyWorkspacesListChanged();
      router.push(workspacePath(workspace.id, "dashboard"));
    },
    [router],
  );

  // Mở popup Sửa → gọi GET /workspaces/:id (BR-10, chỉ Owner) prefill billing.
  // Backend chưa deploy thì GET lỗi: vẫn render form với tên/slug từ list item để sửa riêng tên.
  const loadDetail = useCallback(
    async (workspaceId: string) => {
      const token = getAccessToken();
      if (!token) {
        router.replace("/auth/login");
        return;
      }
      setDetailLoading(true);
      setDetailError(null);
      setDetail(null);
      try {
        const result = await comviaFetch<WorkspaceDetail>(`/workspaces/${workspaceId}`, { token });
        setDetail(result);
      } catch (err) {
        // 403 (hiếm, do race khi quyền đổi) hoặc backend chưa deploy → báo rõ, form vẫn dùng được.
        const msg =
          err instanceof ComviaApiError ? err.message : "Không tải được thông tin billing của workspace.";
        setDetailError(msg);
      } finally {
        setDetailLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    if (!editingWorkspace) {
      setDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }
    void loadDetail(editingWorkspace.id);
  }, [editingWorkspace, loadDetail]);

  useEffect(() => {
    if (!loading && !error && data && rows.length === 0) {
      router.replace(APP_PATHS.workspacesNew);
    }
  }, [loading, error, data, rows.length, router]);

  useEffect(() => {
    if (loading || error || rows.length !== 1 || autoEnteredRef.current) return;

    const storedActiveId = getActiveWorkspaceId();
    if (storedActiveId) return;

    autoEnteredRef.current = true;
    void enterWorkspace(rows[0]);
  }, [loading, error, rows, enterWorkspace]);

  if (loading) return <PageLoading />;
  if (error && !data) return <PageError message={error} onRetry={() => void refetch()} />;

  return (
    <div>
      <PageHeader
        title="Workspace"
        description="Chọn workspace để làm việc hoặc tạo workspace mới."
        actions={
          <Button asChild>
            <Link href={APP_PATHS.workspacesNew}>Tạo workspace mới</Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <PageEmpty
          title="Chưa có workspace"
          description="Tạo workspace đầu tiên để bắt đầu dùng Comvia."
          action={
            <Button asChild>
              <Link href={APP_PATHS.workspacesNew}>Tạo workspace</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((ws) => {
            const isCurrentWorkspace = ws.id === activeWorkspaceId;

            return (
              <Card key={ws.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{ws.name}</p>
                    {ws.slug ? <p className="text-xs text-muted-foreground">{ws.slug}</p> : null}
                  </div>
                  {ws.status ? <EntityStatusBadge value={ws.status} /> : null}
                </div>
                {ws.role ? (
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{ws.role}</p>
                ) : null}
                {ws.joinedAt ? (
                  <p className="text-xs text-muted-foreground">Tham gia: {new Date(ws.joinedAt).toLocaleString()}</p>
                ) : null}
                <div className="mt-auto flex flex-wrap gap-2">
                  {isCurrentWorkspace ? (
                    <Button size="sm" disabled>
                      Đang trong workspace
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => void enterWorkspace(ws)}>
                      Vào workspace
                    </Button>
                  )}
                  {/*
                    Nút Sửa chỉ hiện với Owner (ISSUE-007). Ẩn khi status="DELETED"
                    (BR-09 đính chính: backend trả 403 cho DELETED ở PATCH + GET detail;
                    ACTIVE/DISABLED/SUSPENDED vẫn cho sửa). TICKET-023.
                  */}
                  {ws.role === "OWNER" && ws.status !== "DELETED" ? (
                    <Button size="sm" variant="ghost" onClick={() => setEditingWorkspace(ws)}>
                      Sửa Workspace
                    </Button>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/*
        Popup Sửa Workspace (ISSUE-007): dùng chung WorkspaceForm mode="edit" (TICKET-005).
        Prefill billing thật qua GET /workspaces/:id (BR-10, chỉ Owner — TICKET-024). Chỉ mở cho
        Owner và workspace != DELETED (guard ở nút Sửa, TICKET-023) nên không gọi GET cho DELETED.
      */}
      <Modal
        open={editingWorkspace !== null}
        title="Sửa Workspace"
        onClose={() => setEditingWorkspace(null)}
      >
        {editingWorkspace ? (
          detailLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải thông tin workspace…</p>
          ) : (
            <div className="space-y-3">
              {detailError ? (
                // GET detail lỗi (vd backend chưa deploy BR-10): báo rõ nhưng vẫn cho sửa riêng tên.
                <p className="text-sm text-danger">
                  {detailError} Bạn vẫn có thể cập nhật tên workspace.
                </p>
              ) : null}
              <WorkspaceForm
                key={editingWorkspace.id}
                mode="edit"
                initialValue={toFormValue(editingWorkspace, detail)}
                // Chỉ validate billing chặt khi đã prefill đầy đủ (có billingProfile). Workspace chưa
                // có billing (billingProfile = null) hoặc GET lỗi → nới validate, cho sửa riêng tên.
                billingPrefilled={detail?.billingProfile != null}
                onSubmitted={() => {
                  setEditingWorkspace(null);
                  notifyWorkspacesListChanged();
                  void refetch();
                }}
              />
            </div>
          )
        ) : null}
      </Modal>
    </div>
  );
}
