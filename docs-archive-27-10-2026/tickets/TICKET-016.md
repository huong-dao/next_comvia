# TICKET-016: Tích hợp — nối analytics overview thật cho dashboard (BR-02)

**Issue:** ISSUE-002
**Rule/Thiết kế liên quan:** `backend-responses.md` BR-02; `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §9A; ISSUE-002 "Thiết kế SA"
**Độ ưu tiên:** Medium
**Phụ thuộc vào:** TICKET-009
**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

## Mục tiêu
Thay mock 3 chỉ số trong section "Tổng quan hoạt động" bằng dữ liệu thật từ endpoint analytics overview theo kỳ + % so với kỳ trước.

## Chỉ dẫn code
- Hợp đồng đã chốt (BR-02, §9A). Chỉ nối API thật **sau khi backend deploy server live**.
- **Sửa section "Tổng quan hoạt động"** (component `overview-section.tsx` / `app/app/w/[workspaceId]/dashboard/page.tsx` theo TICKET-009):
  - Gọi `GET /workspaces/:workspaceId/analytics/overview?period=7d|month|year` (mặc định `7d`) qua `comviaFetch` + `useComviaQuery`, `fetcher` bọc `useCallback` theo `[workspaceId, period]`.
  - **Đổi tên field: `deltaPercent` → `changePercent`** (tên thật backend). Shape: `messagesSent { value, changePercent }`, `successRate { value, changePercent }`, `activeTemplates { value, changePercent }`.
  - **Xử lý null (quan trọng):**
    - `changePercent` có thể **null** (kỳ trước = 0/thiếu dữ liệu) → **ẩn badge delta** khi null.
    - `successRate.value` có thể **null** (không có tin nào, mẫu số 0) → hiển thị **"—"**.
    - `activeTemplates.changePercent` **luôn null** (snapshot) → block "Mẫu tin đang hoạt động" không có badge delta.
  - Map 3 block: "Tin nhắn đã gửi" (`messagesSent`), "Mẫu tin đang hoạt động" (`activeTemplates`, template APPROVED), "Tỷ lệ gửi thành công" (`successRate`, %).
  - Đổi dropdown kỳ → refetch theo `period`.
  - Gỡ type/giá trị `// PROVISIONAL (BR-02)`, đổi `deltaPercent`→`changePercent`, cho các trường nullable.
  - **GIỮ** "Khách hàng tương tác" là constant demo (backend KHÔNG tính chỉ số này).
  - Field tiền/decimal về dạng chuỗi số — parse `Number()` khi hiển thị nếu cần (lưu ý chung backend-responses).

## Acceptance Criteria (cấp code)
- [ ] 3 chỉ số lấy từ endpoint thật theo kỳ; dùng `changePercent`.
- [ ] `changePercent` null → ẩn badge; `successRate.value` null → "—"; "Mẫu tin đang hoạt động" không có badge.
- [ ] Đổi kỳ (7d/tháng/năm) refetch đúng.
- [ ] "Khách hàng tương tác" vẫn là constant demo.
- [ ] Không còn type PROVISIONAL (BR-02).

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công sau khi backend deploy server live.)
