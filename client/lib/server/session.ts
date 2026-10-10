import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "slaforge_session";
const NONCE_COOKIE = "slaforge_nonce";
const SESSION_AGE = 7 * 24 * 60 * 60; // 7 days, in seconds
const NONCE_AGE = 10 * 60; // 10 minutes

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

function sign(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return createHmac("sha256", secret).update(value).digest("base64url");
}

/** Signs in a wallet for 7 days with an HMAC-signed, httpOnly cookie. */
export async function setSession(address: string) {
  const value = `${address.toLowerCase()}.${Date.now() + SESSION_AGE * 1000}`;
  (await cookies()).set(
    SESSION_COOKIE,
    `${value}.${sign(value)}`,
    cookieOptions(SESSION_AGE),
  );
}

/** The signed-in wallet address (lowercase), or null. */
export async function getSession(): Promise<string | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const [address, expires, signature] = raw.split(".");
  if (!address || !expires || !signature) return null;
  const expected = Buffer.from(sign(`${address}.${expires}`));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given))
    return null;
  if (Number(expires) < Date.now()) return null;
  return address;
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function setNonce(nonce: string) {
  (await cookies()).set(NONCE_COOKIE, nonce, cookieOptions(NONCE_AGE));
}

/** Returns the pending sign-in nonce and deletes it, so it works only once. */
export async function takeNonce(): Promise<string | null> {
  const store = await cookies();
  const nonce = store.get(NONCE_COOKIE)?.value ?? null;
  store.delete(NONCE_COOKIE);
  return nonce;
}
