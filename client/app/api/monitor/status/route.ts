import { monitorStatus } from "@/lib/server/monitor";

export async function GET() {
  return Response.json(await monitorStatus());
}
