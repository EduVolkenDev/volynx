import Link from "next/link";
import { DataFreshness } from "@/components/console/DataFreshness";
import { ModuleCard } from "@/components/console/ModuleCard";
import { StatusPill } from "@/components/console/StatusPill";
import { AttentionBanner, PermissionState } from "@/components/console/states";
import { CLOUD_STATUS_VALUES } from "@/lib/console/types";
import type {
  CloudStatus,
  DeploymentListData,
  ModuleState,
  Observation,
  OperationError,
  ProductHealth,
} from "@/lib/console/types";

const SAMPLE_AT = "2026-09-28T03:00:00.000Z";
/** Fixed illustrative timestamps — module-level so render stays pure. */
function sampleAgo(minutes: number): string {
  return new Date(new Date(SAMPLE_AT).getTime() - minutes * 60000).toISOString();
}

const sampleObservation = (status: CloudStatus, minutesAgo: number | null, source: string | null): Observation => ({
  status,
  source,
  lastCheckedAt: minutesAgo === null ? null : sampleAgo(minutesAgo),
  stale: false,
});

const sampleError = (code: OperationError["code"], retryable: boolean): OperationError => ({
  code,
  reason: "Sample failure: build step failed because STRIPE_SECRET_KEY was not set in the environment.",
  at: sampleAgo(9),
  referenceId: "dpl_8f3ka2",
  retryable,
});

const readyHealth: ModuleState<ProductHealth> = {
  state: "ready",
  data: {
    status: "degraded",
    source: "uptime-check",
    lastCheckedAt: sampleAgo(5),
    stale: false,
    productId: "00000000-0000-0000-0000-000000000000",
    environmentId: "00000000-0000-0000-0000-000000000001",
    components: [
      { key: "app", name: "Application", ...sampleObservation("operational", 2, "uptime-check") },
      { key: "db", name: "Database", ...sampleObservation("operational", 2, "supabase") },
      { key: "storage", name: "Storage", ...sampleObservation("degraded", 5, "uptime-check") },
    ],
    activeIncidentIds: [],
  },
};

const staleDeployments: ModuleState<DeploymentListData> = {
  state: "stale",
  data: {
    ...sampleObservation("unknown", 47, "github"),
    stale: true,
    deployments: [
      {
        id: "dpl_8f3ka2",
        status: "failed",
        source: { repo: "volynx-os", commitSha: "8f3ka2c", branch: "main", author: "edu" },
        createdAt: sampleAgo(50),
        durationMs: 182000,
        triggeredBy: "push",
        lastCheckedAt: sampleAgo(47),
        providerSource: "github",
        error: sampleError("operation_failed", false),
      },
    ],
  },
  error: null,
};

/**
 * Component gallery — ILLUSTRATIVE ONLY. Every state below is sample data for
 * design review, explicitly NOT real operational data (§3). Not linked in the
 * console navigation; reachable directly for review.
 */
export default function ConsolePreviewPage() {
  return (
    <div className="console-root min-h-screen bg-[#070807] px-4 py-10 text-zinc-100">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <AttentionBanner
          tone="red"
          title="UI Preview — illustrative states, not real data"
          description="Everything on this page is sample content for design review. The real console never invents statuses."
        />

        <section className="console-panel console-panel-gold px-6 py-8 md:px-10 md:py-10" aria-label="Sample product overview">
          <p className="eyebrow text-[#e3b85c]">Product overview · sample</p>
          <h1 className="font-display mt-4 max-w-2xl text-4xl leading-[1.08] text-white md:text-5xl">
            This product is <span className="text-gold-gradient">flying blind.</span>
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-zinc-400">
            No verified operational picture is available yet. Pending and unconfigured sources are not proof that everything is healthy.
          </p>
          <span style={{ borderRadius: "21px 10px 10px 3px" }} className="mt-6 inline-flex bg-[#e3b85c] px-5 py-2.5 text-sm font-semibold text-black">Connection status · preview</span>
        </section>

        <section>
          <p className="eyebrow mb-3 text-[#e3b85c]">Contract</p>
          <h2 className="font-display mb-5 text-2xl text-white">Status scale <span className="text-zinc-500 text-lg">(CLOUD_STATUS_VALUES)</span></h2>
          <div className="flex flex-wrap gap-2">
            {CLOUD_STATUS_VALUES.map((s) => (
              <StatusPill key={s} status={s} />
            ))}
          </div>
        </section>

        <section>
          <p className="eyebrow mb-3 text-[#e3b85c]">Design gallery</p>
          <h2 className="font-display mb-8 text-3xl text-white">Module states — the contract&apos;s ModuleState union</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <ModuleCard
              title="Health (sample: ready → degraded)"
              module={readyHealth}
              blurb="Is the product alive? Watches the app, database and storage — and says so in plain words."
              action={{ label: "Details", href: "#" }}
            >
              {(data) => (
                <ul>
                  {data.components.map((c) => (
                    <li key={c.key} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                      <span className="text-zinc-300">{c.name}</span>
                      <StatusPill status={c.status} />
                    </li>
                  ))}
                </ul>
              )}
            </ModuleCard>

            <ModuleCard
              title="Deployments (sample: stale)"
              module={staleDeployments}
              blurb="What shipped, when, and whether it worked. Every release, with its story."
            />

            <ModuleCard
              title="Backups (sample: empty)"
              module={{ state: "empty", source: "supabase", lastCheckedAt: sampleAgo(12) }}
              blurb="If everything broke tomorrow, could you come back? That's what this answers."
            />

            <ModuleCard
              title="Domain & SSL (sample: not_configured)"
              module={{ state: "not_configured", data: null }}
              blurb="Can customers reach you? Tracks your domain, DNS and certificate expiry."
              guidance={{
                title: "No domain connected",
                body: "Point a domain at this product and we'll watch it for you: DNS resolving, certificate valid, CDN in front. One glance tells you if the front door is open.",
                action: { label: "Connect a domain", href: "#" },
              }}
            />

            <ModuleCard
              title="Care plan (sample: pending)"
              module={{ state: "pending", data: null }}
              blurb="Who keeps this product healthy day to day — and what they're responsible for."
            />

            <ModuleCard
              title="Security (sample: loading)"
              module={{ state: "loading" }}
              blurb="Are the doors locked? Every protection claim shown with its evidence."
            />

            <ModuleCard
              title="Incidents (sample: error, retryable)"
              module={{ state: "error", data: null, error: sampleError("provider_unavailable", true) }}
              blurb="When something breaks, this is the timeline. What happened, what's being done."
            />

            <ModuleCard
              title="Support (sample: forbidden)"
              module={{ state: "forbidden", data: null, error: sampleError("permission_denied", false) }}
              blurb="Talk to the humans who keep your product alive."
            />
          </div>
        </section>

        <section>
          <p className="eyebrow mb-3 text-[#e3b85c]">Feedback</p>
          <h2 className="font-display mb-5 text-2xl text-white">Banners & permission</h2>
          <div className="space-y-4">
            <AttentionBanner
              tone="amber"
              title="2 deployments need attention"
              description="Sample scenario: one failed, one is still queued."
              action={{ label: "View deployments", href: "#" }}
            />
            <div className="rounded-2xl border border-white/10 bg-white/[0.025]">
              <PermissionState />
            </div>
          </div>
        </section>

        <section>
          <p className="eyebrow mb-3 text-[#e3b85c]">Provenance</p>
          <h2 className="font-display mb-5 text-2xl text-white">Freshness chips</h2>
          <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <DataFreshness observation={sampleObservation("operational", 2, "cloudflare-api")} />
            <DataFreshness observation={{ ...sampleObservation("unknown", 180, "supabase"), stale: true }} />
            <DataFreshness observation={sampleObservation("unknown", null, null)} />
          </div>
        </section>

        <p className="border-t border-white/[0.07] pt-6 text-[13px] leading-6 text-zinc-600">
          End of preview. Real console routes live under{" "}
          <Link href="/console" className="underline underline-offset-4">/console</Link> and require
          an authenticated context; each module reports the state returned by its source.
        </p>
      </div>
    </div>
  );
}
