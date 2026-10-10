import { account, AUTORUN, chain, HOST, PORT, SLAFORGE_ADDRESS } from "./config.js";
import { close, connect } from "./db.js";
import { publicClient } from "./chain.js";
import { createServer } from "./server.js";
import { start, stop } from "./scheduler.js";
import { log, logError } from "./log.js";

async function main() {
  await connect();
  const chainId = await publicClient.getChainId();
  if (chainId !== chain.id) throw new Error(`ARC_RPC_URL is on chain ${chainId}, expected ${chain.id} (${chain.name}).`);

  log(`${chain.name} (chain ${chain.id}) · contract ${SLAFORGE_ADDRESS}`);
  log(account ? `monitor wallet ${account.address}` : "MONITOR_PRIVATE_KEY not set: checks only, no settlement");

  const server = createServer().listen(PORT, HOST, () => log(`HTTP on http://${HOST}:${PORT}`));
  if (AUTORUN) start();
  else log("MONITOR_AUTORUN=false: runs only via POST /tick");

  let stopping = false;
  const shutdown = async (signal) => {
    if (stopping) return;
    stopping = true;
    log(`${signal} received, finishing the current run…`);
    server.close();
    await stop();
    await close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  logError("failed to start:", e?.message ?? e);
  process.exit(1);
});
