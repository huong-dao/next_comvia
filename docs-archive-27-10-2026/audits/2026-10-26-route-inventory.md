# Kiểm kê page routes — 26/10/2026

Nguồn: dev@18908dd. 69 page.tsx. Đây là kiểm kê source, không phải kết quả chạy route. Số điểm gọi chỉ tính comviaFetch/comviaMultipartFetch/comviaDownloadBlob/fetch trực tiếp trong page, không tính API nằm trong component con.

| Route | Dấu hiệu tại source | Điểm gọi API trực tiếp | Component nội bộ import |
|---|---|---:|---|
| `/admin/audit-logs` | AdminRoleGate tại page | 2 | audit/audit-logs-table, app/page-header, app/page-state, admin/role-gate, ui/button, ui/card, ui/input, ui/searchable-select |
| `/admin/config/cta-pricing` | AdminRoleGate tại page | 2 | admin/role-gate, app/page-header, app/page-state, ui/button, ui/card, ui/input |
| `/admin/config/message-pricing` | AdminRoleGate tại page | 2 | app/page-header, app/page-state, admin/role-gate, ui/button, ui/card, ui/input |
| `/admin/config` | AdminRoleGate tại page | 0 | admin/role-gate, app/page-header, ui/card |
| `/admin/dev/payment-webhook` | AdminRoleGate tại page | 1 | app/page-header, admin/role-gate, ui/button, ui/card, ui/input |
| `/admin/internal-quick-chat` | Quick Chat: ngừng sử dụng; AdminRoleGate tại page | 0 | admin/role-gate, admin/internal-quick-chat-playground |
| `/admin/invoices/[invoiceId]` | AdminRoleGate tại page | 1 | admin/issue-invoice-pdf-modal, admin/role-gate, app/page-header, app/page-state, ui/button, ui/card, ui/entity-status-badge, ui/simple-table |
| `/admin/invoices` | AdminRoleGate tại page | 2 | admin/role-gate, app/page-header, app/page-state, ui/button, ui/card, ui/entity-status-badge, ui/input, ui/pagination-bar, ui/searchable-select, ui/simple-table |
| `/admin/money-accounts` | AdminRoleGate tại page | 1 | app/page-header, app/page-state, admin/role-gate, ui/button, ui/card, ui/modal, ui/entity-status-badge, ui/simple-table, ui/input, ui/controls |
| `/admin/oa-connections` | AdminRoleGate tại page | 1 | admin/role-gate, app/page-header, app/page-state, ui/button, ui/card, ui/entity-status-badge, ui/input, ui/pagination-bar, ui/simple-table |
| `/admin/orders/[orderId]` | AdminRoleGate tại page | 1 | app/page-header, app/page-state, admin/role-gate, ui/button, ui/card, ui/entity-status-badge, ui/simple-table |
| `/admin/orders` | AdminRoleGate tại page | 3 | app/page-header, app/page-state, admin/role-gate, ui/button, ui/card, ui/entity-status-badge, ui/input, ui/pagination-bar, ui/searchable-select, ui/simple-table |
| `/admin` | AdminRoleGate tại page | 3 | app/page-header, app/page-state, admin/role-gate, ui/button, ui/card |
| `/admin/quick-chat/agents/[agentId]` | Quick Chat: ngừng sử dụng; AdminRoleGate tại page | 2 | app/page-header, admin/role-gate, app/page-state, ui/button, ui/card, ui/controls, ui/input |
| `/admin/quick-chat/agents` | Quick Chat: ngừng sử dụng; AdminRoleGate tại page | 1 | app/page-header, app/page-state, admin/role-gate, ui/button, ui/card, ui/simple-table |
| `/admin/quick-chat/tools` | Quick Chat: ngừng sử dụng; AdminRoleGate tại page | 1 | app/page-header, app/page-state, admin/role-gate, ui/button, ui/card |
| `/admin/system-health` | Placeholder; AdminRoleGate tại page | 0 | app/page-header, admin/role-gate, ui/card |
| `/admin/templates/[templateId]` | AdminRoleGate tại page | 2 | admin/role-gate, app/page-header, app/page-state, ui/button, ui/card, ui/input |
| `/admin/templates` | AdminRoleGate tại page | 1 | admin/role-gate, app/page-header, app/page-state, ui/button, ui/card, ui/entity-status-badge, ui/input, ui/simple-table |
| `/admin/templates-review` | Có redirect server | 0 |  |
| `/admin/users` | AdminRoleGate tại page | 2 | app/page-header, app/page-state, admin/role-gate, ui/button, ui/card, ui/entity-status-badge, ui/simple-table |
| `/admin/workspaces` | AdminRoleGate tại page | 2 | app/page-header, app/page-state, admin/role-gate, ui/button, ui/card, ui/entity-status-badge, ui/simple-table |
| `/app` | Page/component; xem layout cho gate | 0 |  |
| `/app/profile` | Page/component; xem layout cho gate | 1 | app/page-header, app/page-state, ui/card, ui/status-badge |
| `/app/settings/oa` | Page/component; xem layout cho gate | 0 | app/page-header, app/page-state, ui/button, ui/card |
| `/app/settings/security` | Page/component; xem layout cho gate | 1 | app/page-header, ui/button, ui/card, ui/input |
| `/app/w/[workspaceId]/activity-history` | Có nhánh PageForbidden | 1 | audit/audit-logs-table, app/page-header, app/page-state, workspace/workspace-gate, ui/button, ui/card, ui/input |
| `/app/w/[workspaceId]/analytics` | Placeholder | 0 | app/page-header, ui/card |
| `/app/w/[workspaceId]/api-keys` | Có nhánh PageForbidden | 4 | app/page-header, app/page-state, workspace/workspace-gate, ui/button, ui/card, ui/entity-status-badge, ui/input, ui/modal, ui/simple-table |
| `/app/w/[workspaceId]/campaigns/[campaignId]` | Page/component; xem layout cho gate | 13 | app/page-header, app/page-state, campaign/campaign-preflight-modal, campaign/campaign-row-edit-modal, workspace/workspace-gate, ui/button, ui/card, ui/entity-status-badge, ui/input, ui/modal, ui/simple-table |
| `/app/w/[workspaceId]/campaigns/new` | Page/component; xem layout cho gate | 2 | app/page-header, app/page-state, ui/button, ui/card, ui/input |
| `/app/w/[workspaceId]/campaigns` | Page/component; xem layout cho gate | 1 | app/page-header, app/page-state, ui/button, ui/entity-status-badge, ui/simple-table |
| `/app/w/[workspaceId]/dashboard` | Page/component; xem layout cho gate | 0 | app/page-header, app/overview-section, oa/oa-info-box, template/dashboard-template-list, wallet/wallet-section, ui/button |
| `/app/w/[workspaceId]/invoices/[invoiceId]` | Page/component; xem layout cho gate | 1 | app/page-header, app/page-state, ui/button, ui/card, ui/entity-status-badge, ui/simple-table |
| `/app/w/[workspaceId]/invoices` | Page/component; xem layout cho gate | 1 | app/page-header, app/page-state, ui/entity-status-badge, ui/simple-table |
| `/app/w/[workspaceId]/members` | Page/component; xem layout cho gate | 2 | app/page-header, app/page-state, workspace/workspace-gate, ui/button, ui/card, ui/entity-status-badge, ui/input, ui/modal, ui/simple-table |
| `/app/w/[workspaceId]/messages/logs` | Page/component; xem layout cho gate | 1 | app/page-header, app/page-state, ui/button, ui/entity-status-badge, ui/input, ui/simple-table |
| `/app/w/[workspaceId]/messages/send-single` | Page/component; xem layout cho gate | 3 | app/page-header, app/page-state, ui/button, ui/card, ui/entity-status-badge, ui/input |
| `/app/w/[workspaceId]/oa` | Page/component; xem layout cho gate | 0 | app/page-header, app/page-state, oa/oa-info-box |
| `/app/w/[workspaceId]/orders/[orderId]` | Page/component; xem layout cho gate | 1 | app/page-header, app/page-state, ui/button, ui/card, ui/entity-status-badge, ui/simple-table |
| `/app/w/[workspaceId]/orders` | Page/component; xem layout cho gate | 1 | app/page-header, app/page-state, ui/entity-status-badge, ui/simple-table |
| `/app/w/[workspaceId]/templates/[templateId]` | Page/component; xem layout cho gate | 6 | app/page-header, app/page-state, workspace/workspace-gate, ui/button, ui/card, ui/entity-status-badge, ui/input, template/template-cta-fields |
| `/app/w/[workspaceId]/templates/new` | Page/component; xem layout cho gate | 0 | app/page-header, template/template-form |
| `/app/w/[workspaceId]/templates` | Page/component; xem layout cho gate | 1 | app/page-header, app/page-state, ui/button, ui/entity-status-badge, ui/simple-table |
| `/app/w/[workspaceId]/topup` | Có nhánh PageForbidden | 2 | app/page-header, app/page-state, workspace/workspace-gate, ui/button, ui/card, ui/input |
| `/app/w/[workspaceId]/wallet` | Page/component; xem layout cho gate | 2 | app/page-header, app/page-state, workspace/workspace-gate, ui/button, ui/card, ui/entity-status-badge, ui/input, ui/simple-table |
| `/app/workspaces/new` | Page/component; xem layout cho gate | 1 | app/page-header, ui/card, workspace/workspace-form |
| `/app/workspaces` | Page/component; xem layout cho gate | 3 | app/page-header, app/page-state, ui/button, ui/card, ui/entity-status-badge, ui/modal, workspace/workspace-form |
| `/auth/forgot-password` | Page/component; xem layout cho gate | 2 | ui/button, ui/input, ui/theme-toggle, ui/alert-modal |
| `/auth/login` | Page/component; xem layout cho gate | 2 | ui/button, ui/controls, ui/input, ui/theme-toggle, ui/alert-modal |
| `/auth/register` | Page/component; xem layout cho gate | 1 | ui/button, ui/controls, ui/input, ui/theme-toggle, ui/alert-modal |
| `/auth/verify-otp` | Page/component; xem layout cho gate | 2 | ui/button, ui/input, ui/theme-toggle, ui/alert-modal |
| `/` | Page/component; xem layout cho gate | 0 |  |
| `/settings/oa` | Page/component; xem layout cho gate | 0 | app/page-state |
| `/staff/internal-quick-chat` | Quick Chat: ngừng sử dụng; Có redirect server | 0 |  |
| `/staff/invoices/[invoiceId]` | Có redirect server | 0 |  |
| `/staff/invoices` | Có redirect server | 0 |  |
| `/staff` | Page/component; xem layout cho gate | 1 | app/page-header, app/page-state, admin/role-gate, ui/button, ui/card |
| `/staff/settings/security` | Page/component; xem layout cho gate | 0 | admin/role-gate |
| `/staff/templates-review/[templateId]/oa` | Page/component; xem layout cho gate | 0 | admin/role-gate, admin/staff-template-review-detail |
| `/staff/templates-review/[templateId]` | Page/component; xem layout cho gate | 0 | admin/role-gate, admin/staff-template-review-detail |
| `/staff/templates-review/[templateId]/workspace` | Page/component; xem layout cho gate | 0 | admin/role-gate, admin/staff-template-review-detail |
| `/staff/templates-review/approved` | Page/component; xem layout cho gate | 0 | admin/role-gate, admin/templates-review-panel |
| `/staff/templates-review/disabled` | Page/component; xem layout cho gate | 0 | admin/role-gate, admin/templates-review-panel |
| `/staff/templates-review` | Có redirect server | 0 |  |
| `/staff/templates-review/pending-zalo-approval` | Page/component; xem layout cho gate | 0 | admin/role-gate, admin/templates-review-panel |
| `/staff/templates-review/rejected` | Có redirect server | 0 |  |
| `/staff/templates-review/submitted` | Page/component; xem layout cho gate | 0 | admin/role-gate, admin/templates-review-panel |
| `/ui-kit` | Page/component; xem layout cho gate | 0 | ui/button, ui/card, ui/controls, ui/data-table, ui/input, ui/pagination-bar, ui/searchable-select, app/page-header, app/page-state, layout/workspace-switcher, layout/workspace-topbar, ui/entity-status-badge, ui/modal, ui/alert-modal, ui/simple-table, ui/theme-toggle |

File source của mỗi route là app/<route>/page.tsx; ví dụ /app/workspaces → app/app/workspaces/page.tsx. Route / là app/page.tsx. Các marker gate không chứng minh backend đã enforce quyền. Xem báo cáo audit để biết khoảng trống và tiêu chí nghiệm thu.
