import Link from "next/link";
import type { ReactNode } from "react";
import { Cloud, LogOut } from "lucide-react";
import type { CloudConsoleRole, CatalogEntry, SelectedContext } from "@/lib/console/types";
import { contextLabel, contextPath } from "@/lib/console/data";
import { MOBILE_PRIMARY, SECTIONS } from "@/lib/console/nav";
import { ContextSwitcher, NavLink } from "./ContextSwitcher";
import { cn } from "@/lib/utils";

function RoleBadge({ role }: { role: CloudConsoleRole }) {
  const labels: Record<CloudConsoleRole, string> = {
    volynx_admin: "Volynx admin", volynx_operator: "Volynx operator",
    client_admin: "Client admin", client_viewer: "Client viewer"
  };
  return (
    <span
      style={{ backgroundColor: "rgb(255 255 255 / 4%)", boxShadow: "0 0 7px 1px inset currentColor" }}
      className="console-chip inline-flex items-center gap-1.5 border border-white/10 text-[11px] font-medium text-zinc-300"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[#e3b85c]" aria-hidden />
      {labels[role]}
    </span>
  );
}

function SidebarNav({ ctx, activeSection }: { ctx: SelectedContext; activeSection: string }) {
  return (
    <nav className="space-y-0.5" aria-label="Console sections">
      {SECTIONS.map((s) => {
        const Icon = s.icon;
        const href = contextPath(ctx, s.slug);
        const active = activeSection === s.slug;
        return (
          <NavLink key={s.slug || "overview"} href={href} active={active} className="relative">
            {active ? <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[#e3b85c]" aria-hidden /> : null}
            <Icon className={cn("h-4 w-4 shrink-0", active ? "text-[#e3b85c]" : "")} aria-hidden />
            {s.name}
          </NavLink>
        );
      })}
    </nav>
  );
}

/**
 * Console shell: desktop sidebar + mobile top/bottom nav (§3 navigation model).
 * The operational environment is desktop; mobile keeps the 5 primary sections.
 */
export function ConsoleShell({ ctx, entries, role, activeSection, onSignOut, children }: { ctx: SelectedContext; entries: CatalogEntry[]; role: CloudConsoleRole; activeSection: string; onSignOut: () => void; children: ReactNode }) {
  const mobileSections = SECTIONS.filter((s) => MOBILE_PRIMARY.includes(s.slug));
  return (
    <div className="console-root min-h-screen bg-[#070807] text-zinc-100">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-[272px] flex-col border-r border-white/[0.07] bg-black/50 px-4 py-6 lg:flex">
        <Link href="/console" className="flex items-center gap-3 px-1">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e3b85c]/30 bg-[#e3b85c]/10">
            <Cloud className="h-4 w-4 text-[#e3b85c]" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block text-[13px] font-semibold tracking-[0.1em] text-white">VOLYNX CLOUD</span>
            <span className="block text-[10px] uppercase tracking-[0.28em] text-[#e3b85c]/80">Console</span>
          </span>
        </Link>
        <div className="mt-7">
          <ContextSwitcher ctx={ctx} entries={entries} />
        </div>
        <div className="console-scroll mt-7 flex-1 overflow-y-auto">
          <SidebarNav ctx={ctx} activeSection={activeSection} />
        </div>
        <div className="space-y-3 border-t border-white/[0.07] pt-5">
          <RoleBadge role={role} />
          <p className="px-1 text-[11px] leading-5 text-zinc-600">
            Module states come from authorized sources. Unknown never means healthy.
          </p>
          <button type="button" onClick={onSignOut} className="inline-flex items-center gap-2 px-1 text-xs text-zinc-400 hover:text-white"><LogOut className="h-3.5 w-3.5" aria-hidden />Sign out</button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#070807]/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/console" className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-[#e3b85c]" aria-hidden />
            <span className="text-[13px] font-semibold tracking-[0.08em] text-white">VOLYNX CLOUD</span>
          </Link>
          <div className="flex items-center gap-2"><RoleBadge role={role} /><button type="button" onClick={onSignOut} aria-label="Sign out" className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.05] hover:text-white"><LogOut className="h-4 w-4" aria-hidden /></button></div>
        </div>
        <p className="tnum mt-1.5 truncate text-[11px] uppercase tracking-[0.14em] text-zinc-500">
          {contextLabel(ctx)}
        </p>
      </header>

      {/* Main */}
      <main className="px-4 pb-28 pt-6 md:px-8 lg:pb-12 lg:pl-[272px] lg:pt-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#070807]/95 backdrop-blur lg:hidden"
        aria-label="Console sections"
      >
        <div className="grid grid-cols-5">
          {mobileSections.map((s) => {
            const Icon = s.icon;
            const href = contextPath(ctx, s.slug);
            const active = activeSection === s.slug;
            return (
              <Link
                key={s.slug || "overview"}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium",
                  active ? "text-[#e3b85c]" : "text-zinc-500"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {s.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
