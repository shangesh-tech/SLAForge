import { ProviderDashboard } from "@/components/dashboards";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string }>;
}) {
  const { provider } = await searchParams;
  return <ProviderDashboard initialProvider={provider} />;
}
