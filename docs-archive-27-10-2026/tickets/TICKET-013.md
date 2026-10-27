# TICKET-013: Box thông tin OA + logic nút 3 trạng thái (UI, record mock)

**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

**Issue:** ISSUE-003
**Rule/Thiết kế liên quan:** ADR-001 (3 trạng thái UI); `docs/architecture/coding-convention.md` mục "Khối OA trên dashboard + popup tạo/sửa OA"; `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §6.3
**Độ ưu tiên:** Medium
**Phụ thuộc vào:** TICKET-012

## Mục tiêu
Có `oa-info-box.tsx` hiển thị thông tin OA + nút theo đúng 3 trạng thái của ADR-001, dùng record tạm (mock) và trạng thái kết nối thật từ `GET /oa/status`.

## Chỉ dẫn code
- **Tạo `components/oa/oa-info-box.tsx`** (Client Component):
  - Mô hình 2 trục (ADR-001): `record` (OA Comvia — tạm mock, chờ BR-03/04) × `connection` (trạng thái Zalo thật). Trạng thái kết nối lấy từ `GET /workspaces/:id/oa/status` (§6.3, đã có — tái dùng fetcher như `app/app/w/[workspaceId]/oa/page.tsx:52-55`).
  - **3 trạng thái UI** (ADR-001):
    1. Chưa có record → nút "Tạo OA" (mở `oa-record-modal.tsx` mode create, TICKET-012).
    2. Có record, chưa/lỗi kết nối → hiện info nhập tay + nút "Sửa" (mở modal edit) + "Kết nối"/"Kết nối lại" (chạy OAuth hiện có: `POST /oa/connect` → redirect `authorizationUrl`, như `oa/page.tsx:83-104`). Ẩn hẳn "Tạo OA".
    3. Có record, đã kết nối (`CONNECTED`) → info + trạng thái "Đang kết nối" + "Sửa" + "Ngắt kết nối" (`POST /oa/disconnect`).
  - Box info: **bỏ "Danh mục"**; Trạng thái chỉ "đang kết nối" (`CONNECTED`) / "chưa kết nối" (còn lại). Hiển thị name/code/avatar/logo từ record.
  - **"Người tạo" — ẨN DÒNG (PO ủy quyền chốt 2026-10-02):** `GET /oa` chỉ trả `createdByUserId` (không có tên). KHÔNG hiển thị dòng "Người tạo" trong box (không gọi thêm API map tên). Giải quyết CÂU HỎI MỞ "Người tạo" ở open-items.
  - **Dữ liệu tạm (chờ BR-03/04):** `record` dùng mock cục bộ (giai đoạn này giả lập "chưa có record" + cập nhật tại chỗ khi `onSaved` từ modal). Type `OaRecord`/`OaConnection` gắn `// PROVISIONAL (BR-03/04)` theo ADR-001. Đọc record thật + CRUD ở TICKET-019.
  - Nút "Kết nối"/"Ngắt" dùng OAuth thật (đã có) — phần này không mock.

## Acceptance Criteria (cấp code)
- [ ] `components/oa/oa-info-box.tsx` render đúng 3 trạng thái với bộ nút tương ứng (ADR-001).
- [ ] Bỏ "Danh mục"; trạng thái chỉ 2 nhãn đang/chưa kết nối.
- [ ] "Tạo OA" chỉ hiện khi chưa có record; có record thì ẩn, hiện "Sửa".
- [ ] Record dùng mock gắn `// PROVISIONAL (BR-03/04)`; connection dùng `GET /oa/status` thật; connect/disconnect dùng OAuth thật.

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công — giả lập 3 trạng thái record, kiểm bộ nút đúng.)
