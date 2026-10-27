# Code Review — Comvia Frontend

> **Đối chiếu source 26/10/2026:** `components/ui/modal.tsx` đã có portal, mounted guard, body scroll lock, giới hạn chiều cao và vùng cuộn. Fix có trong code; chưa thực hiện visual regression mới nên chưa đóng verdict QA. Nội dung review 05/10 dưới đây là lịch sử. Xem [audit hiện tại](../audits/2026-10-26-repo-audit.md).

## Review: ISSUE-003 / TICKET-019 (+ ISSUE-004/TICKET-018) — commit fb53e56 — Điều tra lỗi popup OA sai vị trí

**Ngày:** 2026-10-05
**Phạm vi:** điều tra lỗi giao diện PO báo (popup "Sửa thông tin Zalo OA" render sai vị trí, overlay không phủ full màn hình), KHÔNG review toàn bộ commit.

**Verdict:** KHÔNG-ĐẠT (xác nhận có lỗi — 1 điểm CHẶN MERGE, kèm 1 chỗ khác dính cùng lỗi)

> **[Dev — 2026-10-05] ĐÃ SỬA, CHỜ REVIEWER XÁC NHẬN.** Portal hoá `components/ui/modal.tsx` qua `createPortal(..., document.body)` + guard SSR `mounted` theo pattern `toast.tsx` (không disable rule `set-state-in-effect`). Sửa đúng 1 file, không chạm `card.tsx`, không chạm nơi gọi. Giữ `z-40`, `size`, footer/✕. `npx eslint modal.tsx` exit 0 + `npm run build` ✓. Cả 2 điểm CHẶN MERGE (`oa-info-box.tsx`, `dashboard-template-list.tsx`) được giải quyết tại tầng primitive. Chưa chạy dev server lượt này — cần Reviewer/verify thủ công trên trình duyệt trước khi đổi phán quyết. (Phán quyết gốc giữ nguyên.)

### Đối chiếu
- **Nghiệp vụ/API:** không phải lỗi nghiệp vụ/API — endpoint OA (`GET/POST/PATCH /workspaces/:id/oa` + 3 upload) và luồng 3-trạng-thái đúng theo ADR-001/§6.5. Lỗi thuần CSS layout của component dùng chung `Modal`.
- **Kỹ thuật/cấu trúc:** đối chiếu `coding-convention.md` mục "Modal dùng chung" (`components/ui/modal.tsx`). Phát hiện khiếm khuyết latent trong chính primitive dùng chung — không phải lỗi riêng của TICKET-019.
- **Code:** đã đọc source thật `modal.tsx`, `card.tsx`, `oa-info-box.tsx`, `dashboard-template-list.tsx`, `wallet-section.tsx`, `app/app/workspaces/page.tsx`, các consumer `<Modal>` khác. Grep "Mock" trong `components/oa` → không còn mock trong FE.

### Gate (kết quả thật)
- build / lint: CHƯA chạy ở lượt điều tra này (phạm vi là truy nguyên nhân gốc, không sửa code). Khi Dev áp fix cần chạy `npm run build` + `npm run lint`.
- verify thủ công: xác nhận bằng đọc code + quy tắc CSS (containing block cho `position: fixed`), khớp 2 ảnh PO (overlay chỉ phủ vùng Card, popup bị cắt cụt trong khung Card). Không khởi chạy dev server (port 3002 có thể bận).

### Nguyên nhân gốc
`components/ui/modal.tsx:34` render overlay bằng `<div className="fixed inset-0 z-40 ...">` **ngay tại chỗ khai báo trong cây React** (KHÔNG dùng `createPortal`). Khi một tổ tiên có thuộc tính tạo *containing block* cho phần tử `position: fixed`, `fixed`/`inset-0` không còn neo theo viewport mà neo theo tổ tiên đó.

`components/ui/card.tsx:11` áp class Tailwind `backdrop-blur-sm` (= CSS `backdrop-filter: blur(4px)`). Theo spec CSS, phần tử có `backdrop-filter != none` **tạo containing block cho mọi hậu duệ `position: fixed`**. Vì vậy mọi `<Modal>` được render **bên trong** một `<Card>` sẽ bị giam trong khung Card: overlay chỉ phủ vùng Card, popup canh giữa theo Card (không theo màn hình), bị cắt ở đáy Card — đúng hiện tượng PO chụp.

### Phát hiện

- **[CHẶN MERGE]** `components/oa/oa-info-box.tsx:169` + `:338` — `<OaRecordModal>` (→ `<Modal>`) được render bên trong `<Card>` (có `backdrop-blur-sm`). Đây là lỗi PO báo: popup "Sửa/Tạo thông tin Zalo OA" bị giam trong khung box "Thông tin OA", overlay không phủ full viewport. Nguyên nhân gốc nằm ở `components/ui/modal.tsx:34` (thiếu portal) + `components/ui/card.tsx:11` (`backdrop-blur-sm`). Hướng sửa: xem mục "Hướng sửa".

- **[CHẶN MERGE]** `components/template/dashboard-template-list.tsx:64` + `:135` — `<Modal>` popup "Tạo mẫu tin" cũng được render bên trong `<Card>` (mở `<Card>` dòng 64, `<Modal>` dòng 135, đóng `</Card>` dòng 138). CÙNG lỗi, mức chắc chắn cao (xác nhận từ code). Trên dashboard, bấm tạo mẫu tin sẽ cho popup sai vị trí y hệt OA. PO có thể chưa bấm thử.

- **[không chặn — xác nhận KHÔNG dính lỗi]** Các `<Modal>` sau render NGOÀI `<Card>` nên hiện KHÔNG bị lỗi, nhưng vẫn phụ thuộc vào cùng khiếm khuyết latent của `Modal` (sẽ vỡ nếu sau này bị bọc trong Card/transform/filter):
  - `components/wallet/topup-modal.tsx` dùng ở `components/wallet/wallet-section.tsx:405` — nằm sau khi 2 `<Card>` đã đóng (dòng 253, 402) → không trong Card. An toàn hiện tại.
  - Popup Sửa Workspace `app/app/workspaces/page.tsx:248` — `<Card>` theo từng item đóng ở dòng 237, Modal ở 248 ở cấp ngoài → không trong Card. An toàn.
  - `components/campaign/campaign-row-edit-modal.tsx` dùng ở `campaigns/[campaignId]/page.tsx:630`, và `<Modal>` dòng 602 — nằm sau khi các `<Card>` đóng (429, 492) → không trong Card. An toàn. (Ngoài phạm vi commit fb53e56.)
  - Suy luận chung: BẤT KỲ `<Modal>` nào là hậu duệ của phần tử có `transform`/`filter`/`backdrop-filter`/`perspective`/`will-change: transform|filter`/`contain: layout|paint|strict|content` đều sẽ vỡ. `Card` dùng khắp app → rủi ro lặp lại cao. Đây là lý do nên sửa tại tầng `Modal`, không sửa từng nơi gọi.

- **[không chặn — ghi nhận về dữ liệu "Mock OA"]** Grep `Mock|mock` trong `components/oa/*` → KHÔNG còn mock trong FE (TICKET-019 đã gỡ `MockOaRecord`). Dữ liệu "Mock OA" / mã "Mock OA" / "Kết nối lúc 28/04/2026" trong ảnh PO đến từ record thật do backend/seed trả về (box đọc `GET /workspaces/:id/oa` ở `oa-info-box.tsx:57`), KHÔNG phải mock còn sót trong code. Không cần sửa code; nếu muốn dọn dữ liệu demo thì làm ở phía backend/seed.

### Hướng sửa (đề xuất — Dev thực hiện, nhỏ nhất, đúng tầng)
Sửa MỘT chỗ ở `components/ui/modal.tsx`: render overlay qua `createPortal(..., document.body)` thay vì render tại chỗ. Portal đưa overlay ra thẳng `<body>` → thoát mọi containing block do tổ tiên (`Card`...) tạo ra → `fixed inset-0` lại neo theo viewport cho MỌI consumer cùng lúc. Không phải sửa từng nơi gọi, không phải bỏ `backdrop-blur-sm` của Card (bỏ sẽ đổi thiết kế thị giác toàn app và vẫn vỡ nếu xuất hiện tổ tiên transform/filter khác).

Mẫu áp dụng (guard SSR cho Next.js App Router):
- Thêm state `mounted` + `useEffect(() => setMounted(true), [])`; `if (!open || !mounted) return null;` rồi `return createPortal(<div className="fixed inset-0 ...">…</div>, document.body);`. Guard `mounted` tránh lệch hydration vì `document` không tồn tại khi SSR.

### Rủi ro cần kiểm khi áp fix
- **z-index vs toast:** Modal `z-40` (`modal.tsx:34`), Toast `z-50` (`components/ui/toast.tsx`). Sau portal, toast vẫn nổi trên modal (đúng mong muốn). Giữ nguyên `z-40`, KHÔNG nâng lên ≥ z-50 (sẽ che toast).
- **SSR hydration:** bắt buộc guard `mounted`/kiểm `typeof document` trước `createPortal`, nếu không sẽ lỗi SSR/hydration mismatch.
- **focus/scroll lock:** Modal hiện KHÔNG khoá scroll/focus-trap; portal không làm xấu đi (không phải regression). Nếu muốn thêm là cải tiến riêng, ngoài phạm vi fix này.
- **prop `size` (TICKET-020):** không bị ảnh hưởng bởi portal — logic `SIZE_MAX_WIDTH` nằm ở `<div>` con, giữ nguyên.
- **Regression sweep:** sau fix, kiểm thử lại TẤT CẢ ~12 consumer `<Modal>` (dashboard OA, popup tạo mẫu tin, TopupModal, Sửa Workspace, campaign modals, members, api-keys, admin money-accounts, issue-invoice-pdf, ui-kit) để chắc không màn nào bị đổi vị trí ngoài ý muốn — vì đây là primitive dùng chung.

### Kết luận vai
Đây là lỗi cấp code ở component dùng chung `Modal` (sửa đúng 1 file `components/ui/modal.tsx`), KHÔNG phải quyết định kiến trúc mới — portal hoá là cách hiện thực đúng ý định sẵn có của Modal (overlay phủ full viewport), không đổi API/props/contract. Vì vậy KHÔNG mở mục CẦN SA; để Dev sửa trực tiếp. Lưu ý Dev: vì chạm primitive dùng chung, bắt buộc regression sweep + build/lint trước khi commit.
