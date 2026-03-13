import { createClient } from "@supabase/supabase-js";

export async function getSupabaseClient() {
  const res = await fetch("/config.json", { cache: "no-store" });
  if (!res.ok) throw new Error("config.json não encontrado.");

  const cfg = await res.json();

  if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey) {
    throw new Error("Configure SUPABASE_URL e SUPABASE_ANON_KEY em /config.json.");
  }

  return createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
}