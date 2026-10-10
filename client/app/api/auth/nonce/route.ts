import { generateSiweNonce } from "viem/siwe";
import { setNonce } from "@/lib/server/session";

/** Starts Sign-In with Ethereum: a one-time nonce the wallet signs. */
export async function GET() {
  const nonce = generateSiweNonce();
  await setNonce(nonce);
  return Response.json({ nonce });
}
