import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 16, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Uptime: an almost-closed availability ring with a check. */
export function UptimeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20.5 12a8.5 8.5 0 1 1-3-6.5" />
      <path d="m8.5 12.2 2.4 2.4 4.6-5" />
      <circle cx="20" cy="6.2" r="1.3" fill="currentColor" stroke="none" />
    </Icon>
  );
}

/** p95 latency: a stopwatch with speed lines. */
export function LatencyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="13" cy="13.5" r="7.5" />
      <path d="M13 9.5v4l2.6 1.6M11 2.5h4M2.5 11h3M3.5 15h2" />
    </Icon>
  );
}

/** Monitoring: a radar sweep. */
export function MonitorIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20.5 12A8.5 8.5 0 1 1 12 3.5" />
      <path d="M16.5 12A4.5 4.5 0 1 1 12 7.5" />
      <path d="m12 12 6.5-6.5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </Icon>
  );
}

/** SLA score: a target with a check. */
export function ScoreIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M21 12a9 9 0 1 1-6.2-8.56" />
      <path d="M17 12a5 5 0 1 1-3.4-4.74" />
      <path d="m15.5 5.5 1.8 1.8 3.7-3.8" />
    </Icon>
  );
}
