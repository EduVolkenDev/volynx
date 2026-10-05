# AI Builder OpenAI pilot

Only VOLYNX `builder` requests can use OpenAI. PDU/Lume and every other VOLYNX capability continue using Anthropic. The default remains Anthropic until the Builder flag is set in the VOLYNX Supabase Edge Functions environment.

## Activation

1. Confirm the target Supabase project and deploy the reviewed `ai-builder` function with `_shared/ai-provider.ts` and `_shared/builder-data.ts`. If the internal `ai-gateway` is deployed, deploy it with the same shared provider code so both functions stay consistent.
2. Set `OPENAI_API_KEY` as a private Supabase Edge Function secret. A key in PDU/Vercel does not configure VOLYNX. Confirm the key's project has usable API billing and access to the selected model.
3. Set `AI_PROVIDER_BUILDER=openai` in that same environment. Optional: `OPENAI_MODEL_BUILDER=gpt-4o-mini` (the current default). Do not put either secret or key in browser code.
4. Test with an authorized account and sufficient VX: generate a draft, refine it, inspect the preview and saved project, then test an invalid/incomplete provider response in a non-production environment. Confirm successful requests spend 4 VX and failures refund them.
5. To roll back, set `AI_PROVIDER_BUILDER=anthropic` or remove that flag. This does not switch Lume or other capabilities.

The OpenAI path uses the Responses API in JSON mode with `store: false`. JSON mode is not a complete VxOS schema guarantee: the server validates renderable brand/sections and safe CTA URL schemes before marking a request successful. No automatic cross-provider retry occurs after a failure, preventing a second paid generation during an ambiguous timeout.

## Remaining launch check

The client creates the draft after generation completes and VX is finalized. It now checks the account's project limit before generation, but a database/network failure during the later draft save can still leave a completed charge without a saved project. A production-grade delivery guarantee needs server-owned draft persistence (or a durable recovery/refund workflow) before this pilot is presented as fully reliable.
