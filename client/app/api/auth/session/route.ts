import { clearSession, getSession } from "@/lib/server/session";

export async function GET() {
  return Response.json({ address: await getSession() });
}

export async function DELETE() {
  await clearSession();
  return Response.json({ address: null });
}
