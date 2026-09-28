import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { DataFreshness } from "./DataFreshness";
import { StatusPill } from "./StatusPill";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  NotConfiguredState,
  PendingState,
  PermissionState,
  StaleNotice,
} from "./states";
import type { CloudStatus, ModuleState, Observation } from "@/lib/console/types";
import { cn } from "@/lib/utils";

/** Plain-language guidance for a module that has nothing to show yet. */
export type ModuleGuidance = {
  title: string;
  body: string;
  action?: { label: string; href: string };
};

function Frame({
  title,
  blurb,
  action,
  status,
  observation,
  className,
  children,
}: {
  title: string;
  blurb?: string;
  action?: { label: string; href: string };
  status?: CloudStatus;
  observation?: Pick<Observation, "source" | "lastCheckedAt" | "stale">;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("console-panel", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 pb-4 pt-5 md:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-zinc-100">{title}</h3>
            {status ? <StatusPill status={status} /> : null}
          </div>
          {blurb ? (
            <p className="mt-1.5 max-w-md text-[13px] leading-6 text-zinc-500">{blurb}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3 pt-0.5">
          {observation ? <DataFreshness observation={observation} /> : null}
          {action ? (
            <a
              href={action.href}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-zinc-300 underline-offset-4 transition hover:text-white hover:underline"
            >
              {action.label}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          ) : null}
        </div>
      </header>
      <div className="px-5 pb-5 md:px-6 md:pb-6">{children}</div>
    </section>
  );
}

const DEFAULT_GUIDANCE: ModuleGuidance = {
  title: "Nothing connected here yet",
  body: "This module starts working the moment you connect its data source. Until then we show nothing rather than guess — an empty screen is more honest than a fake green light.",
};

/**
 * Standard module frame driven by the contract's ModuleState (§18).
 * Every API state has an explicit rendering — loading is the only
 * client-owned state; everything else comes back from the server.
 * The `blurb` explains the module in human words; `guidance` turns
 * empty states into orientation instead of gray walls.
 */
function asObservation(value: unknown): Observation | undefined {
  if (!value || typeof value !== "object" || !("status" in value) || !("source" in value) || !("lastCheckedAt" in value) || !("stale" in value)) return undefined;
  return value as Observation;
}

export function ModuleCard<T>({
  title,
  blurb,
  module,
  action,
  guidance = DEFAULT_GUIDANCE,
  children,
  className,
}: {
  title: string;
  /** One human sentence: what this module watches and why it matters. */
  blurb?: string;
  module: ModuleState<T>;
  action?: { label: string; href: string };
  /** Plain-language guidance shown when the module has nothing to report. */
  guidance?: ModuleGuidance;
  /** Rendered only for ready/stale. Lists do not invent aggregate status. */
  children?: (data: T) => ReactNode;
  className?: string;
}) {
  switch (module.state) {
    case "loading":
      return (
        <Frame title={title} blurb={blurb} action={action} className={className}>
          <LoadingSkeleton />
        </Frame>
      );
    case "ready":
      return (
        <Frame
          title={title}
          blurb={blurb}
          action={action}
          status={asObservation(module.data)?.status}
          observation={asObservation(module.data)}
          className={className}
        >
          {children ? children(module.data) : null}
        </Frame>
      );
    case "stale":
      return (
        <Frame
          title={title}
          blurb={blurb}
          action={action}
          status={asObservation(module.data)?.status}
          observation={asObservation(module.data)}
          className={className}
        >
          <StaleNotice />
          <div className="mt-4">{children ? children(module.data) : null}</div>
        </Frame>
      );
    case "empty":
      return (
        <Frame title={title} blurb={blurb} action={action} className={className}>
          <EmptyState
            title="We checked — there's nothing here"
            description="The source was queried and returned nothing. That's a real answer, not missing data."
            observed={{ source: module.source, lastCheckedAt: module.lastCheckedAt }}
          />
        </Frame>
      );
    case "not_configured":
      return (
        <Frame title={title} blurb={blurb} action={action} status="not_configured" className={className}>
          <NotConfiguredState
            title={guidance.title}
            description={guidance.body}
            action={guidance.action}
          />
        </Frame>
      );
    case "pending":
      return (
        <Frame title={title} blurb={blurb} action={action} className={className}>
          <PendingState
            title="No verified observation yet"
            description="We cannot confirm this module's state or configuration yet. Pending does not mean healthy."
          />
        </Frame>
      );
    case "error":
      return (
        <Frame title={title} blurb={blurb} action={action} className={className}>
          <ErrorState error={module.error} />
        </Frame>
      );
    case "forbidden":
      return (
        <Frame title={title} blurb={blurb} action={action} className={className}>
          <PermissionState />
        </Frame>
      );
  }
}
