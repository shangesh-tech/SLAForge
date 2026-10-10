import { ProviderDashboard } from "@/components/dashboards";
import { RoleGate } from "@/components/role-gate";
export default function Page() {
  return (
    <RoleGate need="Provider">
      <ProviderDashboard />
    </RoleGate>
  );
}
