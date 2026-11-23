"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { getAccessToken } from "@/lib/auth";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { MIN_PAY2S_AMOUNT, calcPlanAmounts, type SubscriptionPlan } from "@/lib/subscription";
import { formatVND } from "@/lib/utils";

const NAME_MAX = 120;
const CODE_MIN = 2;
const CODE_MAX = 40;
const DESCRIPTION_MAX = 500;

/**
 * Tạo / sửa gói — `POST /admin/subscription-plans`, `PATCH /admin/subscription-plans/:planId` (admin map 8A).
 * - Tạo: bắt buộc `name`, `priceExclVat`, `vatPercent`, `durationYears`; `code` tùy chọn (bỏ trống = tự sinh).
 * - Sửa: KHÔNG gửi `code` (BE trả 400); `description` chỉ đổi sang chuỗi, không set về `null`.
 * - Tổng sau VAT tính live bằng cùng công thức BE; < 10.000đ thì cảnh báo vì owner không mua được qua Pay2S.
 * Mount mới cho mỗi lần mở (đặt `key`).
 */
export function SubscriptionPlanModal({
  plan,
  onClose,
  onSaved,
}: {
  /** `null` = tạo gói mới. */
  plan: SubscriptionPlan | null;
  onClose: () => void;
  onSaved: (result: SubscriptionPlan, mode: "created" | "updated") => void;
}) {
  const editing = plan !== null;

  const [name, setName] = useState(plan?.name ?? "");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [price, setPrice] = useState(plan ? String(plan.priceExclVat) : "");
  const [vatPercent, setVatPercent] = useState(plan ? String(plan.vatPercent) : "10");
  const [years, setYears] = useState(plan ? String(plan.durationYears) : "1");
  const [sortOrder, setSortOrder] = useState(plan ? String(plan.sortOrder) : "0");
  const [isActive, setIsActive] = useState(plan?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const priceNum = Number(price);
  const vatNum = Number(vatPercent);
  const priceOk = price.trim() !== "" && Number.isFinite(priceNum) && priceNum >= 0;
  const vatOk = vatPercent.trim() !== "" && Number.isFinite(vatNum) && vatNum >= 0 && vatNum <= 100;

  const amounts = useMemo(
    () => (priceOk && vatOk ? calcPlanAmounts(priceNum, vatNum) : null),
    [priceOk, vatOk, priceNum, vatNum],
  );
  const belowMinimum = amounts !== null && amounts.total < MIN_PAY2S_AMOUNT;

  function validate(): string | null {
    const trimmedName = name.trim();
    if (!trimmedName) return "Nhập tên gói.";
    if (trimmedName.length > NAME_MAX) return `Tên gói tối đa ${NAME_MAX} ký tự.`;
    if (!editing && code.trim() && (code.trim().length < CODE_MIN || code.trim().length > CODE_MAX)) {
      return `Mã gói từ ${CODE_MIN} đến ${CODE_MAX} ký tự (hoặc để trống để hệ thống tự sinh).`;
    }
    if (description.length > DESCRIPTION_MAX) return `Mô tả tối đa ${DESCRIPTION_MAX} ký tự.`;
    if (!priceOk) return "Giá chưa VAT phải là số ≥ 0.";
    if (!vatOk) return "VAT phải là số từ 0 đến 100.";
    const y = Number(years);
    if (!Number.isInteger(y) || y < 1 || y > 20) return "Thời hạn phải là số nguyên từ 1 đến 20 năm.";
    const order = Number(sortOrder);
    if (sortOrder.trim() === "" || !Number.isInteger(order)) return "Thứ tự hiển thị phải là số nguyên.";
    return null;
  }

  async function submit() {
    if (busy) return;
    const invalid = validate();
    if (invalid) {
      setErr(invalid);
      return;
    }
    const token = getAccessToken();
    if (!token) return;

    const body: Record<string, unknown> = {
      name: name.trim(),
      priceExclVat: priceNum,
      vatPercent: vatNum,
      durationYears: Number(years),
      isActive,
      sortOrder: Number(sortOrder),
    };
    if (editing) {
      // PATCH: description luôn là chuỗi (kể cả rỗng), tuyệt đối không gửi `code`.
      body.description = description.trim();
    } else {
      if (code.trim()) body.code = code.trim();
      if (description.trim()) body.description = description.trim();
    }

    setBusy(true);
    setErr(null);
    try {
      const result = await comviaFetch<SubscriptionPlan>(
        editing ? `/admin/subscription-plans/${plan.id}` : "/admin/subscription-plans",
        { method: editing ? "PATCH" : "POST", token, body: JSON.stringify(body) },
      );
      onSaved(result, editing ? "updated" : "created");
    } catch (e) {
      // 409: mã gói trùng; 400: dữ liệu sai — hiện `message` thô của BE.
      setErr(e instanceof ComviaApiError ? e.message : "Không lưu được gói.");
    } finally {
      setBusy(false);
    }
  }

  const labelClass = "mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground";

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Sửa gói" : "Tạo gói mới"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="plan-name">
              Tên gói *
            </label>
            <Input id="plan-name" value={name} maxLength={NAME_MAX} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="plan-code">
              Mã gói
            </label>
            {editing ? (
              <Input id="plan-code" value={plan.code} disabled readOnly />
            ) : (
              <Input
                id="plan-code"
                value={code}
                maxLength={CODE_MAX}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Để trống = tự sinh"
              />
            )}
            {editing ? <p className="mt-1 text-xs text-muted-foreground">Không đổi được mã gói sau khi tạo.</p> : null}
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="plan-description">
            Mô tả
          </label>
          <Textarea
            id="plan-description"
            rows={2}
            value={description}
            maxLength={DESCRIPTION_MAX}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="plan-price">
              Giá chưa VAT (VND) *
            </label>
            <Input id="plan-price" type="number" min={0} step={1} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="plan-vat">
              VAT (%) *
            </label>
            <Input
              id="plan-vat"
              type="number"
              min={0}
              max={100}
              step="any"
              value={vatPercent}
              onChange={(e) => setVatPercent(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="plan-years">
              Thời hạn (năm) *
            </label>
            <Input id="plan-years" type="number" min={1} max={20} step={1} value={years} onChange={(e) => setYears(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2 rounded-xl bg-surface-muted p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Giá chưa VAT</span>
            <span className="font-medium tabular-nums">{amounts ? formatVND(priceNum) : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">VAT {vatOk ? `${vatNum}%` : ""}</span>
            <span className="font-medium tabular-nums">{amounts ? formatVND(amounts.vatAmount) : "—"}</span>
          </div>
          <div className="flex justify-between border-t border-border/60 pt-2 font-semibold">
            <span>Khách thanh toán</span>
            <span className="tabular-nums">{amounts ? formatVND(amounts.total) : "—"}</span>
          </div>
        </div>
        {belowMinimum ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Tổng sau VAT dưới {formatVND(MIN_PAY2S_AMOUNT)}: vẫn lưu được nhưng owner sẽ không mua được gói này (ngưỡng
            tối thiểu của Pay2S).
          </p>
        ) : null}

        <div className="grid items-end gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="plan-sort">
              Thứ tự hiển thị
            </label>
            <Input id="plan-sort" type="number" step={1} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>
          <label className="flex h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Đang bán
          </label>
        </div>

        {editing ? (
          <p className="text-xs text-muted-foreground">
            Sửa gói không ảnh hưởng đơn đã mua (đã lưu theo giá/thời hạn lúc mua) và không đổi các subscription đang chạy.
          </p>
        ) : null}
        {err ? <p className="text-sm text-danger">{err}</p> : null}
      </div>
    </Modal>
  );
}
