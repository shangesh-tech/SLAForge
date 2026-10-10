import { CustomerDashboard } from "@/components/dashboards";
import { RoleGate } from "@/components/role-gate";
export default function Page() {
  return (
    <RoleGate need="Customer">
      <CustomerDashboard />
    </RoleGate>
  );
}
