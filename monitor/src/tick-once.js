// Runs the monitor once and exits: `npm run tick` (handy for testing or a system cron).
import { close } from "./db.js";
import { runTick } from "./monitor.js";

const result = await runTick();
console.log(JSON.stringify(result, null, 2));
await close();
process.exit(result.ok ? 0 : 1);
