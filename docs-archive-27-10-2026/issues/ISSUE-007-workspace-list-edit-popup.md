# ISSUE-007: Danh sách workspace — nút "Sửa Workspace" mở popup edit (Owner luôn sửa được)

> **Audit 26/10/2026:** các mô tả hiện trạng/đang chờ bên dưới là snapshot lịch sử. Phần triển khai liên quan đã có trong source; xem [ma trận module/ticket và khoảng trống hiện tại](../audits/2026-10-26-repo-audit.md). Chưa đóng acceptance hoặc nghiệm thu E2E qua lượt audit này.

**Trạng thái:** Đang xử lý (PO duyệt CR + xác nhận chỉ Owner thấy nút — chờ backend confirm BR-09, SA thiết kế form dùng chung)
**Phân loại:** Change Request
**Màn hình/route liên quan:** `app/app/workspaces/page.tsx` (`WorkspacesListPage`); tái dùng form từ `app/app/workspaces/new/page.tsx`; `components/ui/modal.tsx`

## Mô tả gốc từ khách hàng/PO
> 4. Màn hình `https://app.comvia.cloud/app/workspaces`: mỗi item workspace cần có nút "Sửa Workspace". Bấm vào mở popup có form tham khảo y hệt `https://app.comvia.cloud/app/workspaces/new`. Mục đích: user có thể sửa thông tin workspace bất kỳ (không giới hạn theo trạng thái active hay không, không giới hạn gì khác), miễn user đó là Owner của workspace thì luôn sửa được.

## Rule/API hiện tại
- `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §4.4 Update workspace: `PATCH /workspaces/:workspaceId`, Auth/Role **OWNER** (kiểm bằng `ownerUserId`, không qua `WorkspaceRolesGuard`). Mọi field optional. Ghi audit `workspace.updated` / `billing_info.updated`. **Không** nêu ràng buộc theo `WorkspaceStatus`.
- §4.2 List: mỗi item có `role` ("OWNER"/"MEMBER") và `status`.
- `WorkspaceStatus` (Phụ lục A): `ACTIVE`, `DISABLED`, `SUSPENDED`, `DELETED`.

## Hành vi thực tế đã verify
- Màn danh sách workspace (`workspaces/page.tsx`) render mỗi workspace thành Card với: tên, slug, badge status, role, nút "Vào workspace" / "Đang trong workspace" (`workspaces/page.tsx:102-135`).
- **Không** có nút "Sửa Workspace" nào. Không có popup edit.
- Không tồn tại màn/route sửa workspace riêng; chỉ có `workspaces/new` (tạo).

## Hành vi mong đợi
- Mỗi item workspace có nút "Sửa Workspace" (hiển thị khi `role === "OWNER"`).
- Bấm mở popup chứa form giống `workspaces/new`, prefill dữ liệu hiện tại, submit gọi `PATCH /workspaces/:workspaceId`.
- Không giới hạn theo trạng thái workspace — chỉ cần là Owner là sửa được.

## Phân tích tác động
- Form tạo workspace (`new/page.tsx`) và form sửa nên **dùng chung một component** để tránh lệch logic (đặc biệt quy tắc ẩn Mã số thuế cho cá nhân ở ISSUE-001). SA cần quyết định tách form dùng chung. Đây là điểm đáng lưu ý nhất về cấu trúc.
- Popup dùng `components/ui/modal.tsx` (đã có).
- Màn danh sách `workspaces/page.tsx` cần refetch sau khi sửa thành công (đã có `refetch` + `notifyWorkspacesListChanged`).

## Giả định / Câu hỏi mở
- PO chốt (2026-10-02): nút "Sửa Workspace" **chỉ hiện với item mà `role === "OWNER"`** (Member không thấy nút).
- `CÂU HỎI MỞ (cho backend, không phải PO):` `PATCH /workspaces/:id` có bị chặn theo `WorkspaceStatus` (`SUSPENDED`/`DISABLED`) không? API guide §4.4 không nêu chặn, nhưng PO không tự trả lời được phần này — cần backend xác nhận code thật (BR-09).
- Liên quan ISSUE-001: billing cá nhân bỏ `taxCode` (đã PO duyệt) — form sửa áp dụng đồng nhất.

## Hướng xử lý đề xuất (đã PO duyệt)
- Tách form workspace thành component dùng chung cho create (`new`) và edit (popup) — gồm quy tắc ẩn `taxCode` cho cá nhân (ISSUE-001).
- Thêm nút "Sửa Workspace" vào Card chỉ khi `role === "OWNER"`; popup gọi `PATCH /workspaces/:id`.

## Cần Backend team
- **Xác nhận hành vi** `PATCH /workspaces/:workspaceId`: Owner có sửa được workspace ở **mọi** trạng thái (`ACTIVE`, `DISABLED`, `SUSPENDED`) không? API guide §4.4 không nêu chặn theo status, nhưng cần backend xác nhận code thực tế không chặn — vì PO yêu cầu "không giới hạn trạng thái". (BR-09)
- (Liên quan ISSUE-001) Xác nhận DTO billing `INDIVIDUAL` khi `PATCH` có bắt buộc `taxCode` không. (BR-01)
- **BR-10 — endpoint chi tiết workspace kèm billing:** cần `GET /workspaces/:workspaceId` trả billing profile đầy đủ để popup sửa prefill. Hiện API guide §4 không có endpoint detail (§4.2 list chỉ trả `id/name/slug/status/role`; §4.3 là switch) → popup edit không có nguồn prefill billing.

## Xử lý
- **2026-10-02 — PO duyệt CR + xác nhận:** nút "Sửa Workspace" chỉ hiện với Owner (`role === "OWNER"`); popup form giống `workspaces/new`, gọi `PATCH /workspaces/:id`.
- Nghiệp vụ FE đủ rõ. Phụ thuộc: backend xác nhận PATCH không chặn theo status (BR-09 — PO không tự quyết được); SA thiết kế form workspace dùng chung create+edit.
- **2026-10-02 — PO duyệt yêu cầu backend BR-10 (phát sinh từ TICKET-008):** popup sửa không prefill được billing vì thiếu endpoint chi tiết workspace. PO quyết định: **trong lúc chờ BR-10**, form sửa **nới validate billing** — bỏ trống = giữ giá trị cũ, chỉ gửi field có nhập trong `PATCH` (mọi field billing optional ở mode edit). **Khi BR-10 xong** thì popup prefill billing thật từ `GET /workspaces/:id`. Việc nới validate ở `mode="edit"` của `workspace-form.tsx` do Team Lead/Dev thực hiện trong TICKET-008/015 (đã làm — xem `workspace-form.tsx:86-158`).
- **2026-10-02 — Backend phản hồi BR-01/09/10:**
  - **BR-01 (taxCode cá nhân optional) + BR-09 (PATCH không chặn status):** code xong/xác nhận, **khớp** FE `workspace-form.tsx`. Chờ deploy. (Lưu ý: ví dụ INDIVIDUAL trong API guide §4.1 bản backend vẫn in kèm `taxCode` — chỉ là field optional được điền sẵn, không mâu thuẫn; `MAIN_RULES.mdc` §5.2.3.B đã ghi cá nhân không bắt buộc.)
  - **BR-10 (GET workspace detail): CHƯA làm** (~0.5 ngày) → popup Sửa Workspace **vẫn chưa prefill được billing**, giữ cơ chế nới validate tạm. TICKET-015 phần prefill billing vẫn **Blocked chờ BR-10 + deploy**.
  - **BR-09 — workspace `DELETED`:** backend hiện không chặn; PO chưa chốt có nên chặn → FE tạm không phụ thuộc hành vi với `DELETED`.
- **2026-10-02 — PO chốt phân quyền billing (BR-10):** **chỉ OWNER được xem billing đầy đủ; MEMBER KHÔNG được xem billing.** Khớp thiết kế (nút Sửa chỉ hiện với Owner). PO báo backend code `GET /workspaces/:id` theo hướng này.
- **2026-10-03 — Backend đính chính BR-09 + hoàn tất BR-10 (chờ deploy):**
  - **BR-09 ĐÍNH CHÍNH:** hành vi HTTP thật — workspace `DELETED` → **403** "Workspace is not active (DELETED)" ở cả PATCH và GET detail; `ACTIVE`/`DISABLED`/`SUSPENDED` → 200 (qua `@AllowWorkspaceStatuses`). **Ngược với ghi chú trước** ("DELETED không chặn"). → **FE phải ẩn/khoá nút "Sửa Workspace" khi `ws.status === "DELETED"`** — hiện `workspaces/page.tsx:137` hiện nút cho mọi workspace Owner, không guard status. **Cần ticket mới** (Team Lead/Dev). Lưu ý: trước khi deploy bản này, PATCH/GET trên `DISABLED`/`SUSPENDED` vẫn 403.
  - **BR-10 ĐÃ XONG (chờ deploy):** `GET /workspaces/:workspaceId` → `{id,name,slug,status,role,billingProfile|null}`, **chỉ Owner** (Member/ngoài → 403). → **TICKET-015 phần B (prefill billing) MỞ KHOÁ sau deploy**: popup Sửa gọi GET detail, đổ `billingProfile` vào `WorkspaceForm`; xử lý `billingProfile = null`.

## Thiết kế SA (2026-10-02)
- **Chạm cấu trúc dùng chung — tách form workspace:** tạo `components/workspace/workspace-form.tsx` dùng cho cả trang tạo (`app/app/workspaces/new/page.tsx`) và popup sửa (trong `app/app/workspaces/page.tsx` qua `components/ui/modal.tsx`). Props phân biệt mode: `{ mode: "create" | "edit"; initialValue?; onSubmitted }`; create → `POST /workspaces`, edit → `PATCH /workspaces/:id`. Quy tắc billing ẩn `taxCode` cho cá nhân (ISSUE-001) nằm trong form, áp dụng cả 2 mode. Ghi ở `coding-convention.md` mục "Form workspace dùng chung".
- Nút "Sửa Workspace" chỉ hiện khi `role === "OWNER"`; sau sửa thành công gọi `notifyWorkspacesListChanged()` + `refetch`.
- Quyết định nhỏ (tách form), **không cần ADR**.
- **Sẵn sàng Team Lead chẻ ticket** phần tách form + popup edit (gộp với ISSUE-001). Chạy thật PATCH mọi trạng thái chờ backend xác nhận BR-09.
