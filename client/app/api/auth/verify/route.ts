import type { NextRequest } from "next/server";
import { verifyMessage } from "viem";
import { parseSiweMessage, validateSiweMessage } from "viem/siwe";
import { setSession, takeNonce } from "@/lib/server/session";

/** Checks a signed Sign-In with Ethereum message and starts a session. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message : "";
  const signature = typeof body?.signature === "string" ? body.signature : "";
  if (!message || !/^0x[0-9a-fA-F]+$/.test(signature))
    return Response.json({ error: "Invalid sign-in request." }, { status: 400 });

  const nonce = await takeNonce();
  const fields = parseSiweMessage(message);
  const valid =
    !!nonce &&
    !!fields.address &&
    validateSiweMessage({
      message: fields,
      domain: request.headers.get("host") ?? undefined,
      nonce,
    }) &&
    (await verifyMessage({
      address: fields.address,
      message,
      signature: signature as `0x${string}`,
    }).catch(() => false));
  if (!valid || !fields.address)
    return Response.json(
      { error: "Signature could not be verified. Please try again." },
      { status: 401 },
    );

  await setSession(fields.address);
  return Response.json({ address: fields.address.toLowerCase() });
}
