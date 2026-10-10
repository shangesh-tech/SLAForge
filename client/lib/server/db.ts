import { MongoClient, type Collection } from "mongodb";
import type { Profile } from "@/lib/types";
import { SLAFORGE_ADDRESS } from "@/lib/web3/config";

/** The first testnet contract, whose data lives in the unsuffixed collections. */
const legacyContract = "0x1b96d63b9c75555b44727de4bde2d0a7b9991e95";

/**
 * Monitor data belongs to one contract: a new deployment restarts its ids at 1,
 * so each contract gets its own collections (checks_1a2b3c4d…).
 */
export const monitorCollection = (name: string) => {
  const address = SLAFORGE_ADDRESS.toLowerCase();
  return address === legacyContract ? name : `${name}_${address.slice(2, 10)}`;
};

/** One profile per wallet. `_id` is the lowercase wallet address. */
export type ProfileDoc = Profile & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

declare global {
  var slaforgeMongo: Promise<MongoClient> | undefined;
}

let indexed = false;

/** The SLAForge database, reusing one connection across requests and hot reloads. */
export async function db() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  globalThis.slaforgeMongo ??= new MongoClient(uri).connect();
  const database = (await globalThis.slaforgeMongo).db(
    process.env.MONGODB_DB || "slaforge",
  );
  if (!indexed) {
    indexed = true;
    await Promise.all([
      database.collection("profiles").createIndex({ role: 1 }),
      database.collection(monitorCollection("checks")).createIndex({ serviceId: 1, at: 1 }),
    ]);
  }
  return database;
}

export async function profiles(): Promise<Collection<ProfileDoc>> {
  return (await db()).collection<ProfileDoc>("profiles");
}

/** Profile fields that are safe to show to anyone (no email). */
export function publicProfile(doc: ProfileDoc) {
  return {
    address: doc._id,
    name: doc.name,
    website: doc.website,
    role: doc.role,
    type: doc.type,
  };
}

export function privateProfile(doc: ProfileDoc): Profile {
  return {
    name: doc.name,
    email: doc.email,
    website: doc.website,
    role: doc.role,
    type: doc.type,
  };
}
