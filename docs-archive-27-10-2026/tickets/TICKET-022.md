# TICKET-022: Khôi phục cột "Trạng thái" bảng giao dịch ví (BR-11 đảo ngược)

**Issue:** ISSUE-005
**Rule/Thiết kế liên quan:** `backend-responses.md` BR-11 (cập nhật 2026-10-03); `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §9.2; Phụ lục A
**Độ ưu tiên:** Medium
**Phụ thuộc vào:** TICKET-011
**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

## Mục tiêu
Bảng giao dịch ví hiển thị lại cột "Trạng thái" theo field `status` thật (SUCCESS/PENDING/FAILED → Thành công/Đang xử lý/Thất bại).

## Bối cảnh
BR-11 **đảo ngược**: kết luận cũ "giao dịch ví không có trạng thái → bỏ cột" đã bị PO bác. Giao dịch ví **CÓ** field `status`. TICKET-017 (bản cũ) đã yêu cầu gỡ cột — nay **khôi phục**. Ticket này ghi đè phần "gỡ cột" của TICKET-017.

## Chỉ dẫn code
- **Sửa `components/wallet/wallet-section.tsx`** (component danh sách giao dịch, từ TICKET-011/017):
  - Thêm lại field `status?: string` vào type `TxRow`.
  - Render lại cột "Trạng thái" trong bảng giao dịch. Map enum `status` → nhãn tiếng Việt: `SUCCESS` = "Thành công", `PENDING` = "Đang xử lý", `FAILED` = "Thất bại". Dùng `components/ui/entity-status-badge.tsx` (`EntityStatusBadge`) nếu phủ được 3 giá trị, hoặc badge màu theo pattern sẵn có (xanh/vàng/đỏ) — KHÔNG tự tạo pattern badge mới.
  - Map nhãn: không đổi giá trị enum, chỉ đổi text hiển thị.
  - **Thêm filter theo `status`** (nếu hợp lý cùng filter loại/ngày hiện có): select `status=SUCCESS|PENDING|FAILED` + "Mọi trạng thái" → gửi query `?status=` (dùng chung với `type`/`types`/`fromDate`/`toDate`/`offset`/`limit`; sai giá trị → backend 400).
  - Lưu ý: hiện dữ liệu backend 100% `SUCCESS` (`PENDING`/`FAILED` là giá trị dành sẵn) — UI vẫn map đủ 3 nhãn.
- **Sửa ghi chú lỗi thời "BR-11 bỏ cột"** không còn hiệu lực: đã xử lý trong TICKET-017 (gỡ phần gỡ cột) + board. (ISSUE-005/TICKET-011 do BA đã annotate reversal.)

## Acceptance Criteria (cấp code)
- [ ] `TxRow` có lại field `status`; bảng giao dịch có cột "Trạng thái".
- [ ] 3 enum map đúng nhãn Thành công/Đang xử lý/Thất bại qua badge theo pattern sẵn có.
- [ ] (Nếu làm) filter `status` gửi `?status=` đúng, dùng chung filter hiện có.
- [ ] Không bịa enum ngoài 3 giá trị hợp đồng.

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công — cột Trạng thái hiển thị + filter chạy; data `status` thật verify sau khi backend deploy.)
