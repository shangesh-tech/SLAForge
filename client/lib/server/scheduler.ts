import { CHECK_INTERVAL_MS, runMonitorTick } from "./monitor";

declare global {
  var slaforgeMonitorTimer: ReturnType<typeof setInterval> | undefined;
}

export const intervalLabel = (ms: number) =>
  ms % 60_000 === 0 ? `${ms / 60_000} min` : `${ms / 1000} sec`;

/** Runs the monitor now and on every interval. Safe to call more than once. */
export function startMonitorScheduler() {
  if (globalThis.slaforgeMonitorTimer) return;
  let running = false;
  const tick = async () => {
    // Skip if the previous run (e.g. waiting for a settlement tx) is still going.
    if (running) return;
    running = true;
    try {
      const r = await runMonitorTick();
      if (r.checked || r.settled || r.errors.length)
        console.log(
          `[monitor] checked ${r.checked} service(s), settled ${r.settled}` +
            (r.skipped ? ` · ${r.skipped}` : "") +
            (r.errors.length ? ` · errors: ${r.errors.join("; ")}` : ""),
        );
    } catch (e) {
      console.error("[monitor] run failed:", (e as Error)?.message ?? e);
    } finally {
      running = false;
    }
  };
  setTimeout(tick, 3_000);
  globalThis.slaforgeMonitorTimer = setInterval(tick, CHECK_INTERVAL_MS);
  console.log(
    `[monitor] SLA monitor started · runs every ${intervalLabel(CHECK_INTERVAL_MS)}`,
  );
}
