import type { ReactNode } from "react";
import { AlertOctagon, ArrowRight, Hourglass, Inbox, Lock, Unplug } from "lucide-react";
import { DataFreshness } from "./DataFreshness";
import type { OperationError } from "@/lib/console/types";
import { cn } from "@/lib/utils";

/* ---------------------------------- Empty ---------------------------------- */

/**
 * The API checked and found nothing (ModuleState 'empty').
 * Provenance is required: when it was checked and by which source.
 */
export function EmptyState({
  title,
  description,
  observed,
  action,
  className,
}: {
  title: string;
  description: string;
  observed: { source: string; lastCheckedAt: string };
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
        <Inbox className="h-5 w-5 text-zinc-500" aria-hidden />
      </span>
      <p className="font-display mt-4 text-xl text-zinc-100">{title}</p>
      <p className="mt-2 max-w-sm text-[13px] leading-6 text-zinc-500">{description}</p>
      <DataFreshness className="mt-3" observation={{ ...observed, stale: false }} />
      {action ? (
        <a
          href={action.href}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[13px] font-medium text-zinc-200 transition hover:bg-white/[0.08]"
        >
          {action.label}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}

/* ------------------------------ Not configured ----------------------------- */

/** No provider wired yet. Honest about the absence — never a fake "everything is fine". */
export function NotConfiguredState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: { label: string; href: string };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-[#e3b85c]/40 bg-[#e3b85c]/[0.06]">
        <Unplug className="h-5 w-5 text-[#e3b85c]" aria-hidden />
      </span>
      <p className="font-display mt-4 text-xl text-zinc-100">{title}</p>
      <p className="mt-2 max-w-sm text-[13px] leading-6 text-zinc-500">{description}</p>
      {action ? (
        <a
          href={action.href}
          style={{ borderRadius: "21px 10px 10px 3px" }}
          className="mt-5 inline-flex items-center gap-1.5 bg-[#e3b85c] px-4 py-2 text-[13px] font-semibold text-black transition hover:bg-[#f2d68a]"
        >
          {action.label}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}

/* --------------------------------- Pending --------------------------------- */

/** No verified observation yet; configuration itself may also be unknown. */
export function PendingState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
        <Hourglass className="h-5 w-5 text-zinc-500" aria-hidden />
      </span>
      <p className="mt-4 text-sm font-semibold text-zinc-200">{title}</p>
      <p className="mt-1.5 max-w-sm text-[13px] leading-6 text-zinc-500">{description}</p>
    </div>
  );
}

/* --------------------------------- Loading --------------------------------- */

export function LoadingSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5 px-1 py-2", className)} aria-label="Loading" role="status">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="console-skeleton h-4 rounded-md"
          style={{ width: `${92 - i * 14}%` }}
        />
      ))}
    </div>
  );
}

/* ---------------------------------- Error ---------------------------------- */

/**
 * Explicit failure, never a disappearing spinner (§13).
 * Renders the contract's OperationError: server-owned safe text, code, reference.
 */
export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: OperationError;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-red-400/20 bg-red-400/[0.06] p-4", className)} role="alert">
      <div className="flex items-start gap-3">
        <AlertOctagon className="mt-0.5 h-5 w-5 shrink-0 text-red-300" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-red-200">Something failed</p>
          <p className="mt-1 text-[13px] leading-6 text-red-200/70">{error.reason}</p>
          <p className="tnum mt-2 text-[11px] uppercase tracking-[0.14em] text-red-200/40">
            {error.code} · {new Date(error.at).toLocaleString()} · Ref {error.referenceId}
          </p>
          <p className="mt-1 text-[12px] text-red-200/50">
            {error.retryable ? "This may work if you try again." : "This needs an operator — retrying won't help."}
          </p>
          {onRetry && error.retryable ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-lg border border-red-300/25 px-3 py-1.5 text-[13px] font-medium text-red-200 transition hover:bg-red-400/10"
            >
              Retry
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Permission -------------------------------- */

/** Server-enforced denial (ModuleState 'forbidden'). Access is decided by the API, not hidden by CSS. */
export function PermissionState({ who = "your Volynx operator" }: { who?: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
        <Lock className="h-5 w-5 text-zinc-500" aria-hidden />
      </span>
      <p className="mt-4 text-sm font-semibold text-zinc-200">You don&apos;t have access to this area</p>
      <p className="mt-1.5 max-w-sm text-[13px] leading-6 text-zinc-500">
        Access is controlled on the server, not just hidden in the interface. Ask {who} to grant it.
      </p>
    </div>
  );
}

/* --------------------------------- Banner ---------------------------------- */

export function AttentionBanner({
  tone = "amber",
  title,
  description,
  action,
}: {
  tone?: "amber" | "red";
  title: string;
  description?: string;
  action?: { label: string; href: string };
}) {
  const tones = {
    amber: "border-amber-400/25 bg-amber-400/[0.07]",
    red: "border-red-400/25 bg-red-400/[0.07]",
  } as const;
  return (
    <div className={cn("flex items-center justify-between gap-4 rounded-xl border px-4 py-3", tones[tone])} role="alert">
      <div>
        <p className="text-sm font-semibold text-zinc-100">{title}</p>
        {description ? <p className="mt-0.5 text-[13px] text-zinc-400">{description}</p> : null}
      </div>
      {action ? (
        <a
          href={action.href}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.05] px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-white/[0.1]"
        >
          {action.label}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </a>
      ) : null}
    </div>
  );
}

/* ------------------------------ Stale notice ------------------------------ */

export function StaleNotice({ children }: { children?: ReactNode }) {
  return (
    <p className="rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-[12px] leading-5 text-amber-200/80">
      {children ?? "This data is stale — the last check is older than expected. Treat it as a hint, not the truth."}
    </p>
  );
}
