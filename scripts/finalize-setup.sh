#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# VOLYNX — Finalize Monetization Setup
# Run this from the project root: bash scripts/finalize-setup.sh
# ═══════════════════════════════════════════════════════════════

set -e
echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║   VOLYNX — Finalize Monetization Setup   ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# ── Step 1: Check prerequisites ─────────────────────────────
echo "▸ Checking prerequisites..."

if ! command -v npx &> /dev/null; then
  echo "  ✗ npx not found. Install Node.js first."
  exit 1
fi
echo "  ✓ Node.js + npx available"

if [ ! -f "scripts/.env" ]; then
  echo ""
  echo "  ⚠  scripts/.env not found."
  echo "  Creating from template..."
  echo 'STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE' > scripts/.env
  echo "  → Please edit scripts/.env with your real Stripe key."
  echo "  → Then run this script again."
  exit 1
fi

source scripts/.env 2>/dev/null || true
if [[ -z "$STRIPE_SECRET_KEY" ]] || [[ "$STRIPE_SECRET_KEY" == *"YOUR_KEY"* ]]; then
  echo "  ✗ STRIPE_SECRET_KEY not set in scripts/.env"
  exit 1
fi
echo "  ✓ Stripe key loaded (${STRIPE_SECRET_KEY:0:12}...)"

# ── Step 2: Create Stripe catalog ───────────────────────────
echo ""
echo "▸ Creating Stripe product catalog..."
echo "  (This creates 15 products × 3 currencies = 45 prices)"
echo ""

npx tsx scripts/stripe-catalog-setup.ts

echo ""
echo "  ✓ Catalog created! Output: scripts/stripe-catalog-output.json"

# ── Step 3: Show next steps ─────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  ✓ Stripe catalog: DONE"
echo "  ✓ Edge Functions: DEPLOYED (stripe-webhook + create-checkout-session)"
echo ""
echo "  ⚡ REMAINING MANUAL STEPS (2 minutes):"
echo ""
echo "  1. SET SUPABASE SECRETS"
echo "     → https://supabase.com/dashboard/project/zdmpzrderifgqmqivjoy/settings/functions"
echo "     Add these secrets:"
echo "       STRIPE_SECRET_KEY        = (your sk_test_ key)"
echo "       STRIPE_WEBHOOK_SECRET    = (from step 2 below)"
echo "       SUPABASE_SERVICE_ROLE_KEY = (from Project Settings > API)"
echo "       FRONTEND_ORIGIN          = https://volynx.world"
echo ""
echo "  2. REGISTER STRIPE WEBHOOK"
echo "     → https://dashboard.stripe.com/test/webhooks"
echo "     Click 'Add endpoint'"
echo "     URL: https://zdmpzrderifgqmqivjoy.supabase.co/functions/v1/stripe-webhook"
echo "     Events: checkout.session.completed"
echo "             checkout.session.async_payment_succeeded"
echo "             checkout.session.async_payment_failed"
echo "             customer.subscription.updated"
echo "             customer.subscription.deleted"
echo "             invoice.payment_succeeded"
echo "             invoice.payment_failed"
echo "     → Copy the 'Signing secret' (whsec_...) to Supabase secrets above"
echo ""
echo "  3. BUILD & DEPLOY FRONTEND"
echo "     npm run build"
echo "     (then deploy dist/ to Cloudflare Pages)"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  After these steps, Volynx will be fully monetizing! 🚀"
echo "═══════════════════════════════════════════════════════════"
echo ""
