"use client";

/**
 * Shared chrome: left sidebar slot + same header/main column as workspace (`AppShell`).
 */
export function AppChrome({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background p-5 pb-16">
      {/* Trừ đúng padding dọc của wrapper (20px trên + 64px dưới) để không sinh scroll thừa. */}
      <div className="flex min-h-[calc(100vh-5.25rem)] w-full">
        {sidebar}
        <div className="flex min-h-[calc(100vh-5.25rem)] flex-1 flex-col px-5">
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
