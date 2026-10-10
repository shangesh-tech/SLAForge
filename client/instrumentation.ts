/** Starts the SLA monitor (every MONITOR_INTERVAL_SECONDS) when the Node.js server boots. */
export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.MONITOR_AUTORUN !== "false" &&
    process.env.MONGODB_URI
  ) {
    const { startMonitorScheduler } = await import("./lib/server/scheduler");
    startMonitorScheduler();
  }
}
