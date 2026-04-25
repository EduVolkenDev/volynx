"use client"

import { useCallback, useEffect, useState } from "react"
import { Download, Image as ImageIcon, Mail, ShieldCheck } from "lucide-react"
import { DeliveryTrustStrip } from "@/components/common/delivery-trust-strip"
import { supportEmail } from "@/content/legal-pages"
import { cn } from "@/lib/utils"

type Entitlement = {
  mode: "stripe" | "preview"
  pack: string
  packName: string
  filename: string
  bytes: number
  files: number
  customerEmail: string | null
}

type PendingCheckout = {
  sessionId?: string
  pack?: string
  createdAt?: string
}

const pendingCheckoutKey = "icons-pending-checkout"

function formatBytes(bytes: number | undefined) {
  if (!bytes) {
    return "Verifying size"
  }

  const mb = bytes / 1024 / 1024

  if (mb < 1) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${mb.toFixed(1)} MB`
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
      copy: "The server verifies the paid Checkout session before building the icon ZIP."
    }
  }

  return {
    allowed: false,
    label: "Purchase token required",
    copy: "Delivery is guarded. Complete checkout first, then return here with the Stripe session ID."
  }
}

export function IconsDeliveryClient() {
  const [access, setAccess] = useState(getAccessState(new URLSearchParams()))
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null)
  const [status, setStatus] = useState("Ready")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pack, setPack] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    const nextPreview = search.get("preview") === "1"
    let nextSessionId = search.get("session_id")
    let nextPack = search.get("pack")

    if (!nextSessionId && !nextPreview) {
      try {
        const rawPending = window.localStorage.getItem(pendingCheckoutKey)
        const pending = rawPending ? JSON.parse(rawPending) as PendingCheckout : null

        if (pending?.sessionId?.startsWith("cs_")) {
          nextSessionId = pending.sessionId
          nextPack = nextPack ?? pending.pack ?? null
        }
      } catch {
        // Pending checkout recovery is best-effort only.
      }
    }

    const accessSearch = new URLSearchParams(search)

    if (!accessSearch.get("session_id") && nextSessionId) {
      accessSearch.set("session_id", nextSessionId)
    }

    setAccess(getAccessState(accessSearch))
    setPreview(nextPreview)
    setSessionId(nextSessionId)
    setPack(nextPack)

    const entitlementUrl = nextPreview && nextPack
      ? `/api/downloads/icons/entitlement?preview=1&pack=${encodeURIComponent(nextPack)}`
      : nextSessionId
        ? `/api/downloads/icons/entitlement?session_id=${encodeURIComponent(nextSessionId)}${nextPack ? `&pack=${encodeURIComponent(nextPack)}` : ""}`
        : null

    if (!entitlementUrl) {
      return
    }

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
        setPack(data.pack)
        setStatus("Verified")
      })
      .catch((error) => {
        setStatus(error instanceof Error ? error.message : "Delivery access could not be verified.")
        setAccess({
          allowed: false,
          label: "Delivery blocked",
          copy: "The server could not verify a paid Stripe Checkout session for this icon pack."
        })
      })
  }, [])

  const handleDownload = useCallback(async () => {
    if (!access.allowed) {
      setStatus("Blocked by delivery guard")
      return
    }

    setStatus("Building protected ZIP...")

    try {
      const response = await fetch("/api/downloads/icons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId,
          pack,
          preview
        })
      })

      const data = await response.json() as { url?: string; error?: string }

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Download API did not return a URL")
      }

      setStatus("Protected ZIP issued")
      window.location.assign(data.url)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Protected download failed. Check Stripe session or server logs.")
    }
  }, [access.allowed, pack, preview, sessionId])

  const title = entitlement?.packName ?? "Volynx icon pack"
  const filename = entitlement?.filename ?? (pack ? `${pack}.zip` : "icon-pack.zip")

  return (
    <div className="container-shell py-12 md:py-16">
      <nav className="mb-10 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
        <a href="/" className="transition hover:text-white">Home</a>
        <span>/</span>
        <a href="/dashboard/purchases" className="transition hover:text-white">Purchases</a>
        <span>/</span>
        <a href="/icons-store" className="transition hover:text-white">Icons Store</a>
        <span>/</span>
        <span className="text-zinc-300">Delivery</span>
      </nav>

      <section className="border-b border-white/5 pb-10">
        <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">
          <ShieldCheck className="h-4 w-4" />
          {access.label}
        </div>
        <h1 className="mt-6 max-w-4xl text-5xl font-semibold tracking-[-0.06em] text-white md:text-7xl">
          Your icon pack is ready.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
          {title} is delivered as a protected ZIP. The server checks the Stripe session before building the archive.
        </p>
      </section>

      <DeliveryTrustStrip productName="Icons Store" className="py-8" />

      <section className="grid gap-5 py-10 md:grid-cols-3">
        {[
          ["Pack", title],
          ["Files", entitlement ? String(entitlement.files) : "Verifying"],
          ["Size", formatBytes(entitlement?.bytes)]
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
          <h2 className="mt-3 flex items-center gap-3 text-2xl font-semibold tracking-[-0.04em] text-white">
            <ImageIcon className="h-6 w-6 text-zinc-400" />
            {filename}
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{status}</p>
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
          No download was opened. Complete checkout from the Icons Store, or open local preview mode while testing in
          development.
        </div>
      ) : null}

      <section className="section-space">
        <div className="surface p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Support</p>
          <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">
            If Stripe charged you, this page should unlock.
          </h3>
          <p className="mt-3 text-sm leading-7 text-zinc-400">
            Include the Stripe session ID and the icon pack name so support can route it fast.
          </p>
          <a href={`mailto:${supportEmail}?subject=Icons%20Store%20delivery%20support`} className="button-secondary mt-6 w-full md:w-auto">
            Email support <Mail className="ml-2 h-4 w-4" />
          </a>
        </div>
      </section>
    </div>
  )
}
