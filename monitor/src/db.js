import { MongoClient } from "mongodb";
import { MONGODB_DB, MONGODB_URI, SLAFORGE_ADDRESS } from "./config.js";

/** The first testnet contract, whose data lives in the unsuffixed collections. */
const legacyContract = "0x1b96d63b9c75555b44727de4bde2d0a7b9991e95";

/**
 * Monitor data belongs to one contract: a new deployment restarts its ids at 1,
 * so each contract gets its own collections (checks_1a2b3c4d…). The Next.js
 * app reads the same collections, so this must match client/lib/server/db.ts.
 */
export function collectionName(name) {
  const address = SLAFORGE_ADDRESS.toLowerCase();
  return address === legacyContract ? name : `${name}_${address.slice(2, 10)}`;
}

const client = new MongoClient(MONGODB_URI);
let collections = null;

/** Connects once and returns the monitor collections. */
export async function connect() {
  if (collections) return collections;
  await client.connect();
  const db = client.db(MONGODB_DB);
  collections = {
    db,
    checks: db.collection(collectionName("checks")),
    settlements: db.collection(collectionName("settlements")),
    state: db.collection(collectionName("monitor_state")),
  };
  await collections.checks.createIndex({ serviceId: 1, at: 1 });
  return collections;
}

export async function ping() {
  await client.db(MONGODB_DB).command({ ping: 1 });
}

export async function close() {
  await client.close();
  collections = null;
}
