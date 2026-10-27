# TICKET-007: Sidebar — ẩn còn 6 mục + đổi label "Chiến dịch Zalo" → "Chiến dịch"

**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

**Issue:** ISSUE-006
**Rule/Thiết kế liên quan:** ISSUE-006 (thuần FE, SA xác nhận không chạm khuôn khổ)
**Độ ưu tiên:** Medium
**Phụ thuộc vào:** —

## Mục tiêu
Sidebar workspace chỉ còn 6 mục; "Chiến dịch Zalo" đổi nhãn thành "Chiến dịch".

## Chỉ dẫn code
- **Sửa `components/layout/workspace-sidebar.tsx`**, mảng `navItems` (`workspace-sidebar.tsx:37-106`):
  - **Comment lại** 3 mục (giữ nguyên code, theo pattern comment như "Thống kê"/"Cài đặt" đã có ở file): "Zalo OA" (`:50-55`), "Mẫu tin nhắn" (`:62-67`), "Ví tiền" (`:86-92`).
  - **Đổi label** mục Chiến dịch (`:69`): `label: "Chiến dịch Zalo"` → `label: "Chiến dịch"`. GIỮ NGUYÊN `href` (`campaigns`), `icon`, `isActive`.
  - Giữ 6 mục hiển thị: Tổng quan, Gửi tin, Chiến dịch, Thành viên, Lịch sử hoạt động, API Keys.
- KHÔNG xóa route/trang `/oa`, `/templates`, `/wallet` — chỉ ẩn khỏi sidebar (các màn dashboard ISSUE-003/005 vẫn cung cấp lối vào).

## Acceptance Criteria (cấp code)
- [ ] Sidebar hiển thị đúng 6 mục theo thứ tự trên.
- [ ] Mục Chiến dịch hiện nhãn "Chiến dịch", route vẫn tới `campaigns`.
- [ ] 3 mục ẩn được comment (không xóa), trang tương ứng vẫn truy cập qua URL.

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công — xem sidebar đúng 6 mục, nhãn Chiến dịch đúng, điều hướng không hỏng.)
