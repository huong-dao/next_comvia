import { InternalAppShell } from "@/components/layout/internal-app-shell";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <InternalAppShell variant="staff">{children}</InternalAppShell>;
}
