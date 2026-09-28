"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { CatalogEntry, SelectedContext } from "@/lib/console/types";
import { contextPath, selectedContext } from "@/lib/console/data";
import { cn } from "@/lib/utils";

/** Options are returned by the authorized catalog endpoint, never demo slugs. */
export function ContextSwitcher({ ctx, entries }: { ctx: SelectedContext; entries: CatalogEntry[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const section = pathname.split("/")[5] || "";
  const clients = [...new Map(entries.map(entry => [entry.client.id, entry.client])).values()];
  const products = [...new Map(entries.filter(entry => entry.client.id === ctx.client).map(entry => [entry.product.id, entry.product])).values()];
  const environments = entries.filter(entry => entry.client.id === ctx.client && entry.product.id === ctx.product);

  function go(entry: CatalogEntry | undefined) {
    if (entry) router.push(contextPath(selectedContext(entry), section));
  }

  const selectClass = "w-full appearance-none truncate rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-[13px] font-medium text-zinc-200 outline-none transition focus:border-white/25 hover:border-white/20";
  return (
    <div className="space-y-1.5" aria-label="Console context">
      <label className="block">
        <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">Client</span>
        <select className={selectClass} value={ctx.client} onChange={event => go(entries.find(entry => entry.client.id === event.target.value))}>
          {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">Product</span>
        <select className={selectClass} value={ctx.product} onChange={event => go(entries.find(entry => entry.client.id === ctx.client && entry.product.id === event.target.value))}>
          {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">Environment</span>
        <select className={selectClass} value={ctx.env} onChange={event => go(environments.find(entry => entry.environment.id === event.target.value))}>
          {environments.map(entry => <option key={entry.environment.id} value={entry.environment.id}>{entry.environment.name}</option>)}
        </select>
      </label>
    </div>
  );
}

export function NavLink({ href, active, children, className }: { href: string; active: boolean; children: ReactNode; className?: string }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn(
      "flex items-center gap-2.5 rounded-lg px-3 py-2 pl-4 text-[13px] font-medium transition",
      active ? "bg-[#e3b85c]/[0.08] text-white" : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200",
      className
    )}>{children}</Link>
  );
}
