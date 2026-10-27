# TICKET-002: Component stat block dùng chung

**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

**Issue:** ISSUE-002 (dùng lại ISSUE-005)
**Rule/Thiết kế liên quan:** `docs/architecture/coding-convention.md` mục "Stat block — `components/app/stat-block.tsx`"
**Độ ưu tiên:** High
**Phụ thuộc vào:** —

## Mục tiêu
Có component hiển thị một ô chỉ số (icon + value + label + delta optional) dùng chung cho dashboard overview (ISSUE-002) và cụm "Tổng quan tháng này" của ví (ISSUE-005).

## Chỉ dẫn code
- **Tạo `components/app/stat-block.tsx`** (Client Component hoặc thuần presentational):
  - Props: `{ icon?: ReactNode; value: ReactNode; label: string; delta?: { percent: number; direction: "up" | "down" } }` (đúng spec SA).
  - Khi có `delta`: hiện mũi tên + `percent` với màu theo `direction` — xanh (success) khi `up`, đỏ (danger) khi `down`. Dùng icon mũi tên từ `react-icons/hi2`.
  - `delta` optional — không truyền thì không render cụm so sánh.
  - Style Tailwind, bọc trong `Card` (`components/ui/card.tsx`) hoặc để trang chứa quyết định wrapper; theo mẫu card hiện có ở `app/app/w/[workspaceId]/dashboard/page.tsx` (số lớn `text-3xl font-semibold tabular-nums`, label `text-sm text-muted-foreground`). Gộp class điều kiện qua `cn()`.
  - Format số/tiền qua `lib/utils.ts` (`formatVND`) do trang truyền vào `value` — component không tự format, nhận `value: ReactNode`.

## Acceptance Criteria (cấp code)
- [ ] `components/app/stat-block.tsx` export component với đúng props trên.
- [ ] Render icon + value + label; khi có `delta` hiện % + mũi tên màu đúng chiều.
- [ ] Dùng được không cần `delta` (không crash, không hiện cụm so sánh).

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công — render thử stat block có/không delta.)
