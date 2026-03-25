import { TenantAppRoleGate } from "@/components/app/tenant-app-role-gate";
import { AppShell } from "@/components/layout/app-shell";

export default function LoggedInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <TenantAppRoleGate>{children}</TenantAppRoleGate>
    </AppShell>
  );
}
