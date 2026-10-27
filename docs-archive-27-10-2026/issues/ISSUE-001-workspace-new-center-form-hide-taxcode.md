# ISSUE-001: Màn tạo workspace — canh giữa form + ẩn Mã số thuế khi billing type cá nhân

> **Audit 26/10/2026:** các mô tả hiện trạng/đang chờ bên dưới là snapshot lịch sử. Phần triển khai liên quan đã có trong source; xem [ma trận module/ticket và khoảng trống hiện tại](../audits/2026-10-26-repo-audit.md). Chưa đóng acceptance hoặc nghiệm thu E2E qua lượt audit này.

**Trạng thái:** Đang xử lý (PO đã duyệt CR — chờ ticket + backend sửa validate)
**Phân loại:** Change Request
**Màn hình/route liên quan:** `app/app/workspaces/new/page.tsx` (`NewWorkspacePage`) — dùng chung `components/ui/card.tsx`, `components/ui/input.tsx`, `components/ui/controls.tsx` (Radio)

## Mô tả gốc từ khách hàng/PO
> 1. Màn hình `https://app.comvia.cloud/app/workspaces/new`: đưa box có form tạo workspace mới ra giữa. Trong form nếu chọn Billing type là cá nhân thì ẩn field Mã số thuế đi.

## Rule/API hiện tại
- `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §4.1 Create workspace: ví dụ body loại `INDIVIDUAL` **vẫn gồm** `taxCode: "8561234567"`.
- `docs/MAIN_RULES.mdc` §5.2.3 "Billing info khi tạo workspace": mục **B. Cá nhân** liệt kê các field bắt buộc gồm: full_name, citizen_id, **tax_code (mã số thuế)**, address, invoice_email, phone.
- Nghĩa là theo rule hiện hành, billing cá nhân vẫn coi `tax_code` là **bắt buộc**.

## Hành vi thực tế đã verify
- Form render Card với `className="max-w-3xl"` (`new/page.tsx:131`) và không có wrapper canh giữa — box nằm sát lề trái dưới `PageHeader`.
- Field "Mã số thuế" luôn hiển thị cho cả hai billing type (`new/page.tsx:207-212`), nằm ngoài nhánh điều kiện `billingType === "ORGANIZATION" ? ... : ...`.
- Validate bắt buộc `taxCode` cho **mọi** billing type (`new/page.tsx:55`: `if (!taxCode.trim() || ...)`).
- Khi gửi body, cả nhánh ORGANIZATION và INDIVIDUAL đều đưa `taxCode` vào `billing` (`new/page.tsx:88,98`).

## Hành vi mong đợi
- Box form tạo workspace được canh giữa theo chiều ngang.
- Khi billing type = Cá nhân (`INDIVIDUAL`): ẩn field "Mã số thuế", không validate bắt buộc, không gửi `taxCode` trong body.

## Phân tích tác động
- Thuần FE, cục bộ trong `new/page.tsx`. Không đụng component dùng chung.
- **Liên đới ISSUE-007** (popup Sửa Workspace dùng lại form này): nếu quy tắc ẩn/bỏ `taxCode` cho cá nhân được chốt, logic phải áp dụng đồng nhất ở cả form tạo và form sửa — SA cần cân nhắc tách form dùng chung.
- Rủi ro backend: nếu DTO `billing` cho `INDIVIDUAL` vẫn `@IsNotEmpty()` với `taxCode`, bỏ field sẽ khiến `POST /workspaces` trả 400 (ValidationPipe). Cần backend xác nhận.

## Giả định / Câu hỏi mở
(không còn — PO đã chốt, xem mục Xử lý)

## Hướng xử lý đề xuất (đã PO duyệt)
- Bọc Card trong wrapper canh giữa (ví dụ `mx-auto`).
- Đưa field "Mã số thuế" vào riêng nhánh ORGANIZATION (chỉ hiển thị khi tổ chức); bỏ `taxCode` khỏi validate bắt buộc và body khi là cá nhân.

## Cần Backend team
- Sửa logic validate DTO billing cho `billingType = INDIVIDUAL` ở `POST /workspaces` và `PATCH /workspaces/:id`: `taxCode` **không còn bắt buộc** (chỉ bắt buộc với `ORGANIZATION`). Hiện DTO đang bắt buộc theo rule cũ. (Chi tiết: `backend-requests.md` BR-01.)

## Xử lý
- **2026-10-02 — PO duyệt CR:** Đổi rule — billing type **cá nhân** KHÔNG bắt buộc Mã số thuế; chỉ **tổ chức** mới bắt buộc. Đã cập nhật `docs/MAIN_RULES.mdc` §5.2.3.B và `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §4.1 theo rule mới (được PO chỉ đạo sửa thẳng `.mdc`).
- FE: canh giữa form + ẩn/không gửi `taxCode` khi cá nhân. Áp dụng đồng nhất cho form sửa workspace (ISSUE-007).
- Backend: BR-01 (sửa validate DTO). Chờ ticket.

## Thiết kế SA (2026-10-02)
- **Chạm cấu trúc dùng chung qua liên đới ISSUE-007:** quy tắc billing (ẩn/không gửi `taxCode` khi cá nhân) không để riêng trong `new/page.tsx` mà đặt trong component form dùng chung `components/workspace/workspace-form.tsx` (thiết kế ở ISSUE-007), để trang tạo và popup sửa áp dụng đồng nhất. Ghi tại `coding-convention.md` mục "Form workspace dùng chung".
- Canh giữa form: việc của trang chứa (wrapper `mx-auto`), không thuộc component form.
- Không cần ADR (không đổi khuôn khổ, chỉ chuẩn hóa vị trí logic billing).
- **Sẵn sàng Team Lead chẻ ticket** (gộp với ISSUE-007 phần tách form). FE không chặn; chạy thật cần backend BR-01 (nếu backend chưa sửa DTO, cá nhân bỏ `taxCode` sẽ 400).
