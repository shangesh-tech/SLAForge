/** 24-hour p95 trend for the landing page showcase chart. */
export const history = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2, "0")}:00`,
  uptime: i === 8 ? 99.82 : 99.96 + (i % 4) * 0.01,
  latency: 112 + ((i * 37) % 64),
}));
