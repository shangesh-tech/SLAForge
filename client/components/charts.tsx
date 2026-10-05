"use client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from "recharts";
import { history } from "@/data/mock";
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
export function VolumeChart() {
  return (
    <div
      className="chart"
      role="img"
      aria-label="Simulated payment volume over seven months"
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart
          data={[
            { month: "Apr", volume: 1200 },
            { month: "May", volume: 2400 },
            { month: "Jun", volume: 1900 },
            { month: "Jul", volume: 3800 },
            { month: "Aug", volume: 3100 },
            { month: "Sep", volume: 5400 },
            { month: "Oct", volume: 6250 },
          ]}
          margin={{ left: -15, right: 10, top: 12 }}
        >
          <CartesianGrid vertical={false} stroke="#edf0f5" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#8b94a5", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#8b94a5", fontSize: 10 }}
            tickFormatter={(v) => `${v / 1000}k`}
          />
          <Tooltip formatter={(v) => [`${v} USDC`, "Volume"]} />
          <Area dataKey="volume" fill="#eaf1fb" stroke="none" />
          <Line
            type="monotone"
            dataKey="volume"
            stroke="#547aaa"
            strokeWidth={2}
            dot={{ r: 4, fill: "#fff" }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
