import { SecuritySettingsPage } from "@/app/app/settings/security/page";
import { StaffRoleGate } from "@/components/admin/role-gate";

export default function StaffSecuritySettingsPage() {
  return (
    <StaffRoleGate>
      <SecuritySettingsPage profileHref="/staff" profileLabel="Staff hub" />
    </StaffRoleGate>
  );
}
