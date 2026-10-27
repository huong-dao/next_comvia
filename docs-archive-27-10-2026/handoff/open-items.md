# Open Items — hàng đợi bàn giao giữa các vai

> **Rà soát 26/10/2026:** xem [audit và backlog hiện hành](../audits/2026-10-26-repo-audit.md). FE đã nối API cho các ticket tích hợp; trạng thái deployment mới chưa kiểm chứng. Không tiếp tục coi các ghi chú chưa deploy ngày 02–05/10 là bằng chứng bị chặn implementation. BR-12 vẫn chưa có kết luận trong tài liệu/source đọc được. Quick Chat ngừng sử dụng.

Mỗi mục ghi rõ vai cần xử lý (`CẦN SA LÀM RÕ:`, `CẦN TEAM-LEAD LÀM RÕ:`, `CẦN BA LÀM RÕ:`...), kèm link issue. Khi xử lý xong thì đánh dấu `[x]` và ghi kết quả.

---

## Cho SA (đánh giá tác động cấu trúc FE — bước tiếp theo sau BA)

- [x] ~~Component Alert/toast dùng chung toàn app~~ — **SA xong 2026-10-02:** `components/ui/toast.tsx`, ToastProvider mount ở `app/layout.tsx` root, React Context + portal, không thư viện ngoài. `coding-convention.md` mục "Toast/Alert". Ref: ISSUE-005.
- [x] ~~Cơ chế cập nhật số dư ví không reload~~ — **SA xong 2026-10-02:** polling hook `lib/use-topup-status.ts`, interval 3s, timeout 5 phút, dừng khi PAID → refetch `wallet/balance`. Không WebSocket. `coding-convention.md` mục "Polling trạng thái". Ref: ISSUE-005.
- [x] ~~Form workspace dùng chung create + edit~~ — **SA xong 2026-10-02:** `components/workspace/workspace-form.tsx` (mode create/edit), chứa quy tắc billing ISSUE-001. `coding-convention.md` mục "Form workspace dùng chung". Ref: ISSUE-007, ISSUE-001.
- [x] ~~Form template dùng chung + preview + upload ảnh~~ — **SA xong 2026-10-02:** tách `components/template/template-form.tsx` + `components/template/preview/*`; upload ảnh tái dùng `comviaMultipartFetch` qua `components/oa/image-upload-field.tsx` (validate 400x96). `coding-convention.md` mục "Form + preview template" và "Upload ảnh". Ref: ISSUE-004, ISSUE-003.
- [x] ~~Component stat block~~ — **SA xong 2026-10-02:** `components/app/stat-block.tsx` (icon + value + label + delta optional). `coding-convention.md` mục "Stat block". Ref: ISSUE-002, ISSUE-005.
- [x] ~~Mô hình OA mới — tách record OA khỏi kết nối Zalo~~ — **SA xong 2026-10-02: ADR-001 (Accepted — PO duyệt).** 2 trục độc lập → 3 trạng thái UI; domain `components/oa/`; interface spec dự kiến (PROVISIONAL BR-03/04) trong ADR. UI tĩnh dựng được ngay; logic/API chờ backend BR-03/04. Ref: ISSUE-003.

## Cho PO (chờ duyệt thiết kế SA)

- [x] ~~Duyệt ADR-001~~ — **PO duyệt 2026-10-02:** mô hình OA FE (2 trục độc lập → 3 trạng thái UI) + interface spec dự kiến được chấp nhận. ADR-001 chuyển sang Accepted. Ref: `docs/architecture/adr/adr-001.md`, ISSUE-003.

## Cho PO (chờ duyệt CR / xác nhận Missing Spec / trả lời Câu hỏi mở)

- [x] ~~Duyệt CR ISSUE-001~~ — **PO duyệt 2026-10-02**: billing cá nhân bỏ bắt buộc Mã số thuế. Đã sửa `.mdc` + BR-01 thành yêu cầu dứt khoát.
- [x] ~~Duyệt CR + định nghĩa 4 chỉ số ISSUE-002~~ — **PO chốt 2026-10-02**: (1) Tin đã gửi, (3) Mẫu APPROVED, (4) Tỷ lệ = SUCCESS/(SUCCESS+FAILED)*100 → backend tính; (2) Khách hàng tương tác → FE hardcode tạm (demo). Kỳ trước = kỳ liền trước cùng độ dài.
- [x] ~~Trả lời luồng tạo OA ISSUE-003~~ — **PO làm rõ + chốt toàn bộ 2026-10-02**: tách "Tạo OA" (record nội bộ) khỏi "Kết nối" (OAuth), 1-1 cứng Workspace↔OA. 3 câu hỏi mở đã trả lời: (1) kết nối OAuth KHÔNG ghi đè field nhập tay; (2) mã `code` chỉ là nhãn nội bộ; (3) có record thì ẩn "Tạo OA". Nghiệp vụ đủ rõ cho SA; chỉ còn chờ backend BR-03/04.
- [x] ~~Trả lời field template ISSUE-004~~ — **PO chốt 2026-10-02**: `trackingId` nhập tự do chỉ lưu; `type` thuần nội bộ không map Zalo, đổi field form theo loại (bảng: nội dung+placeholders+nội dung phụ; văn bản: nội dung+placeholders; OTP: chỉ field phút). Còn chờ backend đặt tên field "nội dung phụ"/phút OTP (BR-05).
- [x] ~~Duyệt CR ISSUE-005~~ — **PO chốt 2026-10-02**: hiển thị ĐỦ tất cả loại giao dịch (PO nhầm "chỉ 2 loại"); "đã nạp/đã dùng tháng này" cần backend (BR-06).
- [x] ~~Duyệt CR ISSUE-006~~ — **PO chốt 2026-10-02**: giữ 6 mục + đổi label "Chiến dịch Zalo" → "Chiến dịch". Chuyển thẳng Team Lead/Dev.
- [x] ~~Duyệt CR ISSUE-007~~ — **PO chốt 2026-10-02**: nút Sửa chỉ hiện với Owner. Vẫn chờ backend confirm PATCH không chặn status (BR-09).

## Cho Team Lead / Dev

- [x] ~~`CẦN TEAM-LEAD LÀM RÕ:` **ISSUE-006 (sidebar)**~~ — **Team Lead xong 2026-10-02:** chẻ `TICKET-007` (thuần FE, 1 ticket).
- [x] ~~`CẦN TEAM-LEAD LÀM RÕ:` **SA đã thiết kế xong 001–007**~~ — **Team Lead xong 2026-10-02:** đã chẻ 19 ticket (`docs/tickets/TICKET-001..019`), board ở `docs/tickets/board.md`, quy ước `docs/tickets/conventions.md` (DoD = build+lint xanh + verify thủ công, repo chưa có test). Mỗi issue phụ thuộc backend chẻ 2 lớp (UI làm ngay / tích hợp Blocked chờ BR):
  - Nền tảng dùng chung (làm trước): TICKET-001 toast, 002 stat-block, 003 polling hook, 004 image-upload, 005 workspace-form, 006 template-form.
  - UI làm ngay: 007 sidebar, 008 workspace edit, 009 dashboard overview, 010 topup popup, 011 ví section, 012 OA modal, 013 OA info box, 014 OA dashboard section.
  - Tích hợp Blocked: 015 (BR-01/09), 016 (BR-02), 017 (BR-06/07), 018 (BR-05), 019 (BR-03/04).
  - Không phát sinh mục CẦN SA mới — thiết kế SA đủ chi tiết để chẻ xuống mức thực thi.

## Cho Team Lead / Dev (phát sinh khi làm ticket)

- [x] ~~`CẦN TEAM-LEAD LÀM RÕ:` **TICKET-008 — popup Sửa Workspace không prefill được billing (thiếu endpoint chi tiết).**~~ — **PO duyệt 2026-10-02 (BA ghi nhận): chọn (a)+(b).** (a) Thêm **BR-10**: backend bổ sung `GET /workspaces/:workspaceId` trả billing profile đầy đủ để prefill (ưu tiên trung bình). (b) **Trong lúc chờ BR-10**, nới validate billing cho `mode="edit"` của `workspace-form.tsx` — bỏ trống = giữ giá trị cũ, chỉ gửi field có nhập trong `PATCH` (mọi field billing optional ở edit). Khi BR-10 xong thì prefill billing thật. Đã cập nhật ISSUE-007 (mục "Xử lý") + backend-requests BR-10. Ref: TICKET-008/015, ISSUE-007, §4.2–4.4.
- [x] ~~`CẦN TEAM-LEAD LÀM RÕ:` **TICKET-006 — submit mẫu tin "Dạng OTP" khi chưa có BR-05.**~~ — **PO chọn phương án (b), Dev xong 2026-10-02:** tạm disable nút "Lưu template" + "Lưu và gửi duyệt" khi loại tin là OTP, kèm ghi chú "Dạng OTP chờ backend hỗ trợ, tạm thời chưa lưu được" + comment `// TODO TICKET-018: bỏ disable khi BR-05 xong`. Chỉ sửa `components/template/template-form.tsx`. Bảng/văn bản lưu bình thường. Đã cập nhật TICKET-006 (mục "Quyết định PO"). Ref: ISSUE-004, §7.1, BR-05, TICKET-018.
- [x] ~~`CẦN TEAM-LEAD LÀM RÕ:` **TICKET-003 — xử lý trạng thái topup kết thúc không-PAID (`FAILED`/`EXPIRED`).**~~ — **Giải quyết 2026-10-02 (PO duyệt):** thêm callback `onFailed?(status)` vào `useTopupStatusPolling` — gặp `FAILED`/`EXPIRED` thì dừng polling sớm + gọi `onFailed` (nơi gọi bắn toast error), `onTimeout` chỉ còn cho hết 5 phút thật. Đã sửa `lib/use-topup-status.ts`, coding-convention mục "Polling trạng thái", TICKET-003 (ghi "thêm bởi: Dev theo PO duyệt"). Ref: §9.5, Phụ lục A (`TopupStatus`).

- [x] ~~`CẦN SA LÀM RÕ:` **TICKET-012 — `components/ui/modal.tsx` cố định `max-w-2xl`, hẹp cho layout 2 cột hình 3.**~~ — **SA chốt 2026-10-02 (PO ủy quyền):** thêm prop `size` cho `components/ui/modal.tsx` (`md` mặc định = `max-w-2xl` giữ nguyên hành vi cũ, `lg`/`xl` rộng hơn); popup Tạo OA dùng size rộng để khớp layout 2 cột. Nơi đang dùng không truyền `size` → không đổi. Ghi `coding-convention.md` mục "Modal dùng chung" + ADR-001 (Hệ quả). Ref: TICKET-012/019, ISSUE-003.
- [x] ~~`CẦN TEAM-LEAD/SA LÀM RÕ:` **TICKET-012 — mode="edit" không prefill được ảnh đã có (avatar/logo).**~~ — **SA chốt 2026-10-02 (PO ủy quyền):** `image-upload-field.tsx` nhận thêm prop `existingUrl` để hiện ảnh cũ trong mode edit; user KHÔNG chọn file mới → `value` giữ `null`, nơi gọi hiểu là "giữ ảnh cũ, không upload lại"; chỉ upload ảnh user thực sự chọn mới. Validate edit vẫn cho ảnh tùy chọn. Ghi `coding-convention.md` mục "Upload ảnh" + ADR-001. Ref: TICKET-012/004/019, ADR-001.

## Phân loại ticket tích hợp 015–019 sau phản hồi backend (2026-10-02)

> **Chặn chung:** backend **chưa deploy** (local chưa có Postgres). Mọi ticket tích hợp **chỉ nối API thật sau khi backend báo deploy lên server live**. Dưới đây là trạng thái *khi đã deploy*.

- [x] ~~`CẦN TEAM-LEAD LÀM RÕ:` **TICKET-016 (analytics overview, BR-02)**~~ — **Team Lead xong 2026-10-02:** TICKET-016 → "Ready, verify sau deploy": đổi `deltaPercent`→`changePercent`, ẩn badge khi `changePercent` null, `successRate.value` null → "—", `activeTemplates.changePercent` luôn null. Giữ "Khách hàng tương tác" demo.
- [x] ~~`CẦN TEAM-LEAD LÀM RÕ:` **TICKET-018 (template field mới, BR-05)**~~ — **Team Lead xong 2026-10-02:** TICKET-018 → "Ready, verify sau deploy": map enum `bang↔TABLE / van_ban↔TEXT / otp↔OTP`; gửi `type/title/trackingId/content/secondaryContent/otpExpiryMinutes`; bỏ khoá nút Lưu cho OTP.
- [x] ~~`CẦN TEAM-LEAD LÀM RÕ:` **TICKET-017 (ví: monthly + filter + bỏ cột trạng thái, BR-06/07/11)**~~ — **Team Lead xong 2026-10-02:** TICKET-017 → "Ready, verify sau deploy": (1) gỡ cột "Trạng thái" (làm/verify UI ngay); (2) `monthly.toppedUp/used.value` + `changePercent` nullable; (3) phân trang server-side `offset/limit` + `fromDate/toDate` + `type`/`types`. Vẫn mức Dev.
- [x] ~~`CẦN SA LÀM RÕ:` **TICKET-019 (OA record + upload, BR-03/04) — CẦN SA XEM LẠI trước khi Dev nối (sau deploy).**~~ — **SA xong 2026-10-02:** ADR-001 (interface + Hệ quả) đã cập nhật theo hợp đồng thật, quyết định kiến trúc giữ nguyên. Các điểm lệch đã chốt: (a) orchestrate tuần tự; (b) `image-upload-field` thêm `existingUrl` + validate 2MB/PNG-JPEG; (c) ẩn dòng "Người tạo" (chỉ có `createdByUserId`); (d) `connection` nhúng trong `GET /oa`, bỏ gọi `/oa/status` song song cho box dashboard; (e) `Modal` thêm prop `size`. Hướng dẫn cập nhật TICKET-019 cho Team Lead ở ngay dưới.
  - [x] ~~`CẦN TEAM-LEAD LÀM RÕ:` **Cập nhật TICKET-019 theo đối chiếu SA**~~ — **Team Lead xong 2026-10-02:** viết lại TICKET-019 (orchestrate POST record→3 upload tuần tự, xử lý lỗi từng bước không rollback, type theo hợp đồng, connection nhúng `GET /oa`, ẩn "Người tạo", refactor `oa/page.tsx`); tách phụ trợ thành **TICKET-020** (Modal `size`) + **TICKET-021** (image-upload-field existingUrl + validate 2MB/PNG-JPEG), là phụ thuộc của TICKET-019. Hướng dẫn chi tiết SA:
    1. **Orchestration submit** trong `oa-record-modal` khi nối thật: POST record (`{name, code, description?}`) → nếu thành công, lần lượt upload ảnh user đã chọn (`/oa/avatar` → `/oa/logo-light` → `/oa/logo-dark`, multipart field `file`, qua `comviaMultipartFetch`). Upload/connect trước record → 400; tạo lần 2 → 400 (1-1).
    2. **Xử lý lỗi từng bước + rollback/thông báo:** nếu POST record OK nhưng một bước upload ảnh lỗi → KHÔNG mất record đã tạo; báo người dùng rõ "record đã tạo, ảnh X chưa tải lên — thử lại upload" (chuyển về mode edit, ảnh đã OK giữ preview từ URL, ảnh lỗi cho chọn lại), không coi là tạo thất bại toàn bộ. Đảm bảo không double-create khi retry.
    3. Đổi type `OaRecord`/`OaConnection` theo hợp đồng (bỏ nhãn PROVISIONAL): `createdByUserId`, `updatedAt`, `description`, `*Url`, `connection` nhúng. Box dashboard đọc `connection` từ `GET /oa`.
    4. Sửa kèm `components/ui/modal.tsx` (prop `size`) + `image-upload-field.tsx` (`existingUrl` + validate 2MB/PNG-JPEG) — là file dùng chung, Team Lead gộp vào TICKET-019 hoặc tách ticket nhỏ tùy chẻ.
    Ref: ADR-001, ISSUE-003 mục "Đối chiếu hợp đồng backend BR-03/04", `coding-convention.md` ("Upload ảnh", "Modal dùng chung").
- [x] ~~`CẦN TEAM-LEAD LÀM RÕ:` **TICKET-015 (workspace edit, BR-01/09/10)**~~ — **Team Lead xong 2026-10-02:** TICKET-015 → Phần A Ready (verify sau deploy BR-01/09, kể cả `DELETED` không chặn); Phần B (prefill billing) vẫn Blocked chờ BR-10 (`GET /workspaces/:id`, PO chốt chỉ OWNER). Giữ nới-validate edit tạm.

- [x] ~~`CÂU HỎI MỞ (PO/backend):` **Box "Thông tin OA" — dòng "Người tạo".**~~ — **SA chốt 2026-10-02 (PO ủy quyền):** FE **ẩn dòng "Người tạo"** (vì `GET /oa` chỉ có `createdByUserId`, không có tên); bật lại khi backend bổ sung tên người tạo. Box hiện đã không render dòng này — giữ nguyên. (Để ngỏ cho backend: nếu sau này thêm field tên vào `GET /oa` thì FE bật lại dòng này — không chặn.) Ref: ISSUE-003, §6.5, ADR-001.
- [x] ~~`CÂU HỎI MỞ (PO):` **Sửa workspace `DELETED`?**~~ — **PO ủy quyền Team Lead chốt 2026-10-02: KHÔNG chặn** (theo PO "không giới hạn trạng thái, miễn là Owner"). FE không thêm chặn theo status. Đã ghi vào TICKET-015. Ref: ISSUE-007, BR-09.
- [x] ~~`CẦN TEAM-LEAD LÀM RÕ:` **TICKET-011 — cột "Trạng thái" bảng giao dịch: field không có trong contract.**~~ — **PO chọn hướng (c) 2026-10-02 (BA ghi nhận):** hỏi backend trước rồi mới quyết giữ/bỏ cột → thêm **BR-11** (xác nhận giao dịch ví có field trạng thái không; có → tên field + enum, không → bỏ cột; đồng thời backend cập nhật §9.2 mô tả shape response). **Trong lúc chờ BR-11**, cột "Trạng thái" hiện `"—"` (render phòng thủ, không bịa enum). Verify response thật khi nối ở TICKET-017. Đã cập nhật ISSUE-005 + backend-requests BR-11. Ref: TICKET-011/017, ISSUE-005, §9.2, Phụ lục A.

## Backend cập nhật lần 2 (2026-10-03) — ticket PHÁT SINH do thay đổi hợp đồng

> Backend cập nhật `backend-responses.md` + API guide (bản backend trong repo). 3 thay đổi đảo chiều so với bản trước → FE đã làm theo kết luận cũ, nay phải sửa lại. **Vẫn chờ deploy** mới nối/verify thật, nhưng phần UI (khôi phục cột, guard nút) làm/sửa được ngay.

- [x] ~~`CẦN TEAM-LEAD LÀM RÕ:` **(MỚI) Khôi phục cột "Trạng thái" bảng giao dịch ví — BR-11 ĐẢO NGƯỢC.**~~ — **Team Lead xong 2026-10-03:** tạo **TICKET-022** (thêm lại `status` vào `TxRow`, render cột + map `SUCCESS/PENDING/FAILED`→Thành công/Đang xử lý/Thất bại qua badge sẵn có, filter `?status=`). Sửa TICKET-017 (gỡ phần "gỡ cột", trỏ sang TICKET-022) + TICKET-011 (ghi chú) + board. File chạm: `components/wallet/wallet-section.tsx` (không song song với TICKET-017). ISSUE-005 do BA đã annotate reversal.
- [x] ~~`CẦN TEAM-LEAD LÀM RÕ:` **(MỚI) Ẩn/khoá nút "Sửa Workspace" với workspace `DELETED` — BR-09 ĐÍNH CHÍNH.**~~ — **Team Lead xong 2026-10-03:** tạo **TICKET-023** (thêm điều kiện `ws.status !== "DELETED"` cho nút Sửa ở `app/app/workspaces/page.tsx`, không mở popup/không gọi GET detail cho DELETED). Sửa ghi chú "DELETED không chặn" trong TICKET-015 + board. File chạm: `app/app/workspaces/page.tsx` (không song song với TICKET-024).
- [x] ~~`CẦN TEAM-LEAD LÀM RÕ:` **TICKET-015 phần B (prefill billing) — MỞ KHOÁ (BR-10 đã xong, chờ deploy).**~~ — **Team Lead xong 2026-10-03:** tách phần B thành ticket riêng **TICKET-024** ("Ready — verify sau deploy"): popup Sửa gọi `GET /workspaces/:id` (chỉ Owner) → đổ `billingProfile` vào `WorkspaceForm`, xử lý `billingProfile = null`, bỏ nới-validate tạm + `// TODO BR-10`. TICKET-015 nay chỉ còn verify BR-01/09. File chạm: `app/app/workspaces/page.tsx` + `components/workspace/workspace-form.tsx` (TICKET-024 làm SAU TICKET-023 vì cùng `workspaces/page.tsx`).
- [ ] `GHI CHÚ (không phát sinh việc FE):` BR-02/BR-06 đổi **quy tắc so kỳ** (cùng độ dài đã trôi qua, clamp) — backend tính nội bộ, không đổi shape; BR-02 "tin đã gửi" tính cả FAILED. FE chỉ hiển thị `changePercent`. Ref: ISSUE-002/005.

- [x] ~~`CẦN TEAM-LEAD LÀM RÕ:` **(MỚI) Field "Mô tả" (description) trong popup Tạo/Sửa OA — ISSUE-008 (CR, PO duyệt).**~~ — **Team Lead xong 2026-10-05:** tạo **TICKET-025** ("Ready — verify sau deploy", không cần SA). (1) thêm field "Mô tả" textarea KHÔNG bắt buộc vào `oa-record-modal.tsx` (ẩn dấu `*`, không vào checklist bắt buộc, không ảnh hưởng `ready`), prefill `record.description` ở mode edit, `maxLength` tạm 500 chờ BR-12; (2) gửi `description` ở POST + PATCH (PATCH chỉ gửi khi đổi; xoá bằng `""`, `// TODO BR-12` cho null vs ""); (3) `oa-info-box.tsx:245-247` hiển thị `record.description`, ẩn dòng khi rỗng/null. File chạm: `components/oa/oa-record-modal.tsx`, `components/oa/oa-info-box.tsx`. Ref: ISSUE-008, §6.5, BR-12.

## Cho Backend team

- [x] ~~Đã phản hồi BR-01→BR-11~~ — **Backend trả lời 2026-10-02 + cập nhật 2026-10-03** (`docs/handoff/backend-responses.md`): nay **cả BR-01→BR-11 code xong, CHƯA deploy**. Thay đổi lần 2: **BR-09** (`DELETED`→403, DISABLED/SUSPENDED→200), **BR-10** (đã xong, chỉ Owner), **BR-11 ĐẢO NGƯỢC** (có `status`). Trạng thái + điểm lệch: bảng đầu `backend-requests.md`.
- [x] ~~BR-10 phân quyền~~ — backend đã code chỉ OWNER (Member 403). Đã xong.
- [ ] **Báo FE khi deploy xong server live** — FE chỉ nối API thật sau mốc đó (ticket tích hợp 015–019 + 2 ticket mới khôi phục cột trạng thái / guard DELETED).
- [ ] **BR-12 (ISSUE-008) — xác nhận ngắn, KHÔNG build:** `description` OA — (1) độ dài tối đa? (2) PATCH cho xoá bằng rỗng/null? Chi tiết: `backend-requests.md` BR-12.
