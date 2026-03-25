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
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Radio } from "@/components/ui/controls";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";
import { APP_PATHS, workspacePath } from "@/lib/paths";

type BillingType = "ORGANIZATION" | "INDIVIDUAL";

export default function NewWorkspacePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [billingType, setBillingType] = useState<BillingType>("ORGANIZATION");
  const [companyName, setCompanyName] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [fullName, setFullName] = useState("");
  const [citizenId, setCitizenId] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [address, setAddress] = useState("");
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const token = getAccessToken();
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    if (!name.trim()) {
      setError("Tên workspace là bắt buộc.");
      return;
    }

    if (!taxCode.trim() || !address.trim() || !invoiceEmail.trim() || !phone.trim()) {
      setError("Vui lòng nhập đầy đủ thông tin xuất hóa đơn bắt buộc.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invoiceEmail.trim())) {
      setError("Email nhận hóa đơn không hợp lệ.");
      return;
    }

    if (billingType === "ORGANIZATION" && !companyName.trim()) {
      setError("Tên công ty là bắt buộc.");
      return;
    }

    if (billingType === "INDIVIDUAL" && (!fullName.trim() || !citizenId.trim())) {
      setError("Billing cá nhân yêu cầu họ tên và CCCD.");
      return;
    }

    setLoading(true);
    try {
      const created = await comviaFetch<{ id: string }>("/workspaces", {
        method: "POST",
        token,
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || undefined,
          billing:
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
                  billingType,
                  fullName: fullName.trim(),
                  citizenId: citizenId.trim(),
                  taxCode: taxCode.trim(),
                  address: address.trim(),
                  invoiceEmail: invoiceEmail.trim(),
                  phone: phone.trim(),
                },
        }),
      });
      router.push(workspacePath(created.id, "dashboard"));
    } catch (err) {
      const msg = err instanceof ComviaApiError ? err.message : "Không tạo được workspace.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Tạo workspace mới"
        description="Tạo workspace và khai báo billing info ngay từ đầu để sẵn sàng topup và xuất hóa đơn."
        actions={
          <Button variant="outline" asChild icon={<HiOutlineArrowLeft className="size-4" />}>
            <Link href={APP_PATHS.workspaces}>Hủy</Link>
          </Button>
        }
      />

      <Card className="max-w-3xl">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
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
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Slug (tùy chọn)
              </label>
              <Input placeholder="cong-ty-abc" value={slug} onChange={(ev) => setSlug(ev.target.value)} />
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
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mã số thuế
              </label>
              <Input placeholder="0312345678" value={taxCode} onChange={(ev) => setTaxCode(ev.target.value)} />
            </div>
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

          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={loading} icon={<HiOutlineCheckCircle className="size-4" />}>
              {loading ? "Đang tạo…" : "Tạo workspace"}
            </Button>
            <Button type="button" variant="ghost" asChild icon={<HiOutlineArrowLeft className="size-4" />}>
              <Link href={APP_PATHS.workspaces}>Quay lại</Link>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
