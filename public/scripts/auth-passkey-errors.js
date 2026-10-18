export function passkeyErrorMessage(error, lang = "en") {
  const pt = String(lang).startsWith("pt");
  const code = error?.code || error?.name || "";
  if (code === "ERROR_CEREMONY_ABORTED" || code === "NotAllowedError") {
    return pt
      ? "A confirmação da chave foi cancelada ou expirou. Tente novamente quando quiser."
      : "The passkey prompt was closed or timed out. Try again when ready.";
  }
  if (code === "webauthn_challenge_expired") {
    return pt ? "A solicitação da chave expirou. Tente novamente." : "The passkey request expired. Please try again.";
  }
  if (code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") {
    return pt ? "Esta chave já está salva na sua conta." : "This passkey is already saved to your account.";
  }
  if (code === "ERROR_INVALID_RP_ID" || code === "ERROR_INVALID_DOMAIN") {
    return pt
      ? "As chaves de acesso não estão configuradas para este domínio. Entre com sua senha."
      : "Passkeys are not configured for this domain. Sign in with your password.";
  }
  if (code === "passkey_disabled" || code === "provider_disabled") {
    return pt
      ? "As chaves de acesso estão indisponíveis agora. Sua senha continua funcionando."
      : "Passkeys are unavailable right now. Your password still works.";
  }
  if (code === "no_authorization" || code === "session_not_found") {
    return pt ? "Sua sessão expirou. Entre novamente para continuar." : "Your session expired. Sign in again to continue.";
  }
  return pt
    ? "Não foi possível concluir a operação com a chave de acesso. Tente novamente ou use sua senha."
    : "Could not complete the passkey request. Try again or use your password.";
}
