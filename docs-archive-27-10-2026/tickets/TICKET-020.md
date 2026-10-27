# TICKET-020: Thêm prop `size` cho `components/ui/modal.tsx` + dùng size rộng cho popup Tạo OA

**Issue:** ISSUE-003
**Rule/Thiết kế liên quan:** `docs/architecture/coding-convention.md` mục "Modal dùng chung"; ADR-001 (Hệ quả); open-items (SA chốt 2026-10-02, PO ủy quyền)
**Độ ưu tiên:** Medium
**Phụ thuộc vào:** —
**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

## Mục tiêu
`components/ui/modal.tsx` nhận prop `size` để popup rộng hơn khi cần (layout 2 cột hình 3), giữ nguyên hành vi mặc định cho mọi nơi đang dùng.

## Chỉ dẫn code
- **Sửa `components/ui/modal.tsx`** (file UI dùng chung — SA đã duyệt mở rộng):
  - Thêm prop `size?: "md" | "lg" | "xl"` (mặc định `"md"`).
  - Map width: `md` = `max-w-2xl` (GIỮ nguyên hành vi cũ), `lg`/`xl` = lớp `max-w-*` rộng hơn (vd `max-w-4xl` / `max-w-6xl`). Thay chỗ hardcode `max-w-2xl` hiện tại bằng map theo `size` qua `cn()`.
  - Mọi nơi gọi `Modal` không truyền `size` → không đổi (vẫn `md`).
- **Dùng size rộng cho popup Tạo OA** `components/oa/oa-record-modal.tsx` (TICKET-012) để khớp layout 2 cột hình 3.

## Acceptance Criteria (cấp code)
- [ ] `Modal` nhận `size` (`md` mặc định = `max-w-2xl` như cũ).
- [ ] `size="lg"`/`"xl"` render rộng hơn.
- [ ] Các popup hiện có (không truyền `size`) không đổi kích thước.
- [ ] Popup Tạo OA dùng size rộng, layout 2 cột không bị dồn hẹp.

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công — mở popup Tạo OA + một popup cũ bất kỳ, kiểm kích thước đúng.)
