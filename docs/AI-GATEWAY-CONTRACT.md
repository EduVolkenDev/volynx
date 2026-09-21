# VOLYNX AI Gateway Contract

The internal `ai-gateway` Edge Function is a server-to-server bridge for AI
capabilities shared by VOLYNX products. It centralizes provider transport,
model selection, prompt bounds, and provider error handling.

## Ownership boundaries

- Product functions own user authentication, authorization, quotas, and VX billing.
- The gateway authenticates only a private bearer token. PDU should use the
  product-specific `AI_GATEWAY_TOKEN_PDU`; VOLYNX callers may use
  `AI_GATEWAY_TOKEN_VOLYNX` or the shared fallback `AI_GATEWAY_TOKEN`.
- The gateway never receives or decides a user's balance, entitlement, or payment state.
- Image processing and local browser/ONNX tools remain outside this contract.

## Request

`POST /functions/v1/ai-gateway`

```json
{
  "product": "pdu|volynx",
  "capability": "lume|reading|lumina|builder|intent|summary|writing|task|decision|cvitae",
  "system": "optional system instructions",
  "user": "bounded user prompt",
  "max_tokens": 1024,
  "temperature": 0.7,
  "request_id": "optional correlation id"
}
```

The gateway accepts only the listed products and capabilities. PDU is restricted
to `lume` and `reading`; VOLYNX may use the other listed capabilities. It also
limits the system/user prompt sizes to 40,000/120,000 characters and caps
output at 8,192 tokens.

## Response

```json
{
  "ok": true,
  "text": "provider response",
  "capability": "lume"
}
```

The gateway does not expose the provider API key or prompt contents in its
response. Model selection uses `AI_MODEL_<CAPABILITY>`, then `AI_MODEL`, then
the default Haiku model.

## Activation

Configure `AI_GATEWAY_TOKEN_PDU` in the VOLYNX Supabase project for the PDU
integration. Configure
`PDU_AI_GATEWAY_URL` and `PDU_AI_GATEWAY_TOKEN` only in the PDU server
environment when the internal route is deployed and tested. Until both PDU
variables exist, PDU continues using its existing direct Anthropic adapter.
