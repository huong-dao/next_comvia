"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HiChevronDown, HiChevronUp, HiOutlinePlusCircle } from "react-icons/hi2";
import { cn } from "@/lib/cn";
import { comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";
import { APP_PATHS, workspacePath } from "@/lib/paths";

type WorkspaceRow = {
  id: string;
  name: string;
  slug?: string;
  status?: string;
  role?: string;
  joinedAt?: string;
};

const badgeColors = [
  "bg-sky-500/25 text-sky-300",
  "bg-cyan-500/25 text-cyan-300",
  "bg-blue-500/25 text-blue-300",
  "bg-indigo-500/25 text-indigo-300",
];

function shortName(name: string) {
  const t = name.trim();
  if (!t) return "?";
  return t.slice(0, 1).toUpperCase();
}

export function WorkspaceSwitcher({
  activeWorkspaceId = "",
  activeWorkspaceName = "",
  compact = false,
  className,
}: {
  /** Rỗng khi đang ở /app/workspaces (chưa chọn workspace). */
  activeWorkspaceId?: string;
  activeWorkspaceName?: string;
  compact?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<WorkspaceRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const rows = await comviaFetch<WorkspaceRow[]>("/workspaces", { token });
      setList(Array.isArray(rows) ? rows : []);
      setLoadError(null);
    } catch {
      setLoadError("Không tải được danh sách workspace.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadList();
  }, [loadList]);

  const selected = useMemo(() => {
    if (!activeWorkspaceId) {
      return { id: "", name: "Chọn workspace" };
    }
    return (
      list.find((item) => item.id === activeWorkspaceId) ?? {
        id: activeWorkspaceId,
        name: activeWorkspaceName,
      }
    );
  }, [list, activeWorkspaceId, activeWorkspaceName]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  async function switchWorkspace(nextId: string) {
    const token = getAccessToken();
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    try {
      await comviaFetch(`/workspaces/${nextId}/switch`, { method: "POST", token });
    } catch {
      /* vẫn điều hướng local nếu switch lỗi — backend có thể đã cập nhật session */
    }

    const inWorkspaceShell = /^\/app\/w\/[^/]+/.test(pathname);
    const nextPath = inWorkspaceShell
      ? pathname.replace(/^(\/app\/w\/)[^/]+/, `$1${nextId}`)
      : workspacePath(nextId, "dashboard");
    router.push(nextPath);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => {
          if (compact) return;
          setOpen((prev) => !prev);
        }}
        className={cn(
          "w-full rounded-2xl border border-border/70 bg-card px-3 py-3 text-left shadow-sm",
          compact && "px-0 py-2 text-center",
        )}
      >
        <div className={cn("flex items-center gap-3", compact && "justify-center")}>
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary brightness-110 text-sm font-semibold text-black">
            {shortName(selected.name || "?")}
          </span>
          {!compact ? (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
                <p className="truncate text-sm font-semibold leading-tight text-foreground">{selected.name}</p>
              </div>
              <div className="text-muted-foreground">
                {open ? <HiChevronUp className="size-4" /> : <HiChevronDown className="size-4" />}
              </div>
            </>
          ) : null}
        </div>
      </button>

      {loadError && !compact ? <p className="mt-2 text-xs text-danger">{loadError}</p> : null}

      {open && !compact ? (
        <div className="absolute left-0 right-0 z-20 mt-2 rounded-2xl border border-border/70 bg-card p-3 text-foreground shadow-(--shadow-soft)">
          <div className="max-h-64 space-y-0 overflow-y-auto">
            {list.length === 0 ? (
              <p className="px-2 py-2 text-sm text-muted-foreground">Chưa có workspace.</p>
            ) : (
              list.map((workspace, index) => {
                const isActive = workspace.id === activeWorkspaceId;

                return (
                  <button
                    key={workspace.id}
                    type="button"
                    onClick={() => switchWorkspace(workspace.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition",
                      isActive ? "bg-surface-muted" : "hover:bg-surface-muted/80",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-lg text-xs font-semibold",
                        badgeColors[index % badgeColors.length],
                      )}
                    >
                      {shortName(workspace.name)}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium leading-none text-foreground">
                      <span className="block truncate">{workspace.name}</span>
                      {workspace.role ? (
                        <span className="mt-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
                          {workspace.role}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-3 border-t border-border/60 pt-3">
            <Link
              href={APP_PATHS.workspacesNew}
              className="flex w-full items-center gap-2 rounded-xl bg-surface-muted px-3 py-2 text-[15px] font-semibold leading-none text-primary transition hover:bg-surface"
              onClick={() => setOpen(false)}
            >
              <HiOutlinePlusCircle className="size-4" />
              Tạo workspace mới
            </Link>
            <Link
              href={APP_PATHS.workspaces}
              className="mt-2 flex w-full items-center justify-center rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-surface-muted/80 hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              Tất cả workspace
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
