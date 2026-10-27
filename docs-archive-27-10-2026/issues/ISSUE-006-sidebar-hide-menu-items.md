# ISSUE-006: Sidebar — ẩn bớt menu, chỉ giữ 6 mục

> **Audit 26/10/2026:** các mô tả hiện trạng/đang chờ bên dưới là snapshot lịch sử. Phần triển khai liên quan đã có trong source; xem [ma trận module/ticket và khoảng trống hiện tại](../audits/2026-10-26-repo-audit.md). Chưa đóng acceptance hoặc nghiệm thu E2E qua lượt audit này.

**Trạng thái:** Đang xử lý (PO đã duyệt CR — đủ rõ, chuyển thẳng Team Lead/Dev, không cần SA)
**Phân loại:** Change Request (thuần FE)
**Màn hình/route liên quan:** `components/layout/workspace-sidebar.tsx` (`navItems`)

## Mô tả gốc từ khách hàng/PO
> 3. Sidebar menu bên trái: tinh chỉnh lại chỉ còn hiển thị: Tổng quan, Gửi tin, Chiến dịch, Thành viên, Lịch sử hoạt động, API Keys. Các menu khác ẩn đi (comment lại trong code để không hiển thị — các trang ứng với menu bị ẩn cứ để yên, không xóa).

## Rule/API hiện tại
- Không có rule nghiệp vụ quy định danh sách menu sidebar trong `MAIN_RULES.mdc`. Đây là quyết định UI.

## Hành vi thực tế đã verify
- `navItems` hiện render các mục (`workspace-sidebar.tsx:37-106`): Tổng quan, Gửi tin, **Zalo OA**, Mẫu tin nhắn, Chiến dịch Zalo, Thành viên, Lịch sử hoạt động, **Ví tiền**, API Keys. (Thống kê và Cài đặt đã bị comment sẵn.)
- So với 6 mục PO muốn giữ (Tổng quan, Gửi tin, Chiến dịch, Thành viên, Lịch sử hoạt động, API Keys) thì cần **ẩn thêm**: "Zalo OA", "Mẫu tin nhắn", "Ví tiền".

## Hành vi mong đợi
- Sidebar chỉ hiển thị 6 mục: Tổng quan, Gửi tin, **Chiến dịch**, Thành viên, Lịch sử hoạt động, API Keys.
- **Đổi label** mục "Chiến dịch Zalo" → **"Chiến dịch"** (PO chốt — chỉ đổi text hiển thị, giữ nguyên route `campaigns`/icon/logic).
- Các mục còn lại (Zalo OA, Mẫu tin nhắn, Ví tiền) được comment lại trong code; route/trang tương ứng giữ nguyên, không xóa.

## Phân tích tác động
- Thuần FE, cục bộ trong `workspace-sidebar.tsx`.
- Lưu ý: ẩn mục "Mẫu tin nhắn", "Ví tiền", "Zalo OA" khỏi sidebar nhưng các màn dashboard mới (ISSUE-003/005) lại cung cấp lối vào Tạo OA / Tạo mẫu tin / Nạp tiền ngay trên dashboard — hợp lý, không mâu thuẫn. Các trang `/templates`, `/wallet`, `/oa`, `/topup` vẫn truy cập được qua URL/nút trên dashboard.

## Giả định / Câu hỏi mở
(không còn — PO xác nhận "Chiến dịch" = mục "Chiến dịch Zalo" `campaigns` hiện có, chỉ đổi label)

## Hướng xử lý đề xuất (đã PO duyệt)
- Comment 3 mục "Zalo OA", "Mẫu tin nhắn", "Ví tiền" trong mảng `navItems` (giữ pattern comment như các mục "Thống kê"/"Cài đặt" đã có).
- Đổi `label: "Chiến dịch Zalo"` → `label: "Chiến dịch"` (`workspace-sidebar.tsx:69`), không đổi `href`/`icon`/`isActive`.

## Cần Backend team
(không có — thuần FE)

## Xử lý
- **2026-10-02 — PO duyệt CR:** giữ 6 mục (Tổng quan, Gửi tin, Chiến dịch, Thành viên, Lịch sử hoạt động, API Keys); ẩn Zalo OA/Mẫu tin nhắn/Ví tiền (comment); đổi label "Chiến dịch Zalo" → "Chiến dịch".
- Đủ rõ, thuần FE cục bộ — chuyển thẳng Team Lead/Dev, không cần SA.

## Thiết kế SA (2026-10-02)
- SA đã xác nhận: thuần cục bộ `components/layout/workspace-sidebar.tsx`, **không chạm khuôn khổ dùng chung, không ADR, không cập nhật coding-convention.** Trả thẳng Team Lead/Dev chẻ ticket (mục đã có trong `open-items.md`).
