import type { NextRequest } from "next/server";
import { getSession } from "@/lib/server/session";
import { privateProfile, profiles } from "@/lib/server/db";
import type { Profile } from "@/lib/types";

const unauthorized = () =>
  Response.json({ error: "Sign in with your wallet first." }, { status: 401 });

/** The signed-in wallet's full profile, including email. */
export async function GET() {
  const address = await getSession();
  if (!address) return unauthorized();
  const doc = await (await profiles()).findOne({ _id: address });
  return Response.json({ address, profile: doc ? privateProfile(doc) : null });
}

function validate(body: unknown): Profile | string {
  const b = (body ?? {}) as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const profile: Profile = {
    name: text(b.name),
    email: text(b.email).toLowerCase(),
    website: text(b.website),
    role: b.role === "Provider" ? "Provider" : "Customer",
    type: b.type === "Company" ? "Company" : "Developer",
  };
  if (b.role !== "Provider" && b.role !== "Customer") return "Choose a role.";
  if (profile.name.length < 2 || profile.name.length > 70)
    return "Use a name of 2–70 characters.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email) || profile.email.length > 254)
    return "Enter a valid email address.";
  if (profile.website && !/^https?:\/\/\S+$/i.test(profile.website))
    return "The website must start with http:// or https://.";
  if (profile.website.length > 200) return "The website URL is too long.";
  return profile;
}

/** Creates or updates the signed-in wallet's profile. */
export async function PUT(request: NextRequest) {
  const address = await getSession();
  if (!address) return unauthorized();
  const profile = validate(await request.json().catch(() => null));
  if (typeof profile === "string")
    return Response.json({ error: profile }, { status: 400 });
  const now = new Date();
  const doc = await (await profiles()).findOneAndUpdate(
    { _id: address },
    { $set: { ...profile, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true, returnDocument: "after" },
  );
  return Response.json({ address, profile: doc ? privateProfile(doc) : profile });
}
