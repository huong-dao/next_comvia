# Comvia — tài liệu frontend

## Đọc hiện trạng trước khi làm tiếp

- [Audit repo 26/10/2026](./audits/2026-10-26-repo-audit.md): 14 module, 25 ticket, phần thiếu, lỗi, sai khác tài liệu và kế hoạch ưu tiên.
- [Baseline FE hiện tại](./audits/2026-10-26-frontend-baseline.md): routing/quyền, template revision/CTA, security, giới hạn hiện tại.
- [Kiểm kê 69 page routes](./audits/2026-10-26-route-inventory.md): route thật, redirect và component/API liên quan.

**Quick Chat đã ngừng sử dụng** theo quyết định người dùng ngày 26/10/2026. Các mục Quick Chat trong tài liệu cũ chỉ còn giá trị lịch sử; phần code còn sót là backlog dọn dẹp.

## Tài liệu contract tham khảo

| File | Phạm vi |
|---|---|
| [MAIN_RULES.mdc](./MAIN_RULES.mdc) | Yêu cầu nghiệp vụ toàn hệ thống; bao gồm cả phần backend và chức năng chưa có FE |
| [FRONTEND_API_GUIDE_NEXTJS.mdc](./FRONTEND_API_GUIDE_NEXTJS.mdc) | API tenant/workspace |
| [FRONTEND_ADMIN_ROUTER_API_MAP.mdc](./FRONTEND_ADMIN_ROUTER_API_MAP.mdc) | API quản trị |
| [Board](./tickets/board.md) | Tiến độ ticket lịch sử, kèm mốc audit mới |

Baseline mô tả **code FE quan sát được**, không tự thay đổi API/backend contract. Những mâu thuẫn state machine, CTA pricing, quyền và BR-12 cần xác nhận trong backlog audit. Không dùng việc code chưa có để xóa một yêu cầu đã được duyệt.

## Chạy local và kiểm tra

- `npm run dev`: http://localhost:3002; `npm run start` cũng dùng port 3002.
- `NEXT_PUBLIC_API_BASE_URL` phải gồm prefix `/api/v1` theo API guide; ví dụ `http://localhost:3000/api/v1`. Không lưu credential thật vào tài liệu.
- `npm run lint`, `npx tsc --noEmit --incremental false`, `npm run build`.
- Kết quả 26/10: typecheck pass; lint 4 errors/29 warnings; build không tải được Inter/JetBrains Mono. Chưa chạy E2E/live.

## Quy ước trạng thái và lưu trữ

Phân biệt **có code**, **đã QA**, **đã verify live**, **còn thiếu**, **ngừng sử dụng**. “Done” trong board cũ không chứng minh production đã hoạt động. Các mốc “chưa deploy” từ 02–05/10 là lịch sử, chưa được kiểm chứng lại.

`docs/` bị ignore bởi `.gitignore`; tài liệu này là local và không tự đi cùng commit/push code. File `.mdc` giữ nguyên nguồn đồng bộ; cập nhật hiện trạng mới được ghi ở baseline/audit.
