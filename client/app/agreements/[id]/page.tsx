import { AgreementDetail } from "@/components/agreement-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AgreementDetail id={id} />;
}
