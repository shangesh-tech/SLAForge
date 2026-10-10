import type { NextRequest } from "next/server";
import { collections } from "@/lib/server/monitor";

/** Settlement records (time, verdict, tx) for up to 100 agreements: ?ids=1,2,3 */
export async function GET(request: NextRequest) {
  const ids = (request.nextUrl.searchParams.get("ids") ?? "")
    .split(",")
    .filter((id) => /^\d+$/.test(id))
    .slice(0, 100);
  if (!ids.length) return Response.json({});
  const { settlements } = await collections();
  const docs = await settlements.find({ _id: { $in: ids } }).toArray();
  return Response.json(
    Object.fromEntries(
      docs.map((d) => [
        d._id,
        { slaMet: d.slaMet, reason: d.reason, txHash: d.txHash, at: d.at.toISOString() },
      ]),
    ),
  );
}
