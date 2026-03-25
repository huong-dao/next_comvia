import { InternalAppShell } from "@/components/layout/internal-app-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <InternalAppShell variant="admin">{children}</InternalAppShell>;
}
