"use client";

import { useCallback, useMemo, useState } from "react";
import { HiOutlineClipboardDocument, HiOutlineCodeBracketSquare } from "react-icons/hi2";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { comviaFetch, getComviaApiBaseUrl } from "@/lib/comviaFetch";
import { useComviaQuery } from "@/lib/use-comvia-query";

type TemplateRow = {
  id: string;
  type?: string;
  name?: string;
  code?: string;
  status?: string;
  otpExpiryMinutes?: number | null;
  placeholdersJson?: Record<string, string>;
  placeholder_labels?: Record<string, string> | null;
};

type SampleValue = string | number;

const SAMPLE_PHONE = "84901234567";
const FALLBACK_CODE = "123456";

/** Dữ liệu mẫu cho `data`: giá trị mẫu của template; OTP luôn có `otp` và `phut`. */
function sampleDataOf(template?: TemplateRow): Record<string, SampleValue> {
  if (!template) return { name: "Minh" };
  const data: Record<string, SampleValue> = {};
  for (const [key, value] of Object.entries(template.placeholdersJson ?? {})) {
    data[key] = value || "...";
  }
  if (template.type?.toUpperCase() === "OTP") {
    data.otp = data.otp && data.otp !== "..." ? data.otp : "123456";
    data.phut = template.otpExpiryMinutes ?? 5;
  }
  return data;
}

function buildCurl(url: string, templateCode: string, data: Record<string, SampleValue>) {
  const json = JSON.stringify(
    { api_key: "YOUR_API_KEY", templateCode, phoneNumber: SAMPLE_PHONE, data },
    null,
    2,
  )
    .replace(/'/g, "'\\''")
    .replace(/\n/g, "\n  ");
  return [
    `curl -X POST "${url}" \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -H "x-api-key: YOUR_API_KEY" \\`,
    `  -d '${json}'`,
  ].join("\n");
}

const RESPONSE_EXAMPLE = `{
  "status": "success",
  "providerMessageId": "MSG_ID_TU_ZALO",
  "messageLogId": "MESSAGE_LOG_ID"
}`;

function CodeBlock({ title, code, onCopy }: { title: string; code: string; onCopy?: () => void }) {
  // Màu cố định (không theo theme) để khối code đọc như nhau ở light/dark mode.
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-zinc-950">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="text-xs font-medium text-zinc-400">{title}</span>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-300 transition hover:bg-white/10"
          >
            <HiOutlineClipboardDocument className="size-4" />
            Copy
          </button>
        ) : null}
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-zinc-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/** Hướng dẫn gửi tin bằng API key; ví dụ đổi theo mẫu tin đang chọn. */
export function ApiUsageGuide({ workspaceId, className }: { workspaceId: string; className?: string }) {
  const { showToast } = useToast();
  const [selectedId, setSelectedId] = useState("");

  const fetcher = useCallback(
    (token: string) => comviaFetch<TemplateRow[]>(`/workspaces/${workspaceId}/templates`, { token }),
    [workspaceId],
  );
  const { data: templates } = useComviaQuery(Boolean(workspaceId), fetcher);

  const approved = useMemo(
    () => (templates ?? []).filter((t) => (t.status ?? "").toUpperCase() === "APPROVED"),
    [templates],
  );
  const selected = approved.find((t) => t.id === selectedId) ?? approved[0];

  const url = `${getComviaApiBaseUrl()}/public/messages/send`;
  const templateCode = selected?.code ?? FALLBACK_CODE;
  const sampleData = useMemo(() => sampleDataOf(selected), [selected]);
  const curl = useMemo(() => buildCurl(url, templateCode, sampleData), [url, templateCode, sampleData]);
  const variables = Object.entries(sampleData);

  async function copyCurl() {
    try {
      await navigator.clipboard.writeText(curl);
      showToast({ type: "success", message: "Đã sao chép lệnh cURL." });
    } catch {
      showToast({ type: "error", message: "Không sao chép được. Hãy chọn lệnh và sao chép thủ công." });
    }
  }

  return (
    <Card className={className}>
      <div className="flex items-start gap-3">
        <HiOutlineCodeBracketSquare className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div>
          <h2 className="text-base font-semibold text-foreground">Hướng dẫn gửi tin bằng API Key</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Dùng API key để gửi tin từ hệ thống của bạn mà không cần đăng nhập Comvia.
          </p>
        </div>
      </div>

      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Tạo API key ở bảng phía trên và lưu lại ngay (key chỉ hiện một lần).</li>
        <li>Chọn mẫu tin muốn gửi để xem ví dụ phù hợp.</li>
        <li>
          Chạy lệnh bên dưới, thay <code className="rounded bg-surface-muted px-1">YOUR_API_KEY</code> bằng key của
          bạn và số điện thoại nhận tin.
        </li>
      </ol>

      <div className="mt-5 max-w-md">
        <label className="mb-1 block text-xs text-muted-foreground" htmlFor="api-guide-template">
          Mẫu tin
        </label>
        <Select
          id="api-guide-template"
          value={selected?.id ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
          disabled={approved.length === 0}
        >
          {approved.length === 0 ? <option value="">Chưa có mẫu tin đã duyệt</option> : null}
          {approved.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name ?? t.code ?? t.id}
              {t.code ? ` (${t.code})` : ""}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-4">
        <CodeBlock title="cURL" code={curl} onCopy={() => void copyCurl()} />
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Giải thích tham số</p>
        <div className="mt-2 overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-border">
              <tr>
                <td className="whitespace-nowrap px-4 py-2 align-top font-mono text-xs">x-api-key</td>
                <td className="whitespace-nowrap px-4 py-2 align-top text-xs text-muted-foreground">Header</td>
                <td className="px-4 py-2 text-muted-foreground">API key của bạn.</td>
              </tr>
              <tr>
                <td className="whitespace-nowrap px-4 py-2 align-top font-mono text-xs">api_key</td>
                <td className="whitespace-nowrap px-4 py-2 align-top text-xs text-muted-foreground">Body</td>
                <td className="px-4 py-2 text-muted-foreground">Cùng giá trị với <code>x-api-key</code>; cần gửi cả hai.</td>
              </tr>
              <tr>
                <td className="whitespace-nowrap px-4 py-2 align-top font-mono text-xs">templateCode</td>
                <td className="whitespace-nowrap px-4 py-2 align-top text-xs text-muted-foreground">Body</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Mã mẫu tin (cột &quot;Mã mẫu tin&quot; ở danh sách mẫu tin). Mẫu đang chọn:{" "}
                  <code>{templateCode}</code>. Chỉ dùng được mẫu tin đã duyệt.
                </td>
              </tr>
              <tr>
                <td className="whitespace-nowrap px-4 py-2 align-top font-mono text-xs">phoneNumber</td>
                <td className="whitespace-nowrap px-4 py-2 align-top text-xs text-muted-foreground">Body</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Số điện thoại nhận tin, bắt đầu bằng <code>84</code>, không có dấu <code>+</code> (ví dụ{" "}
                  <code>{SAMPLE_PHONE}</code>).
                </td>
              </tr>
              <tr>
                <td className="whitespace-nowrap px-4 py-2 align-top font-mono text-xs">data</td>
                <td className="whitespace-nowrap px-4 py-2 align-top text-xs text-muted-foreground">Body</td>
                <td className="px-4 py-2 text-muted-foreground">
                  Giá trị cho từng biến của mẫu tin.
                  {variables.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {variables.map(([key, value]) => {
                        const label = selected?.placeholder_labels?.[key]?.trim();
                        return (
                          <li key={key}>
                            <code>{key}</code>
                            {label ? ` — ${label}` : ""}
                            <span className="text-xs"> (ví dụ: {String(value)})</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    " Mẫu này không có biến, để data là {}."
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kết quả trả về</p>
        <CodeBlock title="Response" code={RESPONSE_EXAMPLE} />
        <p className="text-xs text-muted-foreground">
          <code>success</code> nghĩa là Zalo đã tiếp nhận yêu cầu gửi, chưa phải đã giao tới người nhận. Nếu gửi lỗi,
          API trả mã <code>400</code> kèm <code>messageLogId</code>; bạn có thể xem lại ở mục Nhật ký tin.
        </p>
      </div>
    </Card>
  );
}
