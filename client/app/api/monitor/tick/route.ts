import type { NextRequest } from "next/server";
import { runMonitorTick } from "@/lib/server/monitor";

/**
 * Runs the monitor once. For hosts without a long-running server (e.g. Vercel),
 * call this every 2 minutes from a cron with `Authorization: Bearer CRON_SECRET`.
 */
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await runMonitorTick());
}

export const GET = handle;
export const POST = handle;
