# VOLYNX PayPal integration

The PayPal path is an external one-time payment flow for VX token packs.
Normal Stripe Checkout Sessions and subscriptions remain unchanged.

## Why this is a separate path

'cpmt_1UF0SvCTxpHHXyYbPhEP9eac' is the Stripe Custom Payment Method type ID
used to report a completed PayPal transaction to Stripe. It is not a PayPal
client ID, secret, order ID, or webhook secret.

The browser enters '/checkout/?payment_method=paypal...' from the VX recharge
page. The Edge Functions then:

1. resolve the Stripe catalog price by 'lookup_key';
2. create an idempotent PayPal Orders v2 order;
3. send the buyer to PayPal for approval;
4. capture and verify the order server-side;
5. credit VX through an atomic database RPC;
6. record a provider-neutral purchase event; and
7. report the external payment to Stripe Payment Records using the 'cpmt_'
   type when Stripe reporting is configured.

No client-provided amount is trusted.

## Required Supabase secrets

Set these in the Supabase project before enabling the public flag:

- 'PAYPAL_CLIENT_ID'
- 'PAYPAL_CLIENT_SECRET'
- 'PAYPAL_ENV' — 'sandbox' for testing or 'live' for production
- 'PAYPAL_WEBHOOK_ID'
- 'STRIPE_SECRET_KEY'
- 'STRIPE_CUSTOM_PAYPAL_METHOD_ID' — optional override; defaults to
  'cpmt_1UF0SvCTxpHHXyYbPhEP9eac'
- 'SUPABASE_SERVICE_ROLE_KEY'

Apply migration '202609130001_paypal_external_payments.sql', deploy
'paypal-create-order', 'paypal-capture-order', and 'paypal-webhook', then set
'paypalEnabled' to 'true' in the deployed config.json.

The PayPal webhook URL is:

'https://<supabase-project-ref>.supabase.co/functions/v1/paypal-webhook'

Subscribe the PayPal webhook to at least:

- 'CHECKOUT.ORDER.APPROVED'
- 'PAYMENT.CAPTURE.COMPLETED'
- 'PAYMENT.CAPTURE.DENIED'

The capture endpoint remains the fulfillment path because it has the
authenticated buyer context. The webhook is used for signature-verified
reconciliation and recovery state.

## Current scope

PayPal is intentionally limited to the four one-time VX token packs. Plans,
bundles, kits, icons, PropertyFlow, and recurring subscriptions continue
through the existing Stripe checkout until their provider-neutral fulfillment
adapters are added and tested.
