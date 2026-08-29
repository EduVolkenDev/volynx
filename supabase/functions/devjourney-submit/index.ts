import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TIER_RANK: Record<string, number> = { social: 0, pro: 1, bundle: 2 };
const REPO_HOSTS = new Set(["github.com", "gitlab.com", "bitbucket.org"]);

type Check = { ok: boolean; label: string; detail?: string };

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function clean(value: unknown, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function normaliseUrl(value: unknown) {
  const raw = clean(value, 500);
  if (!raw) throw new Error("A URL is required.");
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("Use an HTTPS URL.");
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function isSafePublicHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/[\[\]]/g, "");
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(host)) return false;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
  if (host === "0.0.0.0" || host === "::1") return false;
  return true;
}

function githubRepo(url: URL) {
  if (url.hostname.toLowerCase() !== "github.com") return null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeout = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: "manual" });
  } finally {
    clearTimeout(timer);
  }
}

async function jsonFetch(url: string) {
  const response = await fetchWithTimeout(url, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "VOLYNX-DevJourney/1.0" },
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

async function validateLiveUrl(liveUrl: string): Promise<Check> {
  const url = new URL(liveUrl);
  if (!isSafePublicHost(url.hostname)) {
    return { ok: false, label: "Published URL", detail: "The URL must point to a public HTTPS host." };
  }
  try {
    const response = await fetchWithTimeout(liveUrl, { headers: { Accept: "text/html,application/xhtml+xml" } }, 8000);
    const ok = response.status >= 200 && response.status < 400;
    return { ok, label: "Published URL", detail: ok ? `Responded with HTTP ${response.status}.` : `Responded with HTTP ${response.status}.` };
  } catch {
    return { ok: false, label: "Published URL", detail: "The URL could not be reached from the validator." };
  }
}

async function validateGithub(repoUrl: string): Promise<{ checks: Check[]; runUrl: string | null; commit: string | null }> {
  const parsed = githubRepo(new URL(repoUrl));
  if (!parsed) {
    return {
      checks: [
        { ok: false, label: "Public GitHub repository", detail: "Use a public github.com repository so the automated checks can inspect it." },
        { ok: false, label: "README.md" },
        { ok: false, label: "GitHub Actions workflow" },
        { ok: false, label: "Successful workflow run" },
      ],
      runUrl: null,
      commit: null,
    };
  }

  const base = `https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`;
  const repoResult = await jsonFetch(base);
  if (!repoResult.response.ok || !repoResult.data || repoResult.data.private) {
    return { checks: [{ ok: false, label: "Public GitHub repository", detail: "Repository not found or not public." }], runUrl: null, commit: null };
  }

  const readmeResult = await jsonFetch(`${base}/readme`);
  const workflowsResult = await jsonFetch(`${base}/contents/.github/workflows`);
  const runsResult = await jsonFetch(`${base}/actions/runs?per_page=10`);
  const workflows = Array.isArray(workflowsResult.data) ? workflowsResult.data : [];
  const runs = Array.isArray(runsResult.data?.workflow_runs) ? runsResult.data.workflow_runs : [];
  const successfulRun = runs.find((run: any) => run.conclusion === "success" && run.status === "completed");

  return {
    checks: [
      { ok: true, label: "Public GitHub repository", detail: `${parsed.owner}/${parsed.repo}` },
      { ok: readmeResult.response.ok, label: "README.md", detail: readmeResult.response.ok ? "README found." : "Add a README.md that explains the project." },
      { ok: workflowsResult.response.ok && workflows.length > 0, label: "GitHub Actions workflow", detail: workflows.length ? `${workflows.length} workflow file(s) found.` : "Add a workflow under .github/workflows/." },
      { ok: Boolean(successfulRun), label: "Successful workflow run", detail: successfulRun ? `Successful run: ${successfulRun.name || "workflow"}.` : "Run the workflow successfully before submitting." },
    ],
    runUrl: successfulRun?.html_url || null,
    commit: successfulRun?.head_sha || repoResult.data.default_branch || null,
  };
}

function allPassed(checks: Check[]) {
  return checks.length > 0 && checks.every((check) => check.ok);
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function publicSubmission(row: any) {
  return {
    id: row.id,
    student_name: row.student_name || "Dev Journey learner",
    tier: row.tier,
    repo_url: row.repo_url,
    live_url: row.live_url,
    status: row.status,
    validation: row.validation || {},
    certificate_id: row.certificate_id || null,
    fingerprint: row.fingerprint || null,
    submitted_at: row.submitted_at,
    updated_at: row.updated_at,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ ok: false, error: "Certification backend is not configured." }, 500);

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const action = clean(body.action, 20).toLowerCase() || "submit";
    const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    if (action === "verify") {
      const certificateId = clean(body.certificate_id, 80).toUpperCase();
      if (!/^VX-DJ-[0-9]{4}-[A-Z0-9]{6}$/.test(certificateId)) return json({ ok: false, error: "Certificate not found." }, 404);
      const { data, error } = await service.from("devjourney_submissions").select("id,student_name,tier,repo_url,live_url,status,validation,certificate_id,fingerprint,submitted_at,updated_at").eq("certificate_id", certificateId).eq("status", "approved").maybeSingle();
      if (error || !data) return json({ ok: false, error: "Certificate not found." }, 404);
      return json({ ok: true, certificate: publicSubmission(data) });
    }

    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ ok: false, error: "Sign in to use the submission flow." }, 401);
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) return json({ ok: false, error: "Your session expired. Sign in again." }, 401);
    const user = authData.user;

    if (action === "status") {
      const { data, error } = await service.from("devjourney_submissions").select("id,student_name,tier,repo_url,live_url,status,validation,certificate_id,fingerprint,submitted_at,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (error) return json({ ok: false, error: "Could not load submission status." }, 500);
      return json({ ok: true, submission: data ? publicSubmission(data) : null });
    }

    if (action !== "submit") return json({ ok: false, error: "Unknown action." }, 400);
    const repoUrl = normaliseUrl(body.repo_url);
    const liveUrl = normaliseUrl(body.live_url);
    if (!REPO_HOSTS.has(new URL(repoUrl).hostname.toLowerCase())) throw new Error("Use a GitHub, GitLab or Bitbucket repository URL.");

    const { data: profile } = await service.from("profiles").select("full_name,email,devjourney_tier,builder_plan,is_admin").eq("id", user.id).maybeSingle();
    const profileTier = clean(profile?.devjourney_tier, 20).toLowerCase();
    const builderPlan = clean(profile?.builder_plan, 20).toLowerCase();
    const tier = Object.prototype.hasOwnProperty.call(TIER_RANK, profileTier) ? profileTier : builderPlan === "studio" || builderPlan === "teams" ? "bundle" : builderPlan === "pro" ? "pro" : "social";
    const requestedTier = clean(body.tier, 20).toLowerCase();
    if (Object.prototype.hasOwnProperty.call(TIER_RANK, requestedTier) && TIER_RANK[requestedTier] > TIER_RANK[tier] && !profile?.is_admin) return json({ ok: false, error: "Your current Dev Journey tier does not include this track." }, 403);

    const liveCheck = await validateLiveUrl(liveUrl);
    const github = await validateGithub(repoUrl);
    const checks = [...github.checks, liveCheck];
    const status = allPassed(checks) ? "approved" : "needs_changes";
    const validation = {
      checks,
      run_url: github.runUrl,
      commit: github.commit,
      checked_at: new Date().toISOString(),
      validator: "volynx-devjourney-v1",
    };
    const key = await sha256(`${user.id}:${repoUrl}:${liveUrl}`);
    const { data: existing } = await service.from("devjourney_submissions").select("id").eq("user_id", user.id).eq("repo_url", repoUrl).eq("live_url", liveUrl).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    let submissionId = existing?.id;
    let certificateId: string | null = null;
    let fingerprint: string | null = null;
    if (status === "approved") {
      const certificateKey = await sha256(`${key}:${github.commit || ""}`);
      certificateId = `VX-DJ-${new Date().getUTCFullYear()}-${certificateKey.slice(0, 6).toUpperCase()}`;
      fingerprint = await sha256(`${certificateId}:${repoUrl}:${liveUrl}:${github.commit || ""}`);
    }
    const studentName = clean(profile?.full_name, 160) || clean(user.user_metadata?.full_name, 160) || "Dev Journey learner";
    const payload = { user_id: user.id, student_name: studentName, tier, repo_url: repoUrl, live_url: liveUrl, notes: clean(body.notes, 2000) || null, status, validation, certificate_id: certificateId, fingerprint };
    if (submissionId) {
      const { data, error } = await service.from("devjourney_submissions").update(payload).eq("id", submissionId).select("id,student_name,tier,repo_url,live_url,status,validation,certificate_id,fingerprint,submitted_at,updated_at").single();
      if (error) throw error;
      await service.from("devjourney_validation_runs").insert({ submission_id: data.id, user_id: user.id, status, checks, summary: status === "approved" ? "All automated checks passed." : "One or more automated checks need attention." });
      return json({ ok: true, submission: publicSubmission(data), message: status === "approved" ? "Project validated and certificate issued." : "Submission saved. Fix the checks marked below and submit again." });
    }
    const { data, error } = await service.from("devjourney_submissions").insert(payload).select("id,student_name,tier,repo_url,live_url,status,validation,certificate_id,fingerprint,submitted_at,updated_at").single();
    if (error) throw error;
    await service.from("devjourney_validation_runs").insert({ submission_id: data.id, user_id: user.id, status, checks, summary: status === "approved" ? "All automated checks passed." : "One or more automated checks need attention." });
    return json({ ok: true, submission: publicSubmission(data), message: status === "approved" ? "Project validated and certificate issued." : "Submission saved. Fix the checks marked below and submit again." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not process the submission.";
    return json({ ok: false, error: message }, 400);
  }
});
