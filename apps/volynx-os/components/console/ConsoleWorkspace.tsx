"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Cloud, LogOut, RefreshCw } from "lucide-react";
import { consoleAuthClient } from "@/lib/console/browser-auth";
import { contextPath, selectedContext } from "@/lib/console/data";
import type { ApiResponse, CatalogResponse, CloudCatalog, CloudOverview, OperationError, TenantContext } from "@/lib/console/types";
import { ConsoleShell } from "./ConsoleShell";
import { OverviewContent, SectionContent, VALID_SECTIONS } from "./views";
import { ErrorState, LoadingSkeleton, PermissionState } from "./states";

type Route = { mode: "catalog" } | { mode: "overview"; ctx: TenantContext } | { mode: "section"; ctx: TenantContext; section: string };
type Loadable<T> = { phase: "loading" } | { phase: "ready"; value: T } | { phase: "error"; error: OperationError };
type LoadedOverview = Extract<ApiResponse<CloudOverview>, { ok: true }>;

function localError(reason: string): OperationError {
  return { code: "operation_failed", reason, at: new Date().toISOString(), referenceId: "local", retryable: true };
}

async function getJson<T>(path: string, token: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal });
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("ok" in body) || typeof body.ok !== "boolean") throw new Error("Invalid Console response");
  return body as T;
}

function AuthForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = consoleAuthClient();
    if (!client) return;
    setBusy(true);
    setMessage("");
    const { error } = await client.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setMessage("Could not sign in. Check your credentials or contact your Volynx operator.");
    else setPassword("");
  }
  return (
    <div className="console-panel mx-auto max-w-md p-6">
      <p className="eyebrow text-[#e3b85c]">VOLYNX Cloud</p>
      <h1 className="font-display mt-3 text-3xl text-white">Sign in to Cloud Console</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-400">Use an existing Volynx Cloud account. Access to each client and product is checked on the server.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm text-zinc-300">Email
          <input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-white" />
        </label>
        <label className="block text-sm text-zinc-300">Password
          <input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-white" />
        </label>
        {message && <p role="alert" className="text-sm text-red-300">{message}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-[#e3b85c] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#f2d68a] disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}

function CatalogView({ catalog, onRefresh }: { catalog: CloudCatalog; onRefresh: () => void }) {
  const clientIds = [...new Set(catalog.entries.map(entry => entry.client.id))];
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-[#e3b85c]">Authorized contexts</p>
          <h1 className="font-display mt-3 text-4xl text-white md:text-5xl">Choose what you&apos;re operating.</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">Only clients, products and environments visible to this account are listed.</p>
        </div>
        <button onClick={onRefresh} className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-300 hover:bg-white/[0.05]"><RefreshCw className="h-4 w-4" aria-hidden />Refresh</button>
      </div>
      {catalog.entries.length === 0 ? (
        <div className="console-panel mt-8 p-8 text-center">
          <p className="text-base font-semibold text-white">No Cloud contexts assigned</p>
          <p className="mt-2 text-sm text-zinc-400">An operator must assign this account to a client or product. An empty catalog does not mean all services are healthy.</p>
        </div>
      ) : clientIds.map(clientId => {
        const entries = catalog.entries.filter(entry => entry.client.id === clientId);
        return <section key={clientId} className="mt-9">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{entries[0].client.name}</h2>
          <div className="grid gap-3 md:grid-cols-2">{entries.map(entry => (
            <Link key={entry.environment.id} href={contextPath(selectedContext(entry))} className="console-panel group flex items-center justify-between gap-4 p-5 transition hover:border-[#e3b85c]/35 hover:bg-white/[0.05]">
              <span><span className="block text-base font-semibold text-white">{entry.product.name}</span><span className="mt-1 block text-xs text-zinc-500">{entry.product.vlxId} · {entry.environment.name} · {entry.environment.kind}</span></span>
              <ArrowRight className="h-4 w-4 shrink-0 text-zinc-500 transition group-hover:translate-x-1 group-hover:text-white" aria-hidden />
            </Link>
          ))}</div>
        </section>;
      })}
    </div>
  );
}

export function ConsoleWorkspace({ route }: { route: Route }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [catalog, setCatalog] = useState<Loadable<CloudCatalog>>({ phase: "loading" });
  const [overview, setOverview] = useState<Loadable<LoadedOverview>>({ phase: "loading" });
  const [revision, setRevision] = useState(0);
  const [authError, setAuthError] = useState("");
  const client = consoleAuthClient();

  useEffect(() => {
    if (!client) { setToken(null); return; }
    let live = true;
    void client.auth.getSession().then(({ data, error }) => {
      if (!live) return;
      setToken(data.session?.access_token ?? null);
      if (error) setAuthError("Could not restore the Console session. Sign in again.");
    }).catch(() => { if (live) { setToken(null); setAuthError("Could not restore the Console session. Sign in again."); } });
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (live) setToken(session?.access_token ?? null);
    });
    return () => { live = false; subscription.unsubscribe(); };
  }, [client]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    setCatalog({ phase: "loading" });
    void getJson<CatalogResponse>("/api/cloud/v1/catalog", token, controller.signal)
      .then(body => {
        if (controller.signal.aborted) return;
        if (!body.ok) { setCatalog({ phase: "error", error: body.error }); return; }
        if (!Array.isArray(body.data?.entries)) throw new Error("Invalid catalog");
        setCatalog({ phase: "ready", value: body.data });
      })
      .catch(() => { if (!controller.signal.aborted) setCatalog({ phase: "error", error: localError("Could not load your Cloud contexts.") }); });
    return () => controller.abort();
  }, [token, revision]);

  const requestedClient = route.mode === "catalog" ? null : route.ctx.client;
  const requestedProduct = route.mode === "catalog" ? null : route.ctx.product;
  const requestedEnvironment = route.mode === "catalog" ? null : route.ctx.env;
  const selected = useMemo(() => catalog.phase === "ready" && requestedClient && requestedProduct && requestedEnvironment
    ? catalog.value.entries.find(entry => entry.client.id === requestedClient && entry.product.id === requestedProduct && entry.environment.id === requestedEnvironment)
    : undefined, [catalog, requestedClient, requestedProduct, requestedEnvironment]);
  const overviewCurrent = overview.phase === "ready" && selected !== undefined &&
    overview.value.context.clientId === selected.client.id &&
    overview.value.context.productId === selected.product.id &&
    overview.value.context.environmentId === selected.environment.id;

  useEffect(() => {
    if (!token || !selected) return;
    const controller = new AbortController();
    setOverview({ phase: "loading" });
    const url = `/api/cloud/v1/overview?productId=${encodeURIComponent(selected.product.id)}&environmentId=${encodeURIComponent(selected.environment.id)}`;
    void getJson<ApiResponse<CloudOverview>>(url, token, controller.signal)
      .then(body => {
        if (controller.signal.aborted) return;
        if (!body.ok) { setOverview({ phase: "error", error: body.error }); return; }
        if (body.context.clientId !== selected.client.id || body.context.productId !== selected.product.id || body.context.environmentId !== selected.environment.id) throw new Error("Context mismatch");
        setOverview({ phase: "ready", value: body });
      })
      .catch(() => { if (!controller.signal.aborted) setOverview({ phase: "error", error: localError("Could not load this product's Overview.") }); });
    return () => controller.abort();
  }, [token, selected, revision]);

  async function signOut() { await client?.auth.signOut(); }
  const refresh = () => setRevision(value => value + 1);

  if (token && catalog.phase === "ready" && route.mode !== "catalog" && selected && overview.phase === "ready" && overviewCurrent) {
    return <ConsoleShell ctx={selectedContext(selected)} entries={catalog.value.entries} role={overview.value.context.role} activeSection={route.mode === "section" ? route.section : ""} onSignOut={signOut}>
      {route.mode === "overview"
        ? <OverviewContent ctx={selectedContext(selected)} overview={overview.value.data} onRefresh={refresh} />
        : <SectionContent ctx={selectedContext(selected)} section={route.section} overview={overview.value.data} onRefresh={refresh} />}
    </ConsoleShell>;
  }

  return <div className="console-root min-h-screen bg-[#070807] px-4 py-8 text-zinc-100 md:px-8">
    <div className="mx-auto mb-8 flex max-w-6xl items-center justify-between gap-4">
      <Link href="/console" className="flex items-center gap-2.5 text-sm font-semibold tracking-[0.08em] text-white"><Cloud className="h-5 w-5 text-[#e3b85c]" aria-hidden />VOLYNX CLOUD</Link>
      {token && <button type="button" onClick={signOut} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400 hover:text-white"><LogOut className="h-3.5 w-3.5" aria-hidden />Sign out</button>}
    </div>
    {token === undefined ? <div className="mx-auto max-w-md"><LoadingSkeleton /></div>
      : !client ? <div className="mx-auto max-w-md rounded-2xl border border-amber-400/20 p-6 text-sm text-amber-200">Cloud Console authentication is not configured in this environment.</div>
      : !token ? <>{authError && <p role="alert" className="mx-auto mb-4 max-w-md text-sm text-amber-300">{authError}</p>}<AuthForm /></>
      : catalog.phase === "loading" ? <div className="mx-auto max-w-3xl"><LoadingSkeleton /></div>
      : catalog.phase === "error" ? <div className="mx-auto max-w-xl space-y-4"><ErrorState error={catalog.error} /><button onClick={refresh} className="rounded-lg border border-white/15 px-4 py-2 text-sm">Retry</button></div>
      : route.mode === "catalog" ? <CatalogView catalog={catalog.value} onRefresh={refresh} />
      : !selected ? <div className="mx-auto max-w-xl"><PermissionState who="your Volynx operator" /><p className="text-center text-sm"><Link className="underline" href="/console">Back to authorized contexts</Link></p></div>
      : route.mode === "section" && !VALID_SECTIONS.has(route.section) ? <div className="mx-auto max-w-xl text-center"><p className="text-lg">Unknown Console section.</p><Link className="underline" href={contextPath(selectedContext(selected))}>Back to Overview</Link></div>
      : overview.phase === "loading" || (overview.phase === "ready" && !overviewCurrent) ? <div className="mx-auto max-w-3xl"><LoadingSkeleton /></div>
      : overview.phase === "error" ? <div className="mx-auto max-w-xl space-y-4"><ErrorState error={overview.error} /><button onClick={refresh} className="rounded-lg border border-white/15 px-4 py-2 text-sm">Retry</button></div>
      : null}
  </div>;
}
