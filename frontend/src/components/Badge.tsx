const COLORS = {
  green: "#34e0a1",
  amber: "#ffb84d",
  blue: "#7c9bff",
  red: "#ff5c7a",
  gray: "#94a3b8",
};

const TONE: Record<string, keyof typeof COLORS> = {
  // decisions
  allowed: "green",
  approved_executed: "green",
  denied: "red",
  rate_limited: "amber",
  pending_approval: "blue",
  approved_failed: "red",
  rejected: "red",
  upstream_error: "red",
  error: "red",
  // approval + agent + run status
  pending: "blue",
  executed: "green",
  failed: "red",
  expired: "gray",
  active: "green",
  revoked: "red",
  queued: "gray",
  running: "blue",
  completed: "green",
  // risk
  low: "green",
  medium: "amber",
  high: "red",
};

export default function Badge({ value }: { value: string }) {
  const c = COLORS[TONE[value] ?? "gray"];
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={{
        color: c,
        borderColor: `color-mix(in srgb, ${c} 40%, transparent)`,
        background: `color-mix(in srgb, ${c} 12%, transparent)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c, boxShadow: `0 0 8px ${c}` }} aria-hidden />
      {value.replace(/_/g, " ")}
    </span>
  );
}