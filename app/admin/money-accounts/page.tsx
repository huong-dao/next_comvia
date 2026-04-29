"use client";

import { useState, useCallback } from "react";
import { HiOutlineXMark, HiOutlinePlus, HiOutlinePencilSquare, HiOutlineCheckCircle } from "react-icons/hi2";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { SimpleTable } from "@/components/ui/simple-table";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";
import { useComviaQuery } from "@/lib/use-comvia-query";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/controls";

type MoneyAccountRow = {
  id: string;
  accountNumber: string;
  bankName: string;
  bankCode: string;
  pay2sBankId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function AdminMoneyAccountPage() {
    const fetcher = useCallback((token: string) => comviaFetch<MoneyAccountRow[]>("/money-accounts/all", { token }), []);
    const { data, loading, error, refetch } = useComviaQuery(true, fetcher);
    const rows: MoneyAccountRow[] = (data as any)?.data || [];

    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        accountNumber: '',
        bankName: '',
        bankCode: '',
        pay2sBankId: '',
        isActive: true,
    });

    const [isOpen, setIsOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('Thêm tài khoản ngân hàng');

    function handleOpenModal(title: string, data?: MoneyAccountRow | null) {
        setModalTitle(title);
        setIsOpen(true);
    
        if (title === 'Sửa tài khoản ngân hàng' && data) {
            setEditingId(data.id);
    
            setFormData({
                accountNumber: data.accountNumber ?? '',
                bankName: data.bankName ?? '',
                bankCode: data.bankCode ?? '',
                pay2sBankId: data.pay2sBankId ?? '',
                isActive: data.isActive ?? true,
            });
        } else {
            setEditingId(null);
    
            setFormData({
                accountNumber: '',
                bankName: '',
                bankCode: '',
                pay2sBankId: '',
                isActive: true,
            });
        }
    }

    function handleCloseModal() {
        setIsOpen(false);
    }

    // **Endpoint:** `POST /money-accounts`

    // **Request Body:**
    // ```typescript
    // {
    // "accountNumber": string,      // Số tài khoản (bắt buộc, unique)
    // "bankName": string,          // Tên ngân hàng (tùy chọn)
    // "bankCode": string,          // Mã ngân hàng (tùy chọn)
    // "pay2sBankId": string,       // Bank ID của Pay2S (tùy chọn)
    // "isActive": boolean          // Trạng thái active (mặc định: true)
    // }
    // ```

    // **Response:**
    // ```typescript
    // {
    // "success": true,
    // "data": {
    //     "id": string,
    //     "accountNumber": string,
    //     "bankName": string | null,
    //     "bankCode": string | null,
    //     "pay2sBankId": string | null,
    //     "isActive": boolean,
    //     "createdAt": string,
    //     "updatedAt": string
    // },
    // "message": "Money account created successfully"
    // }

    const handleCreateMoneyAccount = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const response = await comviaFetch<{ success: boolean; data: MoneyAccountRow; message: string }>("/money-accounts", {
            method: "POST",
                body: JSON.stringify(formData),
                token: getAccessToken() ?? undefined,
            });
            if (!response.success) {
                throw new Error(response.message);
            }
            void refetch();
            handleCloseModal();
        } catch (err) {
            alert(err instanceof ComviaApiError ? err.message : "Không tạo được tài khoản ngân hàng.");
        }
    };

    const handleUpdateMoneyAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await comviaFetch<{ success: boolean; data: MoneyAccountRow; message: string }>("/money-accounts/" + editingId, {
                method: "PATCH",
                body: JSON.stringify(formData),
                token: getAccessToken() ?? undefined,
            });
            if (!response.success) {
                throw new Error(response.message);
            }
            void refetch();
            handleCloseModal();
        } catch (err) {
            alert(err instanceof ComviaApiError ? err.message : "Không cập nhật được tài khoản ngân hàng.");
        }
    };

    return (
    <AdminRoleGate>
        {loading ? <PageLoading /> : null}
        {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}
        {data ? (
        <div>
            <PageHeader
            title="Tài khoản ngân hàng"
            description="Danh sách tài khoản ngân hàng công ty."
            actions={
                <Button variant="outline" size="sm" icon={<HiOutlinePlus className="size-4" />} onClick={() => handleOpenModal('Thêm tài khoản mới')}>
                Thêm tài khoản mới
                </Button>
            }
            />
            <SimpleTable
            rows={rows}
            getRowKey={(r) => String((r as MoneyAccountRow).id)}
            columns={[
                {
                  key: "accountNumber",
                  header: "Số tài khoản",
                  cell: (r) => (r as MoneyAccountRow).accountNumber ?? "—",
                },
                {
                  key: "bankName",
                  header: "Tên tài khoản",
                  cell: (r) => (r as MoneyAccountRow).bankName ?? "—",
                },
                {
                  key: "bankCode",
                  header: "Mã ngân hàng",
                  cell: (r) => (r as MoneyAccountRow).bankCode ?? "—",
                },
                {
                  key: "pay2sBankId",
                  header: "Pay2S Bank ID",
                  cell: (r) => (r as MoneyAccountRow).pay2sBankId ?? "—",
                },
              ]}
            />

            <Modal 
                open={isOpen} 
                onClose={handleCloseModal} 
                title={modalTitle}
                footer={
                    <>
                        <Button icon={<HiOutlineXMark className="size-4" />} type="button" variant="outline" onClick={handleCloseModal}>Hủy</Button>
                        <Button 
                            icon={editingId ? <HiOutlineCheckCircle className="size-4" /> : <HiOutlinePlus className="size-4" />} 
                            type="button" variant="secondary" onClick={editingId ? handleUpdateMoneyAccount : handleCreateMoneyAccount}>
                            {editingId ? "Lưu thay đổi" : "Thêm mới"}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Số tài khoản</label>
                    <Input type="text" placeholder="VD: 1234567890" value={formData.accountNumber} onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })} />
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tên tài khoản</label>
                    <Input type="text" placeholder="VD: Công ty Cổ phần ABC" value={formData.bankName} onChange={(e) => setFormData({ ...formData, bankName: e.target.value })} />
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mã ngân hàng</label>
                    <Input type="text" placeholder="VD: VCB" value={formData.bankCode} onChange={(e) => setFormData({ ...formData, bankCode: e.target.value })} />
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pay2S Bank ID</label>
                    <Input type="text" placeholder="VD: VCB" value={formData.pay2sBankId} onChange={(e) => setFormData({ ...formData, pay2sBankId: e.target.value })} />
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trạng thái</label>
                    <Switch checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} />
                </div>
            </Modal>
        </div>
        ) : null}
    </AdminRoleGate>
    );
}