"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowRight, Download, FileText, LockKeyhole, Mail, ShieldCheck } from "lucide-react"
import { DeliveryTrustStrip } from "@/components/common/delivery-trust-strip"
import {
  getPropertyFlowTier,
  propertyFlowDeliveryFeatures,
  propertyFlowDocs,
  propertyFlowTierRank,
  isPropertyFlowDocTierAllowed,
  propertyFlowVersion,
  type PropertyFlowTierId
} from "@/content/propertyflow"
import { supportEmail } from "@/content/legal-pages"
import { cn } from "@/lib/utils"
import { getPropertyFlowPublicUrl } from "@/lib/volynx-public"

type DownloadEvent = {
  timestamp: string
  tier: string
  version: string
  mode: "stripe" | "preview"
}

type Entitlement = {
  mode: "stripe" | "preview"
  tier: PropertyFlowTierId
  tierName: string
  filename: string
  bytes: number
  version: string
  customerEmail: string | null
}

const storageKey = "propertyflow-download-history"
const pendingCheckoutKey = "propertyflow-pending-checkout"
const propertyFlowPublicHref = getPropertyFlowPublicUrl()

type PendingCheckout = {
  sessionId?: string
  tier?: string
  createdAt?: string
}

function formatBytes(bytes: number | undefined) {
  if (!bytes) {
    return "Verifying size"
  }

  const kb = bytes / 1024

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`
  }

  return `${(kb / 1024).toFixed(1)} MB`
}

function getAccessState(search: URLSearchParams) {
  const preview = search.get("preview") === "1"
  const sessionId = search.get("session_id") ?? ""

  if (preview) {
    return {
      allowed: true,
      label: "Preview fallback active",
      copy: "Local preview delivery is active. Production downloads still require a paid Stripe Checkout session."
    }
  }

  if (sessionId.startsWith("cs_")) {
    return {
      allowed: true,
      label: "Stripe checkout session detected",
      copy: "The server verifies payment status, amount, currency and tier before issuing the ZIP."
    }
  }

  return {
    allowed: false,
    label: "Purchase token required",
    copy: "Delivery is guarded. Complete checkout first, then return here with the Stripe session ID."
  }
}

export function PropertyFlowDeliveryClient() {
  const [tierId, setTierId] = useState<PropertyFlowTierId>("white-label")
  const [access, setAccess] = useState(getAccessState(new URLSearchParams()))
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null)
  const [history, setHistory] = useState<DownloadEvent[]>([])
  const [status, setStatus] = useState("Ready")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)

  const tier = getPropertyFlowTier(tierId)
  const rank = propertyFlowTierRank[tier.id]
  const filename = entitlement?.filename ?? tier.downloadFile

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    const nextPreview = search.get("preview") === "1"
    let nextSessionId = search.get("session_id")
    let pendingTier: string | undefined

    if (!nextSessionId && !nextPreview) {
      try {
        const rawPending = window.localStorage.getItem(pendingCheckoutKey)
        const pending = rawPending ? JSON.parse(rawPending) as PendingCheckout : null

        if (pending?.sessionId?.startsWith("cs_")) {
          nextSessionId = pending.sessionId
          pendingTier = pending.tier
        }
      } catch {
        // Pending checkout recovery is best-effort only.
      }
    }

    const nextTier = getPropertyFlowTier(search.get("tier") ?? pendingTier).id
    const accessSearch = new URLSearchParams(search)

    if (!accessSearch.get("session_id") && nextSessionId) {
      accessSearch.set("session_id", nextSessionId)
    }

    setTierId(nextTier)
    setAccess(getAccessState(accessSearch))
    setPreview(nextPreview)
    setSessionId(nextSessionId)

    const entitlementUrl = nextPreview
      ? `/api/downloads/propertyflow/entitlement?preview=1&tier=${nextTier}`
      : nextSessionId
        ? `/api/downloads/propertyflow/entitlement?session_id=${encodeURIComponent(nextSessionId)}`
        : null

    if (entitlementUrl) {
      setStatus("Verifying delivery access...")
      fetch(entitlementUrl)
        .then(async (response) => {
          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error ?? "Delivery access could not be verified.")
          }

          return data as Entitlement
        })
        .then((data) => {
          setEntitlement(data)
          setTierId(data.tier)
          setStatus("Verified")
        })
        .catch((error) => {
          setStatus(error instanceof Error ? error.message : "Delivery access could not be verified.")
          setAccess({
            allowed: false,
            label: "Delivery blocked",
            copy: "The server could not verify a paid Stripe Checkout session for this download."
          })
        })
    }

    try {
      const raw = window.localStorage.getItem(storageKey)
      setHistory(raw ? JSON.parse(raw).slice(0, 10) : [])
    } catch {
      setHistory([])
    }
  }, [])

  const visibleDocs = useMemo(
    () => propertyFlowDocs.filter((doc) => isPropertyFlowDocTierAllowed(tier.id, doc.tier)),
    [tier.id]
  )
  const docQueryString = useMemo(() => {
    const params = new URLSearchParams()

    if (preview) {
      params.set("preview", "1")
      params.set("tier", tier.id)
    } else if (sessionId) {
      params.set("session_id", sessionId)
      params.set("tier", tier.id)
    }

    const query = params.toString()

    return query ? `?${query}` : ""
  }, [preview, sessionId, tier.id])

  const recordDownload = useCallback(
    (mode: DownloadEvent["mode"]) => {
      const event: DownloadEvent = {
        timestamp: new Date().toISOString(),
        tier: tier.name,
        version: entitlement?.version ?? propertyFlowVersion,
        mode
      }
      const nextHistory = [event, ...history].slice(0, 10)
      setHistory(nextHistory)

      try {
        window.localStorage.setItem(storageKey, JSON.stringify(nextHistory))
      } catch {
        // Local history is a convenience only.
      }
    },
    [entitlement?.version, history, tier.name]
  )

  const handleDownload = useCallback(async () => {
    if (!access.allowed) {
      setStatus("Blocked by delivery guard")
      return
    }

    setStatus("Requesting protected download...")

    try {
      const response = await fetch("/api/downloads/propertyflow", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId,
          tier: tier.id,
          preview
        })
      })

      if (!response.ok) {
        throw new Error("Download API unavailable")
      }

      const data = await response.json() as { url?: string }

      if (!data.url) {
        throw new Error("Download API did not return a URL")
      }

      setStatus("Protected download issued")
      recordDownload(preview ? "preview" : "stripe")
      window.location.assign(data.url)
    } catch {
      setStatus("Protected download failed. Check Stripe session or server logs.")
    }
  }, [access.allowed, preview, recordDownload, sessionId, tier.id])

  return (
    <div className="container-shell py-12 md:py-16">
      <nav className="mb-10 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
        <a href="/" className="transition hover:text-white">Home</a>
        <span>/</span>
        <a href="/dashboard/purchases" className="transition hover:text-white">Purchases</a>
        <span>/</span>
        <a href={propertyFlowPublicHref} className="transition hover:text-white">PropertyFlow</a>
        <span>/</span>
        <span className="text-zinc-300">{tier.name} delivery</span>
      </nav>

      <section className="border-b border-white/5 pb-10">
        <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">
          <ShieldCheck className="h-4 w-4" />
          {access.label}
        </div>
        <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-[-0.06em] text-white md:text-7xl">
          Your PropertyFlow kit is ready.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
          Everything needed for the {tier.name} tier: tier README, commercial license, docs, public assets and
          protected ZIP delivery. The server checks the Stripe session before opening the pack.
        </p>
      </section>

      <DeliveryTrustStrip productName="PropertyFlow" className="py-8" />

      <section className="grid gap-5 py-10 md:grid-cols-4">
        {[
          ["Tier", tier.name],
          ["Version", propertyFlowVersion],
          ["License", tier.note],
          ["Support", tier.supportWindow]
        ].map(([label, value]) => (
          <div key={label} className="surface p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</p>
            <p className="mt-3 text-base font-medium text-white">{value}</p>
          </div>
        ))}
      </section>

      <section className="surface grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Primary download</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">PropertyFlow source package</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{filename} · {formatBytes(entitlement?.bytes)} · {status}</p>
          <p className="mt-3 text-xs leading-5 text-amber-200/80">{access.copy}</p>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={!access.allowed}
          className={cn("button-primary w-full md:w-auto", !access.allowed && "cursor-not-allowed opacity-45")}
        >
          Download ZIP <Download className="ml-2 h-4 w-4" />
        </button>
      </section>

      {!access.allowed ? (
        <div className="mt-5 rounded-lg border border-amber-300/20 bg-amber-300/10 p-5 text-sm leading-7 text-amber-100/90">
          No public download was opened. Complete checkout, or open{" "}
          <a href={`/dashboard/purchases/propertyflow?tier=${tier.id}&preview=1`} className="underline">
            local preview mode
          </a>{" "}
          while testing in development.
        </div>
      ) : null}

      <section className="section-space">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="eyebrow">What is inside</span>
            <h2 className="section-title">{tier.subtitle}</h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-zinc-500">
            Higher-tier features stay visible as locked upgrade signals when the buyer is on a lower tier.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {propertyFlowDeliveryFeatures.map((feature) => {
            const locked = rank < propertyFlowTierRank[feature.minTier]

            return (
              <article key={feature.title} className={cn("surface p-5", locked && "opacity-45")}>
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                  {locked ? <LockKeyhole className="h-4 w-4 text-zinc-500" /> : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{feature.description}</p>
                {locked ? (
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-zinc-500">Upgrade required</p>
                ) : null}
              </article>
            )
          })}
        </div>
      </section>

      <section className="section-space border-y border-white/5">
        <div className="mb-8">
          <span className="eyebrow">Docs</span>
          <h2 className="section-title">Tier-specific operating docs.</h2>
        </div>
        {access.allowed ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleDocs.map((doc) => (
              <a
                key={doc.slug}
                href={`/dashboard/purchases/propertyflow/docs/${doc.slug}${docQueryString}`}
                className="surface block p-5 transition hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-4">
                  <FileText className="h-5 w-5 text-zinc-400" />
                  <span className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-zinc-500">{doc.tier}</span>
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-white">{doc.title}</h3>
                <p className="mt-3 inline-flex items-center text-sm text-zinc-400">
                  Open guide <ArrowRight className="ml-2 h-4 w-4" />
                </p>
              </a>
            ))}
          </div>
        ) : (
          <div className="surface p-6 text-sm leading-7 text-zinc-400">
            Docs unlock after checkout verification. Open this page from a paid Stripe return URL, or use preview mode while
            testing locally.
          </div>
        )}
      </section>

      <section className="section-space grid gap-5 lg:grid-cols-[1fr_0.8fr] lg:items-start">
        <div className="surface p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Previous local downloads</p>
          <div className="mt-5 grid gap-3">
            {history.length ? history.map((item) => (
              <div key={`${item.timestamp}-${item.mode}`} className="flex flex-wrap justify-between gap-3 border-b border-white/5 pb-3 text-sm text-zinc-400 last:border-b-0 last:pb-0">
                <span>{new Date(item.timestamp).toLocaleString()} · {item.tier}</span>
                <span>{item.version} · {item.mode}</span>
              </div>
            )) : (
              <p className="text-sm text-zinc-500">No local download events in this browser yet.</p>
            )}
          </div>
        </div>
        <div className="surface p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Support</p>
          <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">
            Reply to the delivery email or contact Volynx.
          </h3>
          <p className="mt-3 text-sm leading-7 text-zinc-400">
            Include the Stripe session ID and tier so support can route it fast. White-Label buyers use the priority email queue.
          </p>
          <a href={`mailto:${supportEmail}?subject=PropertyFlow%20support`} className="button-secondary mt-6 w-full md:w-auto">
            Email support <Mail className="ml-2 h-4 w-4" />
          </a>
        </div>
      </section>
    </div>
  )
}
