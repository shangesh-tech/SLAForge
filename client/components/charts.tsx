"use client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { history } from "@/data/showcase";
export function PerformanceChart({
  type = "latency",
  failed = false,
  compact = false,
  target,
}: {
  type?: "latency" | "uptime";
  failed?: boolean;
  compact?: boolean;
  target?: number;
}) {
  const data = history.map((h, i) => ({
    ...h,
    latency: failed ? 310 + ((i * 43) % 190) : h.latency,
    uptime: failed ? 98.1 + (i % 4) * 0.18 : h.uptime,
  }));
  const color = type === "uptime" ? "#20866d" : "#4b6fa8";
  const gradientId = `chart-${type}-${compact ? "mini" : "full"}`;
  return (
    <div
      className={`chart ${compact ? "compact" : ""}`}
      role="img"
      aria-label={`${type === "uptime" ? "Uptime percentage" : "P95 latency in milliseconds"} over the last 24 hours, simulated data`}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart
          data={data}
          margin={{ top: 16, right: 12, left: compact ? -36 : -15, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="#e8ecf1"
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="time"
            tickLine={false}
            axisLine={false}
            minTickGap={48}
            tick={{ fill: "#8b94a5", fontSize: 10 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            domain={
              type === "uptime"
                ? [failed ? 97.8 : 99.7, 100]
                : [0, failed ? 600 : Math.max(240, target ?? 200)]
            }
            tick={{ fill: "#8b94a5", fontSize: 10 }}
            tickFormatter={(v) =>
              type === "uptime" ? `${Number(v).toFixed(1)}` : `${v}`
            }
          />
          <Tooltip
            contentStyle={{
              border: "1px solid #e1e5ec",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [
              `${Number(value).toFixed(type === "uptime" ? 2 : 0)}${type === "uptime" ? "%" : " ms"}`,
              type === "uptime" ? "Uptime" : "p95 latency",
            ]}
          />
          {target !== undefined && (
            <ReferenceLine
              y={target}
              stroke="#ca9775"
              strokeDasharray="4 4"
              label={{
                value: "SLA target",
                position: "insideTopRight",
                fill: "#ab7753",
                fontSize: 10,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey={type}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
