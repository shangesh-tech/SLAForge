import { timingSafeEqual } from "node:crypto";
import express from "express";
import { CRON_SECRET } from "./config.js";
import { ping } from "./db.js";
import { status } from "./monitor.js";
import { isRunning, tick } from "./scheduler.js";

function authorized(header = "") {
  if (!CRON_SECRET) return false;
  const expected = Buffer.from(`Bearer ${CRON_SECRET}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function createServer() {
  const app = express();
  app.disable("x-powered-by");

  app.get("/", async (_req, res) => {
    const s = await status();
    res.json({ service: "slaforge-monitor", ...s, running: isRunning() });
  });

  /** For uptime checks and load balancers: 200 when MongoDB answers and runs are recent. */
  app.get("/health", async (_req, res) => {
    try {
      await ping();
      const s = await status();
      const last = s.lastRunAt ? Date.now() - new Date(s.lastRunAt).getTime() : null;
      const fresh = last !== null && last < s.intervalMs * 2.5;
      res.status(fresh ? 200 : 503).json({ ok: fresh, mongo: true, lastRunAt: s.lastRunAt });
    } catch (e) {
      res.status(503).json({ ok: false, mongo: false, error: String(e?.message ?? e) });
    }
  });

  app.get("/status", async (_req, res) => {
    res.json({ ...(await status()), running: isRunning() });
  });

  /** Runs the monitor now. Requires `Authorization: Bearer <CRON_SECRET>`. */
  app.post("/tick", async (req, res) => {
    if (!CRON_SECRET) return res.status(404).json({ error: "Manual runs are disabled (CRON_SECRET is not set)." });
    if (!authorized(req.get("authorization"))) return res.status(401).json({ error: "Unauthorized" });
    res.json(await tick());
  });

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));
  app.use((err, _req, res, _next) => res.status(500).json({ error: String(err?.message ?? err) }));
  return app;
}
