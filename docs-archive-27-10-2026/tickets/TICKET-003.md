# TICKET-003: Hook polling trạng thái topup `lib/use-topup-status.ts`

**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

**Issue:** ISSUE-005
**Rule/Thiết kế liên quan:** `docs/architecture/coding-convention.md` mục "Polling trạng thái"; `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §9.5; `backend-requests.md` BR-08 (xác nhận endpoint đã có)
**Độ ưu tiên:** High
**Phụ thuộc vào:** —

## Mục tiêu
Có hook chuyên dụng poll `GET /topups/:topupCode/status` tới khi `PAID` để cập nhật số dư ví không reload trang.

## Chỉ dẫn code
- **Tạo `lib/use-topup-status.ts`** (đặt cạnh `lib/use-comvia-query.ts`):
  - Signature: `useTopupStatusPolling(topupCode: string | null, { workspaceId, onPaid, onFailed?, onTimeout? })`. — *`onFailed?` thêm bởi: Dev theo PO duyệt*
  - Dùng `comviaFetch` (`lib/comviaFetch.ts`) gọi `GET /topups/${topupCode}/status` với header `x-workspace-id: workspaceId` (theo §9.5 và pattern header ở `app/app/w/[workspaceId]/topup/page.tsx:109-111`). Token qua `getAccessToken()` (`lib/auth.ts`).
  - Interval **3s** (`setInterval`). Chỉ chạy khi `topupCode` khác null.
  - Dừng polling + gọi `onPaid()` khi `status === "PAID"`.
  - Dừng polling + gọi `onFailed?.(status)` khi `status` là `FAILED`/`EXPIRED` (trạng thái thất bại dứt điểm, §9.5). — *thêm bởi: Dev theo PO duyệt*
  - Timeout **5 phút** → dừng + gọi `onTimeout?.()`.
  - Dừng/cleanup khi `topupCode` về null hoặc component unmount (clear interval + timeout).
- KHÔNG tạo `usePoll` generic (chỉ một nơi dùng — quyết định SA). KHÔNG WebSocket.
- Việc bắn toast success/warning và refetch balance do nơi gọi hook xử lý qua `onPaid`/`onTimeout` (xem TICKET-010), không nhét vào hook.

## Acceptance Criteria (cấp code)
- [ ] `lib/use-topup-status.ts` export `useTopupStatusPolling`.
- [ ] Poll mỗi 3s khi có `topupCode`; dừng và gọi `onPaid` khi status `PAID`.
- [ ] Dừng và gọi `onTimeout` sau 5 phút.
- [ ] Clear interval/timeout khi unmount hoặc `topupCode` null (không rò rỉ timer).

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công cùng TICKET-010 khi có luồng QR thật.)
