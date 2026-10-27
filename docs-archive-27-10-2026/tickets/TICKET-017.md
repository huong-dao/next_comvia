# TICKET-017: Tích hợp — số liệu ví theo tháng (BR-06) + filter/phân trang giao dịch (BR-07)

**Issue:** ISSUE-005
**Rule/Thiết kế liên quan:** `backend-responses.md` BR-06/BR-07; `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §9.1, §9.2
**Độ ưu tiên:** Medium
**Phụ thuộc vào:** TICKET-011
**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

> **Cập nhật 2026-10-03 (BR-11 đảo ngược):** phần "gỡ cột Trạng thái" trong bản cũ của ticket này **đã huỷ** — giao dịch ví CÓ field `status`, cột "Trạng thái" được **khôi phục** ở **TICKET-022**. Ticket này chỉ còn BR-06 + BR-07.

## Mục tiêu
Thay mock "Tổng quan tháng này" bằng số liệu tháng thật (BR-06); chuyển danh sách giao dịch sang phân trang + filter server-side (BR-07).

## Chỉ dẫn code
- Hợp đồng đã chốt. Chỉ nối API thật **sau khi backend deploy server live**.
- **Sửa section "Thông tin Ví"** (component `wallet-section.tsx` / `app/app/w/[workspaceId]/dashboard/page.tsx` theo TICKET-011):
- **Lưu ý file chạm:** cùng sửa `components/wallet/wallet-section.tsx` với TICKET-022 → KHÔNG chạy song song; làm TICKET-022 (UI khôi phục cột) trước, ticket này (nối data/phân trang) sau deploy.

### BR-06 — Số liệu tháng (verify sau deploy)
- `GET /workspaces/:workspaceId/wallet/balance` nay trả thêm khối `monthly`:
  - "Đã nạp tháng này" = `monthly.toppedUp.value` (+ `monthly.toppedUp.changePercent`).
  - "Đã sử dụng tháng này" = `monthly.used.value` (+ `monthly.used.changePercent`).
  - **Đổi tên field:** `topupThisMonth/spentThisMonth` → `monthly.toppedUp/used`; `deltaPercent` → `changePercent`. `changePercent` **nullable** (tháng trước = 0) → ẩn badge khi null.
  - Nếu workspace chưa có ví → toàn bộ response `null` (và `monthly` null) → hiển thị "—", ẩn badge.
  - Đổ vào 2 `StatBlock`. Gỡ nhãn `// PROVISIONAL (BR-06)`.

### BR-07 — Phân trang + filter server-side (verify sau deploy)
- `GET /workspaces/:workspaceId/wallet/transactions` nay nhận query: `offset` (≥0, mặc định 0), `limit` (1–100, mặc định 20), `type` (1 enum), `types` (nhiều enum, gửi `?types=A&types=B`), `fromDate`/`toDate` (ISO hoặc `YYYY-MM-DD`).
- **Chuyển phân trang client-side → server-side `offset/limit`** (backend trước đây cố định 50 bản ghi, nay đã sửa). Thêm điều khiển trang (next/prev hoặc "tải thêm") dùng `offset/limit`.
- Wire filter "Từ ngày"/"Đến ngày" → `fromDate`/`toDate` (dạng trần `YYYY-MM-DD` neo 00:00:00 / 23:59:59 giờ VN); filter loại → `type` hoặc `types` (gửi `types` khi chọn nhiều — `types` ưu tiên hơn `type`).
- `fetcher` bọc `useCallback` theo `[workspaceId, offset, limit, type/types, fromDate, toDate]`.

> Lưu ý TL: BR-07 đổi cơ chế phân trang (client→server) là thay đổi lớn nhất của ticket, nhưng vẫn trong phạm vi màn ví (dùng `comviaFetch`/`useComviaQuery` sẵn có) — không chạm pattern dùng chung. Nếu phát sinh nhu cầu phân trang dùng chung nhiều màn thì mới nâng SA.

## Acceptance Criteria (cấp code)
- [ ] "Tổng quan tháng này" dùng `monthly.toppedUp/used.value` + `changePercent` (nullable → ẩn badge); ví null → "—".
- [ ] Danh sách phân trang server-side (`offset/limit`); filter ngày + loại (`fromDate/toDate`, `type`/`types`) chạy qua backend.
- [ ] Không còn type PROVISIONAL (BR-06) trong section ví.

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công sau khi backend deploy — phần BR-06/07 verify sau deploy. Cột "Trạng thái" do TICKET-022 phụ trách.)
