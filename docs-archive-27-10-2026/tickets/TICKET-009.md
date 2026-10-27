# TICKET-009: Dashboard — section "Tổng quan hoạt động" (UI tĩnh + 4 stat block + dropdown kỳ)

**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

**Issue:** ISSUE-002
**Rule/Thiết kế liên quan:** `docs/architecture/coding-convention.md` mục "Stat block", "Giá trị demo/hardcode tạm", "Interface/type dự kiến chờ backend"; ISSUE-002 "Thiết kế SA"
**Độ ưu tiên:** High
**Phụ thuộc vào:** TICKET-002

## Mục tiêu
Dashboard có section "Tổng quan hoạt động" với tiêu đề + dropdown chọn kỳ + 4 stat block, dựng bằng dữ liệu tạm (chưa gọi analytics API).

## Chỉ dẫn code
- **Sửa `app/app/w/[workspaceId]/dashboard/page.tsx`**: thay cụm 4 Card hiện tại (`dashboard/page.tsx:83-102`) bằng section mới.
  - Tiêu đề section "Tổng quan hoạt động" + dropdown kỳ (`components/ui/input.tsx` `Select`): giá trị `7d` / `month` / `year` (nhãn "7 ngày qua" / "tháng qua" / "năm qua"). State `period`.
  - 4 `StatBlock` (TICKET-002):
    1. "Tin nhắn đã gửi" — value + delta.
    2. "Khách hàng tương tác" — **hardcode constant demo**: khai báo `DEMO_PLACEHOLDER_CUSTOMER_INTERACTION` + comment `// TODO`, KHÔNG là field type API. Ghi chú rõ trong code đây là số demo, không phải số thật.
    3. "Mẫu tin đang hoạt động" — value + delta.
    4. "Tỷ lệ gửi thành công" — value (%) + delta.
  - **Dữ liệu tạm (chờ BR-02):** khai báo type dự kiến gắn `// PROVISIONAL (BR-02)` theo spec SA ở ISSUE-002 ("Thiết kế SA"): `OverviewMetric { value; deltaPercent }`, `OverviewResponse { messagesSent; activeTemplates; successRate }`. Giai đoạn này dùng mock cục bộ (hằng số) đúng shape type đó cho 3 chỉ số backend; "khách hàng tương tác" từ constant demo riêng. Chưa gọi `GET /analytics/overview`.
  - Giữ hàng nút hành động hiện có (`dashboard/page.tsx:104-119`) và PageHeader. (Section ví/OA ở ticket khác.)

## Acceptance Criteria (cấp code)
- [ ] Section hiện tiêu đề "Tổng quan hoạt động" + dropdown 3 kỳ.
- [ ] 4 stat block render qua `StatBlock` với delta (mũi tên + màu).
- [ ] "Khách hàng tương tác" dùng constant demo đặt tên rõ + comment, không nằm trong type response analytics.
- [ ] Type dự kiến 3 chỉ số gắn `// PROVISIONAL (BR-02)`; chưa gọi API thật.

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công — section hiển thị đúng 4 block + đổi kỳ không lỗi.)
