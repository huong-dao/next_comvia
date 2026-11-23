"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { getAccessToken } from "@/lib/auth";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { localInputToIso, type AdminSubscription, type Paginated } from "@/lib/subscription";
import { planOptionLabel, useAdminPlans } from "@/lib/use-admin-plans";

export type GrantWorkspace = { id: string; name?: string };

type WorkspaceSearchRow = { id: string; name?: string; slug?: string; status?: string };

/**
 * Cấp tay một kỳ cho workspace — `POST /admin/workspaces/:workspaceId/subscriptions` (admin map 8A).
 * Bỏ trống ngày = cộng dồn theo số năm của gói; chỉ có `startsAt` thì `endsAt = startsAt + số năm`.
 * Không có gói miễn phí tự động nên đây là cách duy nhất để workspace cũ gửi lại được tin.
 * Mount mới cho mỗi lần mở (đặt `key` theo workspace) để form không giữ dữ liệu lần trước.
 */
export function SubscriptionGrantModal({
  workspace,
  onClose,
  onGranted,
}: {
  /** Workspace cố định (mở từ danh sách workspace). Bỏ trống → modal có ô tìm workspace. */
  workspace?: GrantWorkspace;
  onClose: () => void;
  onGranted: (result: AdminSubscription) => void;
}) {
  const { data: plans, loading: plansLoading, error: plansError } = useAdminPlans();
  const planRows = plans?.data ?? [];

  const [keyword, setKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<WorkspaceSearchRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [workspaceId, setWorkspaceId] = useState(workspace?.id ?? "");
  const [planId, setPlanId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const startsIso = localInputToIso(startsAt);
  const endsIso = localInputToIso(endsAt);
  const startsInFuture = startsIso !== null && new Date(startsIso).getTime() > Date.now();

  async function searchWorkspaces() {
    const token = getAccessToken();
    if (!token) return;
    setSearching(true);
    setErr(null);
    try {
      const qs = new URLSearchParams({ page: "1", limit: "20" });
      if (keyword.trim()) qs.set("keyword", keyword.trim());
      const res = await comviaFetch<Paginated<WorkspaceSearchRow>>(`/admin/workspaces?${qs.toString()}`, { token });
      setCandidates(res.data);
      setWorkspaceId(res.data[0]?.id ?? "");
      setSearched(true);
    } catch (e) {
      setErr(e instanceof ComviaApiError ? e.message : "Không tìm được workspace.");
    } finally {
      setSearching(false);
    }
  }

  async function submit() {
    if (busy) return;
    const token = getAccessToken();
    if (!token) return;
    if (!workspaceId) {
      setErr("Chọn workspace cần cấp gói.");
      return;
    }
    if (!planId) {
      setErr("Chọn gói.");
      return;
    }
    if (startsAt && !startsIso) {
      setErr("Ngày bắt đầu không hợp lệ.");
      return;
    }
    if (endsAt && !endsIso) {
      setErr("Ngày hết hạn không hợp lệ.");
      return;
    }
    if (startsIso && endsIso && new Date(endsIso).getTime() <= new Date(startsIso).getTime()) {
      setErr("Ngày hết hạn phải sau ngày bắt đầu.");
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      const body: Record<string, string> = { planId };
      if (startsIso) body.startsAt = startsIso;
      if (endsIso) body.endsAt = endsIso;
      if (note.trim()) body.note = note.trim();
      const result = await comviaFetch<AdminSubscription>(`/admin/workspaces/${workspaceId}/subscriptions`, {
        method: "POST",
        token,
        body: JSON.stringify(body),
      });
      onGranted(result);
    } catch (e) {
      setErr(e instanceof ComviaApiError ? e.message : "Không cấp được gói.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Cấp gói cho workspace"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button onClick={() => void submit()} disabled={busy || plansLoading || !workspaceId || !planId}>
            {busy ? "Đang cấp…" : "Cấp gói"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {workspace ? (
          <p className="text-sm">
            Workspace: <strong>{workspace.name ?? workspace.id}</strong>
          </p>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="grant-ws-keyword">
              Tìm workspace
            </label>
            <div className="flex gap-2">
              <Input
                id="grant-ws-keyword"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void searchWorkspaces();
                }}
                placeholder="Tên hoặc slug workspace"
              />
              <Button variant="outline" onClick={() => void searchWorkspaces()} disabled={searching}>
                {searching ? "Đang tìm…" : "Tìm"}
              </Button>
            </div>
            {searched ? (
              candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">Không có workspace phù hợp.</p>
              ) : (
                <Select value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} aria-label="Workspace được cấp gói">
                  {candidates.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name ?? w.slug ?? w.id}
                      {w.status && w.status !== "ACTIVE" ? ` (${w.status})` : ""}
                    </option>
                  ))}
                </Select>
              )
            ) : null}
          </div>
        )}

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="grant-plan">
            Gói
          </label>
          <Select id="grant-plan" value={planId} onChange={(e) => setPlanId(e.target.value)} disabled={plansLoading}>
            <option value="">{plansLoading ? "Đang tải gói…" : "— Chọn gói —"}</option>
            {planRows.map((p) => (
              <option key={p.id} value={p.id}>
                {planOptionLabel(p)}
              </option>
            ))}
          </Select>
          {plansError ? <p className="mt-1 text-xs text-danger">{plansError}</p> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="grant-starts">
              Bắt đầu (tùy chọn)
            </label>
            <Input id="grant-starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="grant-ends">
              Hết hạn (tùy chọn)
            </label>
            <Input id="grant-ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Bỏ trống cả hai ngày = cộng dồn theo số năm của gói. Chỉ nhập ngày bắt đầu thì ngày hết hạn = bắt đầu + số năm
          của gói.
        </p>
        {startsInFuture ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Ngày bắt đầu ở tương lai: nếu workspace chưa có kỳ nào khác thì workspace vẫn chưa gửi được tin cho tới ngày
            đó.
          </p>
        ) : null}

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="grant-note">
            Ghi chú
          </label>
          <Textarea id="grant-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Lý do cấp gói (tùy chọn)" />
        </div>

        {err ? <p className="text-sm text-danger">{err}</p> : null}
      </div>
    </Modal>
  );
}
