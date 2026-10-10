import { INTERVAL_MS } from "./config.js";
import { runTick } from "./monitor.js";
import { log, logError } from "./log.js";

let timer = null;
let current = null;

const label = (ms) => (ms % 60_000 === 0 ? `${ms / 60_000} min` : `${ms / 1000} sec`);

/** Runs the monitor once, unless a run is already going (e.g. waiting for a settlement tx). */
export async function tick() {
  if (current) return { skipped: "A run is already in progress on this host." };
  current = runTick()
    .then((r) => {
      if (r.checked || r.settled || r.errors.length || (r.skipped && !/in progress/.test(r.skipped)))
        log(
          `checked ${r.checked} service(s), settled ${r.settled}` +
            (r.skipped ? ` · ${r.skipped}` : "") +
            (r.errors.length ? ` · errors: ${r.errors.join("; ")}` : ""),
        );
      return r;
    })
    .catch((e) => {
      logError("run failed:", e?.message ?? e);
      return { ok: false, errors: [String(e?.message ?? e)] };
    })
    .finally(() => {
      current = null;
    });
  return current;
}

export const isRunning = () => current !== null;

export function start() {
  if (timer) return;
  setTimeout(tick, 3_000);
  timer = setInterval(tick, INTERVAL_MS);
  log(`SLA monitor started · runs every ${label(INTERVAL_MS)}`);
}

/** Stops scheduling and waits for a run in progress to finish. */
export async function stop() {
  clearInterval(timer);
  timer = null;
  await current;
}
