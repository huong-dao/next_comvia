# TICKET-001: Component Toast/Alert nổi dùng chung + ToastProvider ở root layout

**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

**Issue:** ISSUE-005
**Rule/Thiết kế liên quan:** `docs/architecture/coding-convention.md` mục "Toast / Alert nổi — `components/ui/toast.tsx`"
**Độ ưu tiên:** High
**Phụ thuộc vào:** —

## Mục tiêu
Có component toast nổi dùng chung toàn app: mọi màn gọi `useToast().showToast(...)` để hiện thông báo nổi góc trên-phải, auto-dismiss.

## Chỉ dẫn code
- **Tạo `components/ui/toast.tsx`** (Client Component):
  - `ToastProvider({ children })`: React Context giữ mảng toast `{ id, type, message, duration }`. Render `children` + một viewport qua `createPortal` (từ `react-dom`) gắn vào `document.body`, vị trí cố định `fixed top-4 right-4 z-50`, xếp dọc.
  - Hook `useToast()` trả `{ showToast }`; `showToast({ type, message, duration? })` với `type: "success" | "error" | "warning" | "info"`. Auto-dismiss mặc định ~4000ms (dùng `setTimeout`, clear khi unmount/đóng tay). Cho nút đóng tay mỗi toast.
  - Mỗi loại toast có màu/icon riêng (dùng `react-icons/hi2`, gộp class qua `cn()` — `lib/cn.ts`).
  - Vì portal dùng `document`, guard client: chỉ render portal sau khi mounted (tránh lỗi SSR).
- **Sửa `app/layout.tsx`** (Server Component): bọc `{children}` bằng `<ToastProvider>` trong `<body>` (sau `<Script>`). Root layout render được Client Component con — không cần đổi layout thành client.
- Không dùng thư viện toast ngoài (quyết định SA).

## Acceptance Criteria (cấp code)
- [ ] `components/ui/toast.tsx` export `ToastProvider` + `useToast`.
- [ ] `useToast().showToast({ type: "success", message })` hiện toast góc trên-phải ở bất kỳ route nào (app/admin/staff/auth).
- [ ] Toast tự biến mất sau ~4s và đóng được bằng tay.
- [ ] 4 type success/error/warning/info có màu phân biệt.
- [ ] Gọi `useToast()` ngoài `ToastProvider` không crash app (throw lỗi rõ ràng hoặc no-op có cảnh báo).

## Definition of Done
(Theo `docs/tickets/conventions.md`: `npm run build` + `npm run lint` xanh; verify thủ công trên trình duyệt — bắn thử 4 loại toast từ một màn bất kỳ.)
