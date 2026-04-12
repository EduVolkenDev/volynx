#!/usr/bin/env bash
# ============================================================
# VOLYNX — Phase 1 Deploy Script
# Run from project root: bash scripts/deploy-phase1.sh
# ============================================================
set -euo pipefail

echo "═══════════════════════════════════════════"
echo "  VOLYNX Phase 1 Deploy"
echo "═══════════════════════════════════════════"
echo ""

# ── Prerequisites check ──
command -v supabase >/dev/null 2>&1 || { echo "❌ supabase CLI not found. Install: brew install supabase/tap/supabase"; exit 1; }

echo "1/5 — Running database migrations..."
echo "────────────────────────────────────"
echo "Migrations to apply:"
echo "  - 20260412_atomic_token_rpcs.sql  (atomic RPCs + security hardening)"
echo "  - 20260412_pix_payments.sql       (Pix payments table)"
echo "  - 20260412_plan_check_constraints.sql (if not already applied)"
echo "  - 20260412_missing_tables_and_indexes.sql (if not already applied)"
echo ""
echo "Run these via Supabase Dashboard > SQL Editor, or:"
echo "  supabase db push --linked"
echo ""
read -p "Press Enter after migrations are applied (or Ctrl+C to abort)..."

echo ""
echo "2/5 — Setting Edge Function secrets..."
echo "────────────────────────────────────────"
echo "Required secrets for Mercado Pago Pix:"
echo "  supabase secrets set MERCADOPAGO_ACCESS_TOKEN=<your_mp_token>"
echo ""
echo "Already needed (verify they exist):"
echo "  STRIPE_SECRET_KEY"
echo "  STRIPE_WEBHOOK_SECRET"
echo "  SUPABASE_SERVICE_ROLE_KEY"
echo ""
read -p "Press Enter after secrets are configured..."

echo ""
echo "3/5 — Deploying Edge Functions..."
echo "──────────────────────────────────"

FUNCTIONS=(
  "deduct-tokens"
  "get-balance"
  "check-permission"
  "create-checkout-session"
  "create-portal-session"
  "stripe-webhook"
  "redeem-voucher"
  "log-usage"
  "create-pix-checkout"
  "pix-webhook"
  "check-pix-status"
  "claim-black-diamond"
  "ai-builder"
  "ai-tools"
)

for fn in "${FUNCTIONS[@]}"; do
  if [ -d "supabase/functions/$fn" ]; then
    echo "  Deploying: $fn"
    # pix-webhook and stripe-webhook need --no-verify-jwt
    if [[ "$fn" == *"webhook"* ]]; then
      supabase functions deploy "$fn" --no-verify-jwt || echo "  ⚠ Failed: $fn"
    else
      supabase functions deploy "$fn" || echo "  ⚠ Failed: $fn"
    fi
  fi
done

echo ""
echo "4/5 — Mercado Pago webhook URL"
echo "──────────────────────────────"
echo "Go to: https://www.mercadopago.com.br/developers/panel/app → Webhooks"
echo "Set notification URL to:"
echo "  https://zdmpzrderifgqmqivjoy.supabase.co/functions/v1/pix-webhook"
echo ""
echo "Events to listen: payment"
echo ""
read -p "Press Enter after MP webhook is configured..."

echo ""
echo "5/5 — Frontend deploy"
echo "──────────────────────"
echo "Build and deploy to Cloudflare Pages:"
echo "  npm run build"
echo "  # Push to GitHub → Cloudflare auto-deploys"
echo "  # Or: npx wrangler pages deploy dist/"
echo ""

echo "═══════════════════════════════════════════"
echo "  ✅ Phase 1 Deploy Complete!"
echo ""
echo "  Verify:"
echo "    1. Open /account/ — check token balance loads"
echo "    2. Open /pricing/?currency=BRL — check Pix button shows"
echo "    3. Test token pack purchase (Stripe sandbox)"
echo "    4. Test Pix checkout (MP sandbox)"
echo "    5. Test voucher redemption"
echo "    6. Test token deduction (use a tool)"
echo "═══════════════════════════════════════════"
