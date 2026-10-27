# TICKET-010: Popup nạp tiền 2 bước (chọn mốc → QR) + cập nhật số dư không reload

**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

**Issue:** ISSUE-005
**Rule/Thiết kế liên quan:** `docs/architecture/coding-convention.md` mục "Toast/Alert", "Polling trạng thái"; `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §9.4, §9.5
**Độ ưu tiên:** High
**Phụ thuộc vào:** TICKET-001, TICKET-003

## Mục tiêu
Có popup nạp tiền 2 bước dùng chung: bước 1 chọn mốc tiền, bước 2 hiện QR; sau khi thanh toán xong đóng popup, số dư tự tăng (không reload), bắn toast success.

## Chỉ dẫn code
- **Tạo component popup nạp tiền** (vd `components/wallet/topup-modal.tsx`) dùng `components/ui/modal.tsx`:
  - Props gợi ý: `{ open; onClose; workspaceId; onPaid: () => void }`.
  - **Bước 1 — chọn mốc tiền (không nhập tự do):** các mốc 500.000 → 5.000.000, bước 500.000 (500k, 1tr, ... 5tr) dạng nút/radio. Hiển thị VAT 10% + tổng (tái dùng cách tính ở `app/app/w/[workspaceId]/topup/page.tsx:59-67`). Lấy danh sách tài khoản ngân hàng qua `GET /public/money-accounts/active-for-topup` (như `topup/page.tsx:75-92`), chọn mặc định đầu tiên.
  - **Tạo QR:** `POST /topups/create-with-pay2s` với header `x-workspace-id` + body `{ amountExclVat, moneyAccountId }` (như `topup/page.tsx:106-113`). Lấy `qrCodeUrl`, `topupCode`.
  - **Bước 2 — hiện QR:** render `qrCodeUrl` + mã nạp + tổng tiền (tham khảo `topup/page.tsx:204-249`). Bắt đầu polling bằng `useTopupStatusPolling(topupCode, { workspaceId, onPaid, onTimeout })` (TICKET-003):
    - `onPaid`: đóng popup, gọi `onPaid()` (nơi cha refetch balance — xem TICKET-011), `useToast().showToast({ type: "success", message: "Nạp tiền thành công" })` (TICKET-001).
    - `onTimeout`: `showToast({ type: "warning", message: ... })`.
  - Dừng polling khi popup đóng/unmount (hook tự lo khi `topupCode` null).
- **API đã có thật** (§9.4/§9.5, BR-08 xác nhận) → ticket này KHÔNG blocked; dùng endpoint thật luôn.

## Acceptance Criteria (cấp code)
- [ ] Popup 2 bước: bước 1 chọn mốc 500k–5tr (bước 500k), bước 2 hiện QR.
- [ ] Tạo QR gọi `POST /topups/create-with-pay2s` với header `x-workspace-id`.
- [ ] Khi topup `PAID`: đóng popup + toast success + gọi `onPaid` (cha refetch số dư, không reload trang).
- [ ] Timeout 5 phút → toast warning; đóng popup dừng polling.

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công — mở popup, tạo QR, mô phỏng PAID (webhook ADMIN ở `topup/page.tsx`) thấy số dư tăng + toast.)
