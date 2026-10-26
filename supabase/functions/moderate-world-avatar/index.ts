import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { ...headers, "Content-Type": "application/json" },
});

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "unauthorized" }, 401);
  const { data: isAdmin, error: adminError } = await admin.rpc("is_user_admin", { p_user_id: authData.user.id });
  if (adminError) return json({ error: "admin_check_failed" }, 500);
  if (!isAdmin) return json({ error: "forbidden" }, 403);

  const body = await request.json().catch(() => ({}));
  if (body.action === "list") {
    const { data: rows, error } = await admin.from("world_avatar_submissions")
      .select("id,user_id,object_path,submitted_at")
      .eq("status", "pending").order("submitted_at", { ascending: true }).limit(100);
    if (error) return json({ error: "queue_failed" }, 500);
    const items = await Promise.all((rows || []).map(async (row) => {
      const [signed, profile] = await Promise.all([
        admin.storage.from("world-avatar-pending").createSignedUrl(row.object_path, 120),
        admin.from("world_profiles").select("display_name,handle").eq("user_id", row.user_id).maybeSingle(),
      ]);
      return { ...row, display_name: profile.data?.display_name || "World member", handle: profile.data?.handle || "", preview_url: signed.data?.signedUrl || null };
    }));
    return json({ ok: true, items });
  }

  if (body.action !== "approve" && body.action !== "reject") return json({ error: "invalid_action" }, 400);
  const submissionId = String(body.id || "");
  if (!/^[0-9a-f-]{36}$/i.test(submissionId)) return json({ error: "invalid_submission" }, 400);
  const { data: submission, error: submissionError } = await admin.from("world_avatar_submissions")
    .select("id,user_id,object_path,status").eq("id", submissionId).eq("status", "pending").maybeSingle();
  if (submissionError || !submission) return json({ error: "submission_not_found" }, 404);

  if (body.action === "reject") {
    const { error } = await admin.from("world_avatar_submissions").update({
      status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: authData.user.id,
      rejection_reason: "Image did not meet World profile guidelines.",
    }).eq("id", submission.id).eq("status", "pending");
    if (error) return json({ error: "review_failed" }, 500);
    await admin.storage.from("world-avatar-pending").remove([submission.object_path]);
    return json({ ok: true });
  }

  const { data: file, error: downloadError } = await admin.storage.from("world-avatar-pending").download(submission.object_path);
  if (downloadError || !file) return json({ error: "photo_unavailable" }, 500);
  const extension = submission.object_path.split(".").pop()?.toLowerCase() || "webp";
  if (!(["jpg", "jpeg", "png", "webp"].includes(extension))) return json({ error: "invalid_photo_type" }, 400);
  const approvedPath = `${submission.user_id}/${submission.id}.${extension}`;
  const contentType = file.type || (extension === "jpg" || extension === "jpeg" ? "image/jpeg" : `image/${extension}`);
  const { error: uploadError } = await admin.storage.from("world-avatars").upload(approvedPath, file, { contentType, upsert: false });
  if (uploadError) return json({ error: "approval_upload_failed" }, 500);
  const publicUrl = admin.storage.from("world-avatars").getPublicUrl(approvedPath).data.publicUrl;
  const { error: profileError } = await admin.from("world_profiles").update({ avatar_url: publicUrl }).eq("user_id", submission.user_id);
  if (profileError) {
    await admin.storage.from("world-avatars").remove([approvedPath]);
    return json({ error: "profile_update_failed" }, 500);
  }
  const { error: reviewError } = await admin.from("world_avatar_submissions").update({
    status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: authData.user.id,
  }).eq("id", submission.id).eq("status", "pending");
  if (reviewError) return json({ error: "review_record_failed" }, 500);
  await admin.storage.from("world-avatar-pending").remove([submission.object_path]);
  return json({ ok: true });
});
