export function persistVolynxSession(session, email) {
  if (window.VxAuthBridge?.persistSession) {
    window.VxAuthBridge.persistSession(session, email);
    return;
  }
  if (!session?.access_token || !session?.refresh_token) {
    throw new Error("Authentication did not return a complete session.");
  }

  localStorage.setItem("volynx_access_token", session.access_token);
  localStorage.setItem("volynx_refresh_token", session.refresh_token);
  localStorage.setItem("volynx_user_email", email || session.user?.email || "");
  localStorage.setItem("volynx_session", JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at || null,
    expires_in: session.expires_in || null,
    user: session.user || null,
  }));
  window.VxAuthBridge?.sync();
}
