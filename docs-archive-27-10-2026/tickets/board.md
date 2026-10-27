# Board — Comvia Frontend

> **Snapshot mới 26/10/2026:** đã đối chiếu source `dev@18908dd`. Xem [ma trận 25 ticket và kế hoạch hiện tại](../audits/2026-10-26-repo-audit.md). Tất cả ticket có phần triển khai trong source; 024 cần QA nhánh billing null, 025 còn BR-12. Chưa nghiệm thu E2E; lint còn 4 lỗi, build bị chặn tải font. Các nhãn Done/Ready/Blocked và thứ tự thực thi dưới đây là lịch sử, không dùng làm trạng thái hiện tại. Quick Chat ngừng sử dụng.

Board chung, cập nhật liên tục. Lớp UI = làm ngay (không chờ backend). Lớp tích hợp = nối API thật, verify sau khi backend deploy (hợp đồng BR-01→11 đã chốt).

| Ticket | Issue | Tên | Phụ thuộc | Có thể song song? | Trạng thái |
|---|---|---|---|---|---|
| TICKET-001 | 005 | Toast/Alert dùng chung + ToastProvider root | — | Có | Done (chờ review) |
| TICKET-002 | 002/005 | Stat block dùng chung | — | Có | Done (chờ review) |
| TICKET-003 | 005 | Hook polling `use-topup-status.ts` | — | Có | Done (chờ review) |
| TICKET-004 | 003 | `image-upload-field.tsx` (validate 400x96) | — | Có | Done (chờ review) |
| TICKET-005 | 001/007 | Tách `workspace-form.tsx` + billing rule + canh giữa | — | Có | Done (chờ review) |
| TICKET-006 | 004 | Tách `template-form.tsx` + preview + field động | — | Có | Done (chờ review) |
| TICKET-007 | 006 | Sidebar ẩn còn 6 mục + đổi label | — | Có | Done (chờ review) |
| TICKET-008 | 007 | Nút "Sửa Workspace" + popup edit | TICKET-005 | Với 009–014 | Done (chờ review) |
| TICKET-009 | 002 | Section "Tổng quan hoạt động" (UI tĩnh) | TICKET-002 | Với 008,010–014 | Done (chờ review) |
| TICKET-010 | 005 | Popup nạp tiền 2 bước + cập nhật số dư | TICKET-001, TICKET-003 | Với 008,009 | Done (chờ review) |
| TICKET-011 | 005 | Section "Thông tin Ví" dashboard | TICKET-002, TICKET-010 | Sau 010 | Done (chờ review) |
| TICKET-012 | 003 | Popup tạo/sửa record OA (UI) | TICKET-004 | Với 008–011 | Done (chờ review) |
| TICKET-013 | 003 | Box thông tin OA + 3 trạng thái (UI, record mock) | TICKET-012 | Sau 012 | Done (chờ review) |
| TICKET-014 | 003 | Section OA dashboard (box OA + list template + popup) | TICKET-013, TICKET-006 | Sau 013,006 | Done (chờ review) |
| TICKET-015 | 001/007 | Tích hợp: billing cá nhân (BR-01) + PATCH theo status (BR-09) | TICKET-005, TICKET-008 | — | Ready — verify sau deploy |
| TICKET-016 | 002 | Tích hợp: analytics overview thật | TICKET-009 | — | Done (chờ verify sau deploy) |
| TICKET-017 | 005 | Tích hợp: số liệu ví tháng + filter/phân trang (BR-06/07) | TICKET-011 | KHÔNG với 022 (cùng `wallet-section.tsx`) | Done (chờ verify sau deploy) |
| TICKET-018 | 004 | Tích hợp: gửi field template mới + map enum | TICKET-006 | — | Done (chờ verify sau deploy) |
| TICKET-020 | 003 | Prop `size` cho `modal.tsx` + popup OA rộng | — | Có | Done (chờ review) |
| TICKET-021 | 003 | `image-upload-field`: existingUrl + validate 2MB/PNG-JPEG | TICKET-004 | Với 020 | Done (chờ review) |
| TICKET-019 | 003 | Tích hợp: CRUD OA + orchestrate upload + refactor trang OA | TICKET-012, TICKET-013, TICKET-014, TICKET-020, TICKET-021 | — | Done (chờ verify sau deploy) |
| TICKET-022 | 005 | Khôi phục cột "Trạng thái" bảng giao dịch (BR-11 đảo ngược) | TICKET-011 | KHÔNG với 017 (cùng `wallet-section.tsx`) | Done (chờ verify sau deploy) |
| TICKET-023 | 007 | Ẩn nút Sửa Workspace khi `DELETED` (BR-09 đính chính) | TICKET-008 | KHÔNG với 024 (cùng `workspaces/page.tsx`) | Done (chờ review) |
| TICKET-024 | 007/001 | Prefill billing popup Sửa Workspace (BR-10) | TICKET-008, TICKET-023 | KHÔNG với 023 (cùng `workspaces/page.tsx`) | Done (chờ verify sau deploy) |
| TICKET-025 | 008 | Field "Mô tả" popup Tạo/Sửa OA + hiển thị ở box OA | TICKET-019 | Có (chạm `oa-record-modal.tsx`, `oa-info-box.tsx`) | Done (chờ verify sau deploy) |

## Thứ tự thực thi đề xuất (ticket đang mở)

### Đợt 1 — nền tảng dùng chung (làm trước, song song được với nhau)
1. TICKET-001 (toast), TICKET-002 (stat-block), TICKET-003 (polling hook), TICKET-004 (image-upload), TICKET-005 (workspace-form), TICKET-006 (template-form) — độc lập, chia cho nhiều dev.
2. TICKET-007 (sidebar) — độc lập hoàn toàn, có thể làm bất cứ lúc nào.

### Đợt 2 — màn/feature UI (sau khi nền tảng xong, song song được)
3. TICKET-008 (sau 005) — workspace edit.
4. TICKET-009 (sau 002) — dashboard overview.
5. TICKET-010 (sau 001,003) → TICKET-011 (sau 002,010) — ví.
6. TICKET-012 (sau 004) → TICKET-013 (sau 012) → TICKET-014 (sau 013,006) — OA.

### Đợt 3 — tích hợp API thật
Backend đã trả hợp đồng (`docs/handoff/backend-responses.md`, cập nhật lần 2 ngày 2026-10-03); API guide bản backend đã đè bản FE. Backend code xong (BR-01→11) nhưng **CHƯA deploy**. Dev **code trước theo hợp đồng, verify thật sau khi backend báo deploy server live**.
7. **Ready — verify sau deploy** (hợp đồng rõ): TICKET-016 (BR-02), TICKET-018 (BR-05), TICKET-017 (BR-06/07), TICKET-015 (BR-01/09), TICKET-024 (BR-10 prefill billing), TICKET-019 (BR-03/04 OA).
8. **UI làm ngay (phát sinh từ backend cập nhật lần 2, không chờ deploy):**
   - **TICKET-022** — khôi phục cột "Trạng thái" bảng giao dịch (BR-11 đảo ngược). Cùng file `components/wallet/wallet-section.tsx` với TICKET-017 → làm TICKET-022 trước, TICKET-017 (nối data) sau deploy.
   - **TICKET-023** — ẩn nút Sửa Workspace khi `DELETED` (BR-09 đính chính). Cùng file `app/app/workspaces/page.tsx` với TICKET-024 → làm TICKET-023 trước, rồi TICKET-024.
9. **Field Mô tả OA (ISSUE-008, backend đã hỗ trợ, không build thêm):**
   - **TICKET-025** — thêm field "Mô tả" (không bắt buộc) vào popup Tạo/Sửa OA + hiển thị ở box OA. UI sửa ngay; verify end-to-end sau deploy. Chạm `components/oa/oa-record-modal.tsx` + `oa-info-box.tsx` (phụ thuộc orchestration TICKET-019 đã có).

## Ghi chú
- Ticket "làm ngay" không phụ thuộc backend; dùng mock/hardcode hoặc endpoint đã có. Type dự kiến gắn `// PROVISIONAL (BR-xx)`.
- Ticket tích hợp chỉ thay mock bằng API thật theo field/endpoint hợp đồng; không dựng lại UI.
- **Xung đột file (không chạy song song):** (a) TICKET-022 ↔ TICKET-017 cùng `components/wallet/wallet-section.tsx`; (b) TICKET-023 ↔ TICKET-024 cùng `app/app/workspaces/page.tsx`.
- Quyết định đã chốt (cập nhật 2026-10-03 theo backend lần 2): box OA ẩn dòng "Người tạo" (TICKET-013); **sửa workspace `DELETED` BỊ chặn — backend 403, FE ẩn nút (TICKET-023)** *(đảo ngược quyết định "không chặn" ngày 2026-10-02)*; MEMBER không xem billing, chỉ OWNER (TICKET-024/BR-10); **giao dịch ví CÓ `status` — giữ cột "Trạng thái" (TICKET-022)** *(đảo ngược "bỏ cột" BR-11)*.
