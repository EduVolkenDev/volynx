import Link from "next/link";
import { ArrowRight, ArrowUpRight, RefreshCw } from "lucide-react";
import type { CloudOverview, ModuleState, SelectedContext } from "@/lib/console/types";
import { contextLabel, contextPath, MODULE_GUIDE } from "@/lib/console/data";
import { DataFreshness } from "./DataFreshness";
import { ModuleCard } from "./ModuleCard";
import { StatusPill } from "./StatusPill";
import { AttentionBanner } from "./states";

export const VALID_SECTIONS = new Set([
  "products", "infrastructure", "deployments", "monitoring", "backups",
  "security", "incidents", "care", "support", "settings"
]);

function Heading({ title, description, onRefresh }: { title: string; description: string; onRefresh: () => void }) {
  return <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
    <div><p className="eyebrow text-[#e3b85c]">Console</p><h1 className="font-display mt-3 text-4xl text-white md:text-5xl">{title}</h1><p className="mt-3 max-w-2xl text-[15px] leading-7 text-zinc-400">{description}</p></div>
    <button onClick={onRefresh} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-300 hover:bg-white/[0.05]"><RefreshCw className="h-4 w-4" aria-hidden />Refresh</button>
  </div>;
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : "Not observed";
}

export function OverviewContent({ ctx, overview, onRefresh }: { ctx: SelectedContext; overview: CloudOverview; onRefresh: () => void }) {
  const modules: Array<{ key: string; name: string; section: string; module: ModuleState<unknown> }> = [
    { key: "health", name: "Health", section: "monitoring", module: overview.health },
    { key: "domain", name: "Domain & SSL", section: "infrastructure", module: overview.domain },
    { key: "deployments", name: "Deployments", section: "deployments", module: overview.deployments },
    { key: "resources", name: "Resources", section: "infrastructure", module: overview.resources },
    { key: "backups", name: "Backups", section: "backups", module: overview.backups },
    { key: "security", name: "Security", section: "security", module: overview.security },
    { key: "incidents", name: "Incidents", section: "incidents", module: overview.incidents },
    { key: "care", name: "Care", section: "care", module: overview.care }
  ];
  const unverified = modules.filter(item => item.module.state === "pending" || item.module.state === "not_configured").length;
  const failures = modules.filter(item => item.module.state === "error").length;
  const verified = modules.filter(item => item.module.state === "ready" || item.module.state === "empty").length;
  return <>
    <div className="console-panel console-panel-gold px-6 py-8 md:px-10 md:py-10">
      <p className="eyebrow text-[#e3b85c]">Product overview</p>
      <h1 className="font-display mt-4 max-w-2xl text-4xl leading-[1.08] text-white md:text-5xl">
        {verified === 0 ? <>This product is <span className="text-gold-gradient">flying blind.</span></> : <>Here&apos;s what we <span className="text-gold-gradient">can verify.</span></>}
      </h1>
      <p className="mt-4 max-w-xl text-[15px] leading-7 text-zinc-400">
        {verified === 0
          ? "No verified operational picture is available yet. Pending, failed and unconfigured sources are not proof that everything is healthy."
          : "Some records are available. Check each module's source and time before treating them as current."}
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href={contextPath(ctx, "settings")} style={{ borderRadius: "21px 10px 10px 3px" }} className="inline-flex items-center gap-2 bg-[#e3b85c] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#f2d68a]">Connection status <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        <button onClick={onRefresh} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-xs text-zinc-300 hover:bg-white/[0.05]"><RefreshCw className="h-4 w-4" aria-hidden />Refresh</button>
      </div>
      <p className="tnum mt-6 text-xs uppercase tracking-[0.16em] text-zinc-500">{contextLabel(ctx)} · {overview.identity.vlxId}</p>
    </div>
    {failures > 0 && <div className="mt-6"><AttentionBanner tone="red" title={`${failures} module${failures === 1 ? "" : "s"} failed to load`} description="Other modules may still be available. Open the affected module for its reference and retry guidance." /></div>}
    {unverified > 0 && <div className="mt-6"><AttentionBanner title={`${unverified} module${unverified === 1 ? "" : "s"} without verified data`} description="Pending or unconfigured does not mean healthy. Operational claims appear only when a source provides evidence." /></div>}
    <div className="mt-6 grid gap-5 md:grid-cols-2">
      {modules.map(item => <ModuleCard key={item.key} title={item.name} module={item.module} blurb={MODULE_GUIDE[item.key].blurb} guidance={MODULE_GUIDE[item.key].guidance} action={{ label: "Details", href: contextPath(ctx, item.section) }}>
        {() => <p className="text-sm text-zinc-400">Data is available. Open the module for details and source information.</p>}
      </ModuleCard>)}
    </div>
  </>;
}

export function SectionContent({ ctx, section, overview, onRefresh }: { ctx: SelectedContext; section: string; overview: CloudOverview; onRefresh: () => void }) {
  switch (section) {
    case "products": return <>
      <Heading title="Product" description="Identity verified for this authorized client and environment." onRefresh={onRefresh} />
      <div className="console-panel p-5">
        <p className="text-lg font-semibold text-white">{overview.identity.name}</p>
        <p className="tnum mt-1 text-xs text-zinc-500">{overview.identity.vlxId}</p>
        <p className="mt-4 text-sm text-zinc-400">{overview.environment.name} · {overview.environment.kind}</p>
        {overview.identity.productionUrl && <a href={overview.identity.productionUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm text-zinc-200 underline underline-offset-4">Production URL <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /></a>}
      </div>
      <p className="mt-4 text-xs text-zinc-500">For other authorized products, use the context switcher or <Link href="/console" className="underline">catalog</Link>.</p>
    </>;
    case "infrastructure": return <>
      <Heading title="Infrastructure" description="Domains, providers and resources, with provenance when observed." onRefresh={onRefresh} />
      <div className="grid gap-4 md:grid-cols-2">
        <ModuleCard title="Domain & SSL" module={overview.domain} blurb={MODULE_GUIDE.domain.blurb} guidance={MODULE_GUIDE.domain.guidance}>{domain => <dl className="space-y-2 text-sm text-zinc-300">
          <div className="flex justify-between gap-4"><dt className="text-zinc-500">Domain</dt><dd>{domain.domain}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-zinc-500">DNS</dt><dd>{domain.dnsOk === null ? "Not observed" : domain.dnsOk ? "OK" : "Failing"}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-zinc-500">SSL issuer</dt><dd>{domain.ssl.issuer ?? "Unknown"}</dd></div>
          <DataFreshness observation={domain.ssl} />
        </dl>}</ModuleCard>
        <ModuleCard title="Resources" module={overview.resources} blurb={MODULE_GUIDE.resources.blurb} guidance={MODULE_GUIDE.resources.guidance}>{resources => <ul className="space-y-3">{resources.map(item => <li key={item.resource.id} className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-medium text-zinc-200">{item.resource.name}</span><StatusPill status={item.status} /></div>
          <p className="mt-1 text-xs text-zinc-500">{item.type} · {item.provider}</p><DataFreshness observation={item} />
        </li>)}</ul>}</ModuleCard>
      </div>
    </>;
    case "deployments": return <>
      <Heading title="Deployments" description="Release history from recorded provider events; no inferred success." onRefresh={onRefresh} />
      <ModuleCard title="History" module={overview.deployments} blurb={MODULE_GUIDE.deployments.blurb} guidance={MODULE_GUIDE.deployments.guidance}>{deployments => <ul className="divide-y divide-white/[0.07]">{deployments.map(item => <li key={item.id} className="py-3 first:pt-0 last:pb-0">
        <div className="flex flex-wrap items-center justify-between gap-3"><span className="tnum text-sm font-medium text-zinc-200">{item.source.commitSha?.slice(0, 8) ?? item.id}</span><span className="text-xs uppercase tracking-wider text-zinc-400">{item.status}</span></div>
        <p className="mt-1 text-xs text-zinc-500">Created {formatDate(item.createdAt)} · Checked {formatDate(item.lastCheckedAt)}{item.providerSource ? ` · ${item.providerSource}` : ""}</p>
        {item.error && <p className="mt-2 text-xs text-red-300">{item.error.reason} · Ref {item.error.referenceId}</p>}
      </li>)}</ul>}</ModuleCard>
    </>;
    case "monitoring": return <>
      <Heading title="Monitoring" description="Component health only when a valid source confirms it." onRefresh={onRefresh} />
      <ModuleCard title="Health" module={overview.health} blurb={MODULE_GUIDE.health.blurb} guidance={MODULE_GUIDE.health.guidance}>{health => <ul className="divide-y divide-white/[0.07]">{health.components.map(item => <li key={item.key} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
        <span className="text-sm font-medium text-zinc-200">{item.name}</span><span className="flex flex-wrap items-center gap-3"><DataFreshness observation={item} /><StatusPill status={item.status} /></span>
      </li>)}</ul>}</ModuleCard>
    </>;
    case "backups": return <>
      <Heading title="Backups" description="Recorded capability and verification; restore is not available here." onRefresh={onRefresh} />
      <ModuleCard title="Capabilities" module={overview.backups} blurb={MODULE_GUIDE.backups.blurb} guidance={MODULE_GUIDE.backups.guidance}>{backups => <ul className="divide-y divide-white/[0.07]">{backups.map(item => <li key={item.resource.id} className="py-3 first:pt-0 last:pb-0">
        <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm font-medium text-zinc-200">{item.resource.name ?? "Resource name pending"}</span><StatusPill status={item.status} /></div>
        <p className="mt-1 text-xs text-zinc-500">{item.provider} · Verification: {item.verificationStatus} · Last success: {formatDate(item.lastSuccessfulAt)}</p>
        <DataFreshness observation={item} />
      </li>)}</ul>}</ModuleCard>
      <p className="mt-4 text-xs text-zinc-500">Provider capability does not grant permission to run a restore.</p>
    </>;
    case "security": return <>
      <Heading title="Security" description="No protection badge without source, timestamp and evidence." onRefresh={onRefresh} />
      <ModuleCard title="Posture" module={overview.security} blurb={MODULE_GUIDE.security.blurb} guidance={MODULE_GUIDE.security.guidance}>{security => <ul className="divide-y divide-white/[0.07]">{security.claims.map(item => <li key={item.key} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
        <span><span className="block text-sm font-medium text-zinc-200">{item.key}</span><span className="block text-xs text-zinc-500">{item.evidence?.explanation ?? "Evidence pending"}</span></span>
        {item.evidence && item.lastEvaluatedAt ? <StatusPill status={item.state} /> : <span className="text-xs text-zinc-500">Unverified</span>}
      </li>)}</ul>}</ModuleCard>
    </>;
    case "incidents": return <>
      <Heading title="Incidents" description="Recorded incidents. No record is not proof of all clear." onRefresh={onRefresh} />
      <ModuleCard title="Incidents" module={overview.incidents} blurb={MODULE_GUIDE.incidents.blurb} guidance={MODULE_GUIDE.incidents.guidance}>{incidents => <ul className="divide-y divide-white/[0.07]">{incidents.map(item => <li key={item.id} className="py-3 first:pt-0 last:pb-0">
        <p className="text-sm font-medium text-zinc-200">{item.title}</p><p className="mt-1 text-xs text-zinc-500">{item.severity} · {item.status} · Started {formatDate(item.startedAt)}</p>
        {item.updates === null && <p className="mt-1 text-xs text-zinc-600">Timeline updates not available yet.</p>}
      </li>)}</ul>}</ModuleCard>
    </>;
    case "care": return <>
      <Heading title="Care" description="Contracted plan details only; no inferred SLA or benefits." onRefresh={onRefresh} />
      <ModuleCard title="Current plan" module={overview.care} blurb={MODULE_GUIDE.care.blurb} guidance={MODULE_GUIDE.care.guidance}>{plan => <div className="text-sm text-zinc-300">
        <p className="font-medium text-white">{plan.name} · {plan.tier}</p>
        {plan.includes === null ? <p className="mt-2 text-xs text-zinc-500">Included services not available yet.</p> : <ul className="mt-2 list-disc pl-5">{plan.includes.map(item => <li key={item}>{item}</li>)}</ul>}
        {plan.slaHours !== null && <p className="mt-2 text-xs text-zinc-500">Contracted SLA: {plan.slaHours} hours</p>}
        {plan.supportChannel?.url && <a className="mt-3 inline-block underline" href={plan.supportChannel.url}>{plan.supportChannel.label}</a>}
      </div>}</ModuleCard>
    </>;
    case "support": return <>
      <Heading title="Support" description="Requests are unavailable until the ticket API and audit trail are connected." onRefresh={onRefresh} />
      <AttentionBanner title="Ticket submission is not available" description="Nothing entered here can be sent yet. Contact your Volynx operator through an established channel." />
      <fieldset disabled className="console-panel mt-4 space-y-4 p-5 opacity-60">
        <label className="block text-sm text-zinc-300">Subject<input className="mt-1 block w-full rounded-lg border border-white/10 bg-black/30 p-2.5" placeholder="Request subject" /></label>
        <label className="block text-sm text-zinc-300">Details<textarea className="mt-1 block w-full rounded-lg border border-white/10 bg-black/30 p-2.5" rows={4} /></label>
        <button type="button" className="rounded-lg bg-white px-4 py-2 text-sm text-black">Submit request</button>
      </fieldset>
    </>;
    case "settings": return <>
      <Heading title="Settings" description="Connection status and the boundary for future operational controls." onRefresh={onRefresh} />
      <section className="console-panel mb-4 p-5">
        <h2 className="text-sm font-semibold text-white">Connection status</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Provider setup is not available in this version. These are the states reported by the API; pending does not confirm a connection.</p>
        <ul className="mt-4 grid gap-2 text-xs text-zinc-300 sm:grid-cols-2">
          {([
            ["Health", overview.health.state], ["Domain & SSL", overview.domain.state],
            ["Deployments", overview.deployments.state], ["Resources", overview.resources.state],
            ["Backups", overview.backups.state], ["Security", overview.security.state],
            ["Incidents", overview.incidents.state], ["Care", overview.care.state]
          ] as const).map(([name, state]) => <li key={name} className="flex justify-between gap-3 rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2.5"><span>{name}</span><span className="tnum uppercase text-zinc-500">{state.replace(/_/g, " ")}</span></li>)}
        </ul>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><h2 className="text-sm font-semibold text-white">Notifications</h2><p className="mt-2 text-sm text-zinc-400">Preferences are not available until a delivery provider and settings API are connected.</p></div>
        <div className="rounded-2xl border border-red-400/15 bg-white/[0.025] p-5"><h2 className="text-sm font-semibold text-white">Danger zone</h2><p className="mt-2 text-sm text-zinc-400">Restore, credential rotation and deletion remain disabled until permission checks, confirmation and audit exist.</p></div>
      </div>
    </>;
    default: return null;
  }
}
