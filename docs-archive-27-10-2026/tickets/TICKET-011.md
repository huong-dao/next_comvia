# TICKET-011: Dashboard — section "Thông tin Ví" (số dư + tổng quan tháng + danh sách giao dịch)

**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

**Issue:** ISSUE-005
**Rule/Thiết kế liên quan:** `docs/architecture/coding-convention.md` mục "Stat block", "Interface/type dự kiến chờ backend"; `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §9.1, §9.2; Phụ lục A `WalletTransactionType`
**Độ ưu tiên:** High
**Phụ thuộc vào:** TICKET-002, TICKET-010

## Mục tiêu
Dashboard có section "Thông tin Ví" 2 box: trái = số dư + nút Nạp tiền (mở popup) + "Tổng quan tháng này"; phải = danh sách đủ 6 loại giao dịch + filter.

## Chỉ dẫn code
- **Sửa `app/app/w/[workspaceId]/dashboard/page.tsx`**: thêm section "Thông tin Ví" (dưới section tổng quan/OA).
  - **Box trái:**
    - Số dư ví từ `GET /workspaces/:id/wallet/balance` (§9.1, đã dùng ở `dashboard/page.tsx:36`). Nút "Nạp tiền" (chỉ Owner) mở popup `topup-modal.tsx` (TICKET-010); `onPaid` → refetch balance (không reload). Nút "Xem lịch sử" link `workspacePath(workspaceId, "wallet")`.
    - "Tổng quan tháng này" dùng `StatBlock` (TICKET-002): "Đã nạp tháng này", "Đã sử dụng" (tổng tiền dùng gửi tin). **BỎ "Sắp hết hạn"** (không làm). Số liệu tháng + % so với tháng trước là **dữ liệu tạm (chờ BR-06)**: mock đúng shape, khai báo type `// PROVISIONAL (BR-06)`; `GET /wallet/balance` chỉ có số lũy kế nên chưa dùng được cho "tháng này".
  - **Box phải — danh sách giao dịch:**
    - Lấy từ `GET /workspaces/:id/wallet/transactions` (§9.2, đã có). Hiển thị **đủ tất cả loại** backend trả về, bảng Mã GD/Thời gian/Loại/Số tiền/Trạng thái (tham khảo `app/app/w/[workspaceId]/wallet/page.tsx:120-135`, `components/ui/simple-table.tsx`). **(Cột "Trạng thái" theo BR-11 đảo ngược 2026-10-03 — giao dịch ví CÓ field `status`; chi tiết map nhãn ở TICKET-022.)**
    - **Map label tiếng Việt** cho đủ 6 enum `WalletTransactionType` (Phụ lục A): `TOPUP_CREDIT`, `MESSAGE_DEBIT`, `CAMPAIGN_HOLD`, `CAMPAIGN_REFUND`, `MANUAL_ADJUSTMENT`, `REVERSAL` — map hiển thị, KHÔNG đổi giá trị enum.
    - Filter **loại giao dịch**: select 6 enum + "Mọi loại" → gửi `?type=` (tham số đã có §9.2; đây là bản bật lại select hiện đang comment ở `wallet/page.tsx:104-111`).
    - Filter **ngày** (Từ ngày/Đến ngày): dựng input UI, **chưa gọi backend** (chờ BR-07) — gắn chú thích; wire thật ở TICKET-017.
  - Dùng `formatVND`/`formatDate` (`lib/utils.ts`).

## Acceptance Criteria (cấp code)
- [ ] Box trái: số dư + nút Nạp tiền mở popup; `onPaid` refetch số dư không reload; "Tổng quan tháng này" có 2 stat block, không có "Sắp hết hạn".
- [ ] Số liệu "tháng này" dùng mock gắn `// PROVISIONAL (BR-06)`.
- [ ] Box phải: danh sách giao dịch thật, label tiếng Việt đủ 6 enum, filter loại hoạt động (`?type=`).
- [ ] Input filter ngày hiện diện nhưng chưa gọi backend (ghi chú chờ BR-07).

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công — section ví hiển thị đúng, nạp tiền cập nhật số dư, filter loại chạy.)
