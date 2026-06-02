"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CampaignRowEditModal({
  open,
  placeholderKeys,
  initialPhone,
  initialPayload,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  placeholderKeys: string[];
  initialPhone: string;
  initialPayload: Record<string, string>;
  busy?: boolean;
  onClose: () => void;
  onSave: (phone: string, payload: Record<string, string>) => void;
}) {
  const [phone, setPhone] = useState(initialPhone);
  const [fields, setFields] = useState<Record<string, string>>(initialPayload);

  useEffect(() => {
    if (!open) return;
    setPhone(initialPhone);
    setFields(initialPayload);
  }, [open, initialPhone, initialPayload]);

  return (
    <Modal
      open={open}
      title="Sửa dòng dữ liệu"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={() => onSave(phone.trim(), fields)}
          >
            Lưu
          </Button>
        </>
      }
    >
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Số điện thoại</label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      {placeholderKeys.map((key) => (
        <div key={key}>
          <label className="mb-1 block text-xs text-muted-foreground">{key}</label>
          <Input
            value={fields[key] ?? ""}
            onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
          />
        </div>
      ))}
    </Modal>
  );
}
