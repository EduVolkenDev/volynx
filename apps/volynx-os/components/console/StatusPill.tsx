import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Siren,
  Unplug,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { CloudStatus } from "@/lib/console/types";
import { cn } from "@/lib/utils";

const CONFIG: Record<CloudStatus, { label: string; icon: LucideIcon; rgb: string; classes: string }> = {
  operational: {
    label: "Operational",
    icon: CheckCircle2,
    rgb: "52 211 153",
    classes: "border-emerald-400/25 text-emerald-300",
  },
  degraded: {
    label: "Degraded",
    icon: AlertTriangle,
    rgb: "251 191 36",
    classes: "border-amber-400/25 text-amber-300",
  },
  incident: {
    label: "Incident",
    icon: Siren,
    rgb: "248 113 113",
    classes: "border-red-400/25 text-red-300",
  },
  maintenance: {
    label: "Maintenance",
    icon: Wrench,
    rgb: "56 189 248",
    classes: "border-sky-400/25 text-sky-300",
  },
  unknown: {
    label: "Unknown",
    icon: CircleDashed,
    rgb: "161 161 170",
    classes: "border-zinc-400/25 text-zinc-300",
  },
  not_configured: {
    label: "Not configured",
    icon: Unplug,
    rgb: "113 113 122",
    classes: "border-dashed border-zinc-500/40 text-zinc-500",
  },
};

/**
 * Semantic status indicator (§12). Never color-only: always icon + label.
 * Unknown is visually quiet — absence of error is not health.
 * Chip shape and inset glow are visual only. Status values come from the shared contract.
 */
export function StatusPill({ status, className }: { status: CloudStatus; className?: string }) {
  const { label, icon: Icon, rgb, classes } = CONFIG[status];
  return (
    <span
      style={{ backgroundColor: `rgb(${rgb} / 46%)`, boxShadow: "0 0 7px 1px inset currentColor" }}
      className={cn(
        "console-chip inline-flex items-center gap-1.5 border text-[11px] font-semibold uppercase tracking-[0.14em]",
        classes,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}
