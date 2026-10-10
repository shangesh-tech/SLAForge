import type { NextRequest } from "next/server";
import { profiles, publicProfile } from "@/lib/server/db";

/** Public profiles (name, role, type, website) for up to 100 wallets. */
export async function GET(request: NextRequest) {
  const addresses = [
    ...new Set(
      (request.nextUrl.searchParams.get("address") ?? "")
        .split(",")
        .map((a) => a.trim().toLowerCase())
        .filter((a) => /^0x[0-9a-f]{40}$/.test(a)),
    ),
  ].slice(0, 100);
  if (!addresses.length) return Response.json({ profiles: {} });
  const docs = await (await profiles()).find({ _id: { $in: addresses } }).toArray();
  return Response.json({
    profiles: Object.fromEntries(docs.map((d) => [d._id, publicProfile(d)])),
  });
}
