import type { Observation } from "@/lib/console/types";
import { cn } from "@/lib/utils";

/** "2 minutes ago" style relative time; falls back to absolute for old dates. */
function relative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  if (Number.isNaN(then) || diff < 0) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleString();
}

export type FreshnessInput = Pick<Observation, "source" | "lastCheckedAt" | "stale">;

/**
 * Provenance chip for every operational datum (§17).
 * Renders directly from the contract's Observation fields.
 * No timestamp = no claim of liveness: renders "No data source".
 */
export function DataFreshness({ observation, className }: { observation: FreshnessInput; className?: string }) {
  const { lastCheckedAt, source, stale } = observation;
  if (!lastCheckedAt) {
    return (
      <span className={cn("text-[11px] uppercase tracking-[0.14em] text-zinc-600", className)}>
        No data source
      </span>
    );
  }
  return (
    <span className={cn("text-[11px] uppercase tracking-[0.14em] text-zinc-500", className)} title={new Date(lastCheckedAt).toLocaleString()}>
      Last checked {relative(lastCheckedAt)}
      {source ? ` · ${source}` : ""}
      {stale ? " · stale" : ""}
    </span>
  );
}
