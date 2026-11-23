"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { getAccessToken } from "@/lib/auth";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import {
  isoToLocalInput,
  localInputToIso,
  type AdminSubscription,
  type WorkspaceSubscriptionStatus,
} from "@/lib/subscription";
import { planOptionLabel, useAdminPlans } from "@/lib/use-admin-plans";

/**
 * Sửa một kỳ — `PATCH /admin/subscriptions/:id` (admin map 8A). Chỉ gửi field đã đổi.
 * `endsAt` phải sau `startsAt`; `status: "CANCELLED"` thu hồi ngay nên luôn qua bước xác nhận.
 * Mount mới cho mỗi lần mở (đặt `key` theo subscription).
 */
export function SubscriptionEditModal({
  subscription,
  onClose,
  onSaved,
}: {
  subscription: AdminSubscription;
  onClose: () => void;
  onSaved: (result: AdminSubscription) => void;
}) {
  const { data: plans, loading: plansLoading, error: plansError } = useAdminPlans();
  const planRows = plans?.data ?? [];

  const [planId, setPlanId] = useState(subscription.plan.id);
  const [startsAt, setStartsAt] = useState(isoToLocalInput(subscription.startsAt));
  const [endsAt, setEndsAt] = useState(isoToLocalInput(subscription.endsAt));
  const [status, setStatus] = useState<WorkspaceSubscriptionStatus>(subscription.status);
  const [note, setNote] = useState(subscription.note ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  // Gói hiện tại luôn có trong ô chọn kể cả khi vượt trang 100 gói đầu hoặc đã tắt.
  const planInList = planRows.some((p) => p.id === subscription.plan.id);

  /** Trả về body chỉ gồm field đã đổi, hoặc `null` + đặt lỗi khi dữ liệu không hợp lệ. */
  function buildBody(): Record<string, string> | null {
    const startsIso = localInputToIso(startsAt);
    const endsIso = localInputToIso(endsAt);
    if (!startsIso || !endsIso) {
      setErr("Nhập đủ ngày bắt đầu và ngày hết hạn hợp lệ.");
      return null;
    }
    if (new Date(endsIso).getTime() <= new Date(startsIso).getTime()) {
      setErr("Ngày hết hạn phải sau ngày bắt đầu.");
      return null;
    }

    const body: Record<string, string> = {};
    if (planId !== subscription.plan.id) body.planId = planId;
    if (new Date(startsIso).getTime() !== new Date(subscription.startsAt).getTime()) body.startsAt = startsIso;
    if (new Date(endsIso).getTime() !== new Date(subscription.endsAt).getTime()) body.endsAt = endsIso;
    if (status !== subscription.status) body.status = status;
    if (note.trim() !== (subscription.note ?? "").trim()) body.note = note.trim();
    if (Object.keys(body).length === 0) {
      setErr("Chưa có thay đổi nào để lưu.");
      return null;
    }
    return body;
  }

  async function save(body: Record<string, string>) {
    if (busy) return;
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const result = await comviaFetch<AdminSubscription>(`/admin/subscriptions/${subscription.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify(body),
      });
      onSaved(result);
    } catch (e) {
      setConfirmingCancel(false);
      setErr(e instanceof ComviaApiError ? e.message : "Không lưu được thay đổi.");
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    setErr(null);
    const body = buildBody();
    if (!body) return;
    if (body.status === "CANCELLED") {
      setConfirmingCancel(true);
      return;
    }
    void save(body);
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title="Sửa kỳ subscription"
        footer={
          <>
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Hủy
            </Button>
            <Button onClick={submit} disabled={busy || plansLoading}>
              {busy ? "Đang lưu…" : "Lưu"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm">
            Workspace: <strong>{subscription.workspace.name ?? subscription.workspace.id}</strong>
            {subscription.workspace.owner?.email ? (
              <span className="text-muted-foreground"> · {subscription.workspace.owner.email}</span>
            ) : null}
          </p>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="sub-edit-plan">
              Gói
            </label>
            <Select id="sub-edit-plan" value={planId} onChange={(e) => setPlanId(e.target.value)} disabled={plansLoading}>
              {planInList ? null : <option value={subscription.plan.id}>{subscription.plan.name}</option>}
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
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="sub-edit-starts">
                Bắt đầu
              </label>
              <Input id="sub-edit-starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="sub-edit-ends">
                Hết hạn
              </label>
              <Input id="sub-edit-ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="sub-edit-status">
              Trạng thái lưu
            </label>
            <Select
              id="sub-edit-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as WorkspaceSubscriptionStatus)}
            >
              <option value="ACTIVE">Đang hiệu lực</option>
              <option value="CANCELLED">Thu hồi</option>
            </Select>
            {status === "CANCELLED" && subscription.status !== "CANCELLED" ? (
              <p className="mt-1 text-xs text-danger">
                Thu hồi có hiệu lực ngay: workspace không gửi được tin nếu không còn kỳ nào khác.
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground" htmlFor="sub-edit-note">
              Ghi chú
            </label>
            <Textarea id="sub-edit-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <p className="text-xs text-muted-foreground">
            Đổi ngày hết hạn sẽ đặt lại cờ đã nhắc hết hạn để hệ thống nhắc lại theo hạn mới.
          </p>
          {err ? <p className="text-sm text-danger">{err}</p> : null}
        </div>
      </Modal>

      <Modal
        open={confirmingCancel}
        onClose={() => setConfirmingCancel(false)}
        title="Xác nhận thu hồi gói"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmingCancel(false)} disabled={busy}>
              Quay lại
            </Button>
            <Button
              className="bg-red-600 text-white"
              onClick={() => {
                const body = buildBody();
                if (body) void save(body);
              }}
              disabled={busy}
            >
              {busy ? "Đang thu hồi…" : "Thu hồi ngay"}
            </Button>
          </>
        }
      >
        <p className="text-sm">
          Thu hồi kỳ <strong>{subscription.plan.name}</strong> của workspace{" "}
          <strong>{subscription.workspace.name ?? subscription.workspace.id}</strong>. Workspace sẽ không gửi được tin
          nếu không còn kỳ subscription nào khác đang hiệu lực.
        </p>
      </Modal>
    </>
  );
}
