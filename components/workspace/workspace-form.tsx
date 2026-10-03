"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiOutlineArrowLeft,
  HiOutlineBuildingOffice2,
  HiOutlineCheckCircle,
  HiOutlineIdentification,
  HiOutlineUser,
} from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Radio } from "@/components/ui/controls";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";
import { APP_PATHS } from "@/lib/paths";

export type BillingType = "ORGANIZATION" | "INDIVIDUAL";

/**
 * Giá trị khởi tạo cho form workspace.
 * - `id` chỉ cần ở `mode="edit"` để biết gọi `PATCH /workspaces/:id`.
 */
export type WorkspaceFormValue = {
  id?: string;
  name?: string;
  slug?: string;
  billingType?: BillingType;
  companyName?: string;
  representativeName?: string;
  fullName?: string;
  citizenId?: string;
  taxCode?: string;
  address?: string;
  invoiceEmail?: string;
  phone?: string;
};

/** Workspace trả về từ `POST /workspaces` / `PATCH /workspaces/:id` (§4.1, §4.4). */
export type WorkspaceFormResult = {
  id: string;
  name?: string;
  slug?: string | null;
  status?: string;
};

type WorkspaceFormProps = {
  mode: "create" | "edit";
  initialValue?: WorkspaceFormValue;
  /**
   * `true` khi billing đã được prefill đầy đủ từ `GET /workspaces/:id`
   * (BR-10, chỉ Owner). Khi đó validate billing ở mode edit chặt như create.
   * `false` (mặc định) = chưa có billing prefill (workspace chưa có billing,
   * hoặc GET detail lỗi) → nới validate: cho sửa riêng tên, chỉ gửi field có nhập.
   */
  billingPrefilled?: boolean;
  onSubmitted: (ws: WorkspaceFormResult) => void;
};

export function WorkspaceForm({ mode, initialValue, billingPrefilled = false, onSubmitted }: WorkspaceFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialValue?.name ?? "");
  // Không có input slug (backend tự sinh nếu bỏ trống); chỉ giữ giá trị prefill cho edit.
  const slug = initialValue?.slug ?? "";
  const [billingType, setBillingType] = useState<BillingType>(initialValue?.billingType ?? "ORGANIZATION");
  const [companyName, setCompanyName] = useState(initialValue?.companyName ?? "");
  const [representativeName, setRepresentativeName] = useState(initialValue?.representativeName ?? "");
  const [fullName, setFullName] = useState(initialValue?.fullName ?? "");
  const [citizenId, setCitizenId] = useState(initialValue?.citizenId ?? "");
  const [taxCode, setTaxCode] = useState(initialValue?.taxCode ?? "");
  const [address, setAddress] = useState(initialValue?.address ?? "");
  const [invoiceEmail, setInvoiceEmail] = useState(initialValue?.invoiceEmail ?? "");
  const [phone, setPhone] = useState(initialValue?.phone ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const token = getAccessToken();
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    if (!name.trim()) {
      setFormError("Tên workspace là bắt buộc.");
      return;
    }

    // Validate billing đầy đủ khi: mode create, HOẶC mode edit đã prefill billing thật
    // (BR-10: GET /workspaces/:id trả billingProfile → form có đủ field để kiểm như create).
    // Nếu mode edit mà CHƯA prefill (workspace chưa có billing, hoặc GET detail lỗi) thì nới
    // validate: người dùng vẫn sửa được riêng tên, chỉ gửi field có nhập qua PATCH từng phần (§4.4).
    const validateBillingFull = mode === "create" || billingPrefilled;
    if (validateBillingFull) {
      if (!address.trim() || !invoiceEmail.trim() || !phone.trim()) {
        setFormError("Vui lòng nhập đầy đủ thông tin xuất hóa đơn bắt buộc.");
        return;
      }

      // Quy tắc billing (ISSUE-001, xác nhận BR-01): Mã số thuế chỉ bắt buộc với tổ chức;
      // cá nhân KHÔNG gửi taxCode — backend đã bỏ bắt buộc (không còn 400).
      if (billingType === "ORGANIZATION" && !taxCode.trim()) {
        setFormError("Mã số thuế là bắt buộc với billing tổ chức.");
        return;
      }

      if (billingType === "ORGANIZATION" && !companyName.trim()) {
        setFormError("Tên công ty là bắt buộc.");
        return;
      }

      if (billingType === "INDIVIDUAL" && (!fullName.trim() || !citizenId.trim())) {
        setFormError("Billing cá nhân yêu cầu họ tên và CCCD.");
        return;
      }
    }

    // Validate định dạng email chỉ khi có nhập (create luôn có; edit chỉ khi người dùng nhập).
    if (invoiceEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invoiceEmail.trim())) {
      setFormError("Email nhận hóa đơn không hợp lệ.");
      return;
    }

    let billing: Record<string, string | undefined> | undefined;
    if (validateBillingFull) {
      // Create, hoặc edit đã prefill billing đầy đủ: gửi nguyên billing (đã validate đủ field).
      billing =
        billingType === "ORGANIZATION"
          ? {
              billingType,
              companyName: companyName.trim(),
              taxCode: taxCode.trim(),
              address: address.trim(),
              invoiceEmail: invoiceEmail.trim(),
              representativeName: representativeName.trim() || undefined,
              phone: phone.trim(),
            }
          : {
              // Billing cá nhân: KHÔNG gửi taxCode (ISSUE-001 / BR-01 — optional, backend không 400),
              // kể cả khi state còn giá trị cũ.
              billingType,
              fullName: fullName.trim(),
              citizenId: citizenId.trim(),
              address: address.trim(),
              invoiceEmail: invoiceEmail.trim(),
              phone: phone.trim(),
            };
    } else {
      // Mode edit chưa prefill billing: chỉ gửi field người dùng có nhập; field trống bỏ khỏi body
      // → giữ giá trị cũ ở backend (PATCH từng phần, §4.4). Quy tắc ẩn/không gửi taxCode cho cá nhân giữ nguyên.
      const partial: Record<string, string> = {};
      if (billingType === "ORGANIZATION") {
        if (companyName.trim()) partial.companyName = companyName.trim();
        if (taxCode.trim()) partial.taxCode = taxCode.trim();
        if (representativeName.trim()) partial.representativeName = representativeName.trim();
      } else {
        if (fullName.trim()) partial.fullName = fullName.trim();
        if (citizenId.trim()) partial.citizenId = citizenId.trim();
      }
      if (address.trim()) partial.address = address.trim();
      if (invoiceEmail.trim()) partial.invoiceEmail = invoiceEmail.trim();
      if (phone.trim()) partial.phone = phone.trim();
      // Chỉ kèm billing (và billingType) khi có ít nhất 1 field billing được nhập → tránh vô tình
      // ghi đè loại/field billing cũ khi người dùng chỉ sửa tên.
      billing = Object.keys(partial).length > 0 ? { billingType, ...partial } : undefined;
    }

    const body = JSON.stringify({
      name: name.trim(),
      slug: slug.trim() || undefined,
      billing,
    });

    setLoading(true);
    try {
      let result: WorkspaceFormResult;
      if (mode === "edit") {
        if (!initialValue?.id) {
          throw new ComviaApiError("Thiếu id workspace để cập nhật.", 400, null);
        }
        // BR-09: backend chỉ chặn theo quyền Owner, KHÔNG chặn theo WorkspaceStatus — Owner sửa
        // được ở mọi trạng thái (ACTIVE/DISABLED/SUSPENDED/DELETED) → FE không gate submit theo status.
        result = await comviaFetch<WorkspaceFormResult>(`/workspaces/${initialValue.id}`, {
          method: "PATCH",
          token,
          body,
        });
      } else {
        result = await comviaFetch<WorkspaceFormResult>("/workspaces", {
          method: "POST",
          token,
          body,
        });
      }
      onSubmitted(result);
    } catch (err) {
      const fallback = mode === "edit" ? "Không cập nhật được workspace." : "Không tạo được workspace.";
      const msg = err instanceof ComviaApiError ? err.message : fallback;
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-4">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tên workspace
          </label>
          <Input
            placeholder="Ví dụ: Công ty ABC"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            required
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-surface-muted/30 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Billing type</p>
        <div className="flex flex-wrap gap-6">
          <Radio checked={billingType === "ORGANIZATION"} onCheckedChange={() => setBillingType("ORGANIZATION")} label="Tổ chức" />
          <Radio checked={billingType === "INDIVIDUAL"} onCheckedChange={() => setBillingType("INDIVIDUAL")} label="Cá nhân" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {billingType === "ORGANIZATION" ? (
          <>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tên công ty
              </label>
              <Input
                placeholder="Demo Company"
                value={companyName}
                onChange={(ev) => setCompanyName(ev.target.value)}
                leadingIcon={<HiOutlineBuildingOffice2 className="size-4" />}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Người đại diện (tùy chọn)
              </label>
              <Input
                placeholder="Nguyễn Văn A"
                value={representativeName}
                onChange={(ev) => setRepresentativeName(ev.target.value)}
                leadingIcon={<HiOutlineUser className="size-4" />}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Họ và tên
              </label>
              <Input
                placeholder="Nguyễn Văn B"
                value={fullName}
                onChange={(ev) => setFullName(ev.target.value)}
                leadingIcon={<HiOutlineUser className="size-4" />}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                CCCD
              </label>
              <Input
                placeholder="079123456789"
                value={citizenId}
                onChange={(ev) => setCitizenId(ev.target.value)}
                leadingIcon={<HiOutlineIdentification className="size-4" />}
              />
            </div>
          </>
        )}
        {/* Mã số thuế: chỉ hiển thị cho tổ chức (ISSUE-001). */}
        {billingType === "ORGANIZATION" ? (
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mã số thuế
            </label>
            <Input placeholder="0312345678" value={taxCode} onChange={(ev) => setTaxCode(ev.target.value)} />
          </div>
        ) : null}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Số điện thoại
          </label>
          <Input placeholder="0901234567" value={phone} onChange={(ev) => setPhone(ev.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Địa chỉ
          </label>
          <Input placeholder="123 Demo Street" value={address} onChange={(ev) => setAddress(ev.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Email nhận hóa đơn
          </label>
          <Input placeholder="billing@demo.com" type="email" value={invoiceEmail} onChange={(ev) => setInvoiceEmail(ev.target.value)} />
        </div>
      </div>

      {formError ? <p className="text-sm text-danger">{formError}</p> : null}
      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={loading} icon={<HiOutlineCheckCircle className="size-4" />}>
          {mode === "edit"
            ? loading
              ? "Đang lưu…"
              : "Lưu thay đổi"
            : loading
              ? "Đang tạo…"
              : "Tạo workspace"}
        </Button>
        {mode === "create" ? (
          <Button type="button" variant="ghost" asChild icon={<HiOutlineArrowLeft className="size-4" />}>
            <Link href={APP_PATHS.workspaces}>Quay lại</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
