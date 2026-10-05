"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  HiMiniCheck,
  HiOutlineCheckCircle,
  HiOutlineDocumentText,
  HiOutlineInformationCircle,
  HiOutlinePaperAirplane,
  HiOutlinePhoto,
  HiOutlineUser,
  HiOutlineUserGroup,
} from "react-icons/hi2";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { ImageUploadField } from "@/components/oa/image-upload-field";
import {
  ComviaApiError,
  comviaFetch,
  comviaMultipartFetch,
} from "@/lib/comviaFetch";
import { formatComviaError } from "@/lib/api-message";
import { getAccessToken } from "@/lib/auth";

/** Trạng thái kết nối Zalo nhúng trong record (GET /oa). Shape theo hợp đồng BR-03/04. */
export type OaConnection = {
  status: string; // NOT_CONNECTED | CONNECTED | TOKEN_EXPIRED | CONNECTION_ERROR | RECONNECT_REQUIRED | DISCONNECTED
  connectedAt: string | null;
  oaId: string | null;
};

/**
 * Record OA nội bộ (trục "record" trong ADR-001). Shape thống nhất cho
 * GET/POST/PATCH/upload theo hợp đồng backend BR-03/04 (§6.5). `connection`
 * được nhúng trong response GET /oa — không cần gọi /oa/status song song.
 */
export type OaRecord = {
  id: string;
  workspaceId: string;
  name: string;
  code: string; // nhãn nội bộ, không đối soát Zalo
  description: string | null;
  avatarUrl: string | null; // /public/oa/<wsId>/<file> — FE ghép base URL
  logoLightUrl: string | null; // 400x96
  logoDarkUrl: string | null; // 400x96
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  connection: OaConnection;
};

/**
 * Body JSON tạo/sửa record. avatar/logoLight/logoDark KHÔNG nằm trong JSON này —
 * gửi qua 3 endpoint multipart riêng SAU khi POST record (§6.5).
 */
export type OaRecordInput = {
  name: string;
  code: string;
  description?: string;
};

export type OaRecordModalProps = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  workspaceId: string;
  /** Record hiện có khi mode="edit" — prefill tên/mã + ảnh cũ (existingUrl). */
  record?: OaRecord | null;
  /** Gọi sau khi lưu thành công hoàn toàn (record + mọi upload OK). */
  onSaved: (record: OaRecord) => void;
};

const NAME_MAX = 100;
const CODE_MAX = 50;
// Mô tả không bắt buộc. Giới hạn tạm 500 ký tự (an toàn) — chờ BR-12 chốt max length thật.
const DESCRIPTION_MAX = 500;
const LOGO_WIDTH = 400;
const LOGO_HEIGHT = 96;
const CODE_PATTERN = /^[A-Za-z0-9_-]+$/;

type Errors = {
  name?: string;
  code?: string;
  avatar?: string;
  logoLight?: string;
  logoDark?: string;
};

/** Mô tả một bước upload ảnh: path endpoint + field state + nhãn hiển thị. */
type UploadStep = {
  key: "avatar" | "logoLight" | "logoDark";
  path: "avatar" | "logo-light" | "logo-dark";
  label: string;
};

const UPLOAD_STEPS: UploadStep[] = [
  { key: "avatar", path: "avatar", label: "hình đại diện" },
  { key: "logoLight", path: "logo-light", label: "logo sáng" },
  { key: "logoDark", path: "logo-dark", label: "logo tối" },
];

export function OaRecordModal({
  open,
  onClose,
  mode,
  workspaceId,
  record,
  onSaved,
}: OaRecordModalProps) {
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [logoLight, setLogoLight] = useState<File | null>(null);
  const [logoDark, setLogoDark] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Record đã được persist ở backend: khởi tạo từ `record` (mode edit), hoặc set
   * sau khi POST thành công (mode create). Khác null ⇒ mọi submit tiếp theo là
   * PATCH/upload (KHÔNG POST lại) → tránh double-create khi retry upload lỗi.
   */
  const [savedRecord, setSavedRecord] = useState<OaRecord | null>(null);

  // Reset form khi modal mở (seed từ `record` nếu đang sửa).
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setName(record?.name ?? "");
      setCode(record?.code ?? "");
      setDescription(record?.description ?? "");
      setAvatar(null);
      setLogoLight(null);
      setLogoDark(null);
      setErrors({});
      setSubmitError(null);
      setSavedRecord(mode === "edit" ? (record ?? null) : null);
    }
    prevOpenRef.current = open;
  }, [open, record, mode]);

  const persisted = savedRecord !== null;
  // Edit thực tế: mode edit, HOẶC create nhưng đã POST xong (đang retry upload).
  const isEditMode = mode === "edit" || persisted;

  const trimmedName = name.trim();
  const trimmedCode = code.trim();
  const trimmedDescription = description.trim();

  const nameValid = trimmedName.length > 0 && trimmedName.length <= NAME_MAX;
  const codeValid =
    trimmedCode.length > 0 && trimmedCode.length <= CODE_MAX && CODE_PATTERN.test(trimmedCode);
  const basicInfoDone = nameValid && codeValid;
  // Ảnh "xong" khi có file mới HOẶC đã có URL cũ trên record đã lưu.
  const avatarDone = avatar !== null || Boolean(savedRecord?.avatarUrl);
  const logoLightDone = logoLight !== null || Boolean(savedRecord?.logoLightUrl);
  const logoDarkDone = logoDark !== null || Boolean(savedRecord?.logoDarkUrl);

  // Create (chưa persist): cần đủ 5 mục. Edit: chỉ bắt buộc tên/mã (ảnh giữ cũ được).
  const ready = isEditMode
    ? basicInfoDone
    : basicInfoDone && avatarDone && logoLightDone && logoDarkDone;

  const checklist = useMemo(
    () => [
      {
        key: "avatar",
        Icon: HiOutlineUser,
        title: "Hình đại diện",
        subtitle: null as string | null,
        done: avatarDone,
      },
      {
        key: "logoLight",
        Icon: HiOutlinePhoto,
        title: "Logo sáng",
        subtitle: `${LOGO_WIDTH}px x ${LOGO_HEIGHT}px`,
        done: logoLightDone,
      },
      {
        key: "logoDark",
        Icon: HiOutlinePhoto,
        title: "Logo tối",
        subtitle: `${LOGO_WIDTH}px x ${LOGO_HEIGHT}px`,
        done: logoDarkDone,
      },
      {
        key: "basic",
        Icon: HiOutlineDocumentText,
        title: "Thông tin cơ bản",
        subtitle: "Tên OA và mã code",
        done: basicInfoDone,
      },
    ],
    [avatarDone, logoLightDone, logoDarkDone, basicInfoDone],
  );

  function validate(): Errors {
    const next: Errors = {};
    if (!trimmedName) next.name = "Vui lòng nhập tên OA.";
    else if (trimmedName.length > NAME_MAX) next.name = `Tên OA tối đa ${NAME_MAX} ký tự.`;

    if (!trimmedCode) next.code = "Vui lòng nhập mã code.";
    else if (trimmedCode.length > CODE_MAX) next.code = `Mã code tối đa ${CODE_MAX} ký tự.`;
    else if (!CODE_PATTERN.test(trimmedCode))
      next.code = "Mã code chỉ gồm chữ cái, số, dấu gạch dưới hoặc gạch ngang.";

    // Ảnh bắt buộc chỉ khi tạo mới (chưa persist). Edit/retry: giữ ảnh cũ được.
    if (!isEditMode) {
      if (!avatar) next.avatar = "Vui lòng tải lên hình đại diện.";
      if (!logoLight) next.logoLight = "Vui lòng tải lên logo sáng.";
      if (!logoDark) next.logoDark = "Vui lòng tải lên logo tối.";
    }
    return next;
  }

  function fileFor(key: UploadStep["key"]): File | null {
    if (key === "avatar") return avatar;
    if (key === "logoLight") return logoLight;
    return logoDark;
  }

  function clearFile(key: UploadStep["key"]) {
    if (key === "avatar") setAvatar(null);
    else if (key === "logoLight") setLogoLight(null);
    else setLogoDark(null);
  }

  async function handleSubmit() {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const token = getAccessToken();
    if (!token) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      let current = savedRecord;

      // Bước 1 — tạo hoặc sửa phần text của record.
      if (!current) {
        // Mô tả không bắt buộc: gửi chuỗi đã trim (rỗng nếu user bỏ trống).
        const body: OaRecordInput = {
          name: trimmedName,
          code: trimmedCode,
          description: trimmedDescription,
        };
        current = await comviaFetch<OaRecord>(`/workspaces/${workspaceId}/oa`, {
          method: "POST",
          token,
          body: JSON.stringify(body),
        });
        // Persist ngay: retry sau sẽ KHÔNG POST lại (tránh double-create 1-1).
        setSavedRecord(current);
      } else {
        const body: Partial<OaRecordInput> = {};
        if (trimmedName !== current.name) body.name = trimmedName;
        if (trimmedCode !== current.code) body.code = trimmedCode;
        // Chỉ gửi description khi đổi so với record hiện tại (giống name/code).
        // Cho xoá mô tả bằng chuỗi rỗng "".
        // TODO BR-12: backend chưa chốt clear bằng "" hay null. Tạm dùng "";
        // nếu BR-12 chốt null thì đổi giá trị gửi khi trimmedDescription rỗng.
        if (trimmedDescription !== (current.description ?? "")) {
          body.description = trimmedDescription;
        }
        if (Object.keys(body).length > 0) {
          current = await comviaFetch<OaRecord>(`/workspaces/${workspaceId}/oa`, {
            method: "PATCH",
            token,
            body: JSON.stringify(body),
          });
          setSavedRecord(current);
        }
      }

      // Bước 2 — upload tuần tự từng ảnh user đã chọn. Lỗi từng bước KHÔNG rollback.
      const stepErrors: Errors = {};
      const failedLabels: string[] = [];
      for (const step of UPLOAD_STEPS) {
        const file = fileFor(step.key);
        if (!file) continue;
        try {
          const formData = new FormData();
          formData.append("file", file);
          current = await comviaMultipartFetch<OaRecord>(
            `/workspaces/${workspaceId}/oa/${step.path}`,
            { token, formData },
          );
          setSavedRecord(current);
          // Upload OK → bỏ file khỏi state; preview chuyển sang URL mới (existingUrl).
          clearFile(step.key);
        } catch (e) {
          stepErrors[step.key] = formatComviaError(e, `Không tải lên được ${step.label}.`);
          failedLabels.push(step.label);
        }
      }

      if (failedLabels.length > 0) {
        // Record đã được lưu; chỉ một số ảnh lỗi → giữ modal ở chế độ sửa, cho
        // chọn lại ảnh lỗi (ảnh OK đã hiển thị qua existingUrl). KHÔNG đóng, KHÔNG
        // coi là tạo thất bại toàn bộ.
        setErrors((prev) => ({ ...prev, ...stepErrors }));
        setSubmitError(
          `Đã lưu thông tin OA, nhưng chưa tải lên được: ${failedLabels.join(", ")}. ` +
            "Vui lòng chọn lại và thử lại.",
        );
        showToast({
          type: "warning",
          message: `Một số ảnh chưa tải lên được (${failedLabels.join(", ")}). Hãy thử lại.`,
        });
        return;
      }

      onSaved(current);
      showToast({
        type: "success",
        message: mode === "edit" || persisted ? "Đã cập nhật thông tin OA." : "Đã tạo OA thành công.",
      });
      onClose();
    } catch (e) {
      // Lỗi ở bước tạo/sửa record (hoặc 1-1: tạo lần 2 → 400).
      const message =
        e instanceof ComviaApiError
          ? e.message
          : formatComviaError(e, "Không lưu được thông tin OA.");
      setSubmitError(message);
      showToast({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  }

  const submitLabel = isEditMode ? "Lưu thay đổi" : "Tạo OA";

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose} disabled={submitting}>
        Hủy
      </Button>
      <Button
        icon={<HiOutlinePaperAirplane className="size-4" />}
        onClick={() => void handleSubmit()}
        disabled={submitting}
      >
        {submitting ? "Đang lưu…" : submitLabel}
      </Button>
    </>
  );

  return (
    <Modal
      open={open}
      title={isEditMode ? "Sửa thông tin Zalo OA" : "Tạo thông tin Zalo OA"}
      onClose={onClose}
      footer={footer}
      size="xl"
    >
      <p className="text-sm text-muted-foreground">
        Vui lòng nhập đầy đủ thông tin bắt buộc để{" "}
        {isEditMode ? "cập nhật" : "tạo mới"} Zalo Official Account trên hệ thống.
      </p>

      <div className="grid gap-5 md:grid-cols-[1.6fr_1fr]">
        {/* Cột trái: form các mục nhập liệu */}
        <div className="space-y-5">
          <FieldSection index={1} title="Tên OA" hint="Nhập tên hiển thị của Zalo OA (tối đa 100 ký tự)">
            <CountedInput
              value={name}
              max={NAME_MAX}
              placeholder="Nhập tên OA..."
              invalid={!!errors.name}
              onChange={(v) => {
                setName(v);
                if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
              }}
            />
            <FieldError message={errors.name} />
          </FieldSection>

          <FieldSection
            index={2}
            title="Mã code"
            hint="Nhập mã định danh của OA (chỉ gồm chữ cái, số, dấu gạch dưới hoặc gạch ngang)"
          >
            <CountedInput
              value={code}
              max={CODE_MAX}
              placeholder="Nhập mã code..."
              invalid={!!errors.code}
              onChange={(v) => {
                setCode(v);
                if (errors.code) setErrors((e) => ({ ...e, code: undefined }));
              }}
            />
            <FieldError message={errors.code} />
          </FieldSection>

          <FieldSection
            index={3}
            title="Mô tả"
            hint="Nhập mô tả ngắn cho Zalo OA (không bắt buộc)"
            optional
          >
            <CountedTextarea
              value={description}
              max={DESCRIPTION_MAX}
              placeholder="Nhập mô tả..."
              onChange={setDescription}
            />
          </FieldSection>

          <FieldSection index={4} title="Hình đại diện" hint="Tải lên hình đại diện (avatar) cho Zalo OA">
            <ImageUploadField
              label="Định dạng: JPG, PNG. Dung lượng tối đa 2MB."
              value={avatar}
              existingUrl={savedRecord?.avatarUrl ?? undefined}
              onChange={(f) => {
                setAvatar(f);
                if (errors.avatar) setErrors((e) => ({ ...e, avatar: undefined }));
              }}
            />
            <FieldError message={errors.avatar} />
          </FieldSection>

          <FieldSection
            index={5}
            title="Logo sáng"
            hint="Tải lên logo phiên bản nền sáng để hiển thị trên giao diện sáng của Zalo"
          >
            <ImageUploadField
              label="Kích thước yêu cầu: 400x96px. Định dạng: PNG, JPG."
              value={logoLight}
              existingUrl={savedRecord?.logoLightUrl ?? undefined}
              requiredWidth={LOGO_WIDTH}
              requiredHeight={LOGO_HEIGHT}
              onChange={(f) => {
                setLogoLight(f);
                if (errors.logoLight) setErrors((e) => ({ ...e, logoLight: undefined }));
              }}
            />
            <FieldError message={errors.logoLight} />
          </FieldSection>

          <FieldSection
            index={6}
            title="Logo tối"
            hint="Tải lên logo phiên bản nền tối để hiển thị trên giao diện tối của Zalo"
          >
            <ImageUploadField
              label="Kích thước yêu cầu: 400x96px. Định dạng: PNG, JPG."
              value={logoDark}
              existingUrl={savedRecord?.logoDarkUrl ?? undefined}
              requiredWidth={LOGO_WIDTH}
              requiredHeight={LOGO_HEIGHT}
              onChange={(f) => {
                setLogoDark(f);
                if (errors.logoDark) setErrors((e) => ({ ...e, logoDark: undefined }));
              }}
            />
            <FieldError message={errors.logoDark} />
          </FieldSection>
        </div>

        {/* Cột phải: tóm tắt thông tin */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-surface-muted/50 p-4">
            <div className="mb-3 flex items-start gap-2">
              <HiOutlineUserGroup className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Tóm tắt thông tin</h3>
                <p className="text-xs text-muted-foreground">
                  Kiểm tra các thông tin bắt buộc khi {isEditMode ? "cập nhật" : "tạo"} OA
                </p>
              </div>
            </div>

            <ul className="space-y-3">
              {checklist.map((item) => (
                <li key={item.key} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground">
                    <item.Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    {item.subtitle ? (
                      <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                    ) : null}
                    <ChecklistStatus done={item.done} />
                  </div>
                </li>
              ))}
            </ul>

            <div
              className={cn(
                "mt-4 flex items-start gap-2 rounded-lg border p-3 transition-colors",
                ready
                  ? "border-success/40 bg-success/10"
                  : "border-border bg-card",
              )}
            >
              <HiOutlineCheckCircle
                className={cn("mt-0.5 size-5 shrink-0", ready ? "text-success" : "text-muted-foreground")}
                aria-hidden
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Sẵn sàng {isEditMode ? "lưu" : "tạo"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ready
                    ? "Đã nhập đủ thông tin bắt buộc."
                    : `Hoàn thành đầy đủ các thông tin bắt buộc để ${isEditMode ? "lưu" : "tạo"} Zalo OA.`}
                </p>
              </div>
            </div>

            {submitError ? (
              <p role="alert" className="mt-3 text-xs font-medium text-danger">
                {submitError}
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-border p-4">
            <div className="mb-2 flex items-center gap-2">
              <HiOutlineInformationCircle className="size-4 text-primary" aria-hidden />
              <h4 className="text-sm font-semibold text-foreground">Lưu ý khi tải ảnh</h4>
            </div>
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              <li>Sử dụng định dạng PNG hoặc JPG.</li>
              <li>Đảm bảo hình ảnh rõ nét, không bị vỡ.</li>
              <li>Logo nên có nền trong suốt hoặc đúng kích thước theo quy định.</li>
              <li>Không sử dụng hình ảnh vi phạm bản quyền hoặc chứa nội dung nhạy cảm.</li>
            </ul>
          </div>
        </aside>
      </div>
    </Modal>
  );
}

function FieldSection({
  index,
  title,
  hint,
  optional = false,
  children,
}: {
  index: number;
  title: string;
  hint: string;
  /** Mục không bắt buộc → ẩn dấu `*`. Mặc định false (giữ hành vi mục bắt buộc cũ). */
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {index}
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {title}
            {optional ? null : <span className="text-danger"> *</span>}
          </p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="pl-7">{children}</div>
    </div>
  );
}

function CountedInput({
  value,
  max,
  placeholder,
  invalid,
  onChange,
}: {
  value: string;
  max: number;
  placeholder?: string;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Input
        value={value}
        maxLength={max}
        placeholder={placeholder}
        invalid={invalid}
        className="pr-16"
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        {value.length}/{max}
      </span>
    </div>
  );
}

function CountedTextarea({
  value,
  max,
  placeholder,
  onChange,
}: {
  value: string;
  max: number;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <Textarea
        value={value}
        maxLength={max}
        placeholder={placeholder}
        rows={3}
        className="resize-none pr-16"
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="pointer-events-none absolute bottom-3 right-3 text-xs text-muted-foreground">
        {value.length}/{max}
      </span>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-xs font-medium text-danger">
      {message}
    </p>
  );
}

function ChecklistStatus({ done }: { done: boolean }) {
  return (
    <span
      className={cn(
        "mt-0.5 inline-flex items-center gap-1 text-xs",
        done ? "text-success" : "text-muted-foreground",
      )}
    >
      {done ? (
        <HiMiniCheck className="size-3.5" aria-hidden />
      ) : (
        <span className="inline-block size-2 rounded-full bg-muted-foreground/40" aria-hidden />
      )}
      {done ? "Đã hoàn thành" : "Chưa hoàn thành"}
    </span>
  );
}
