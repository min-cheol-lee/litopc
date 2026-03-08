# Stripe Billing Rollout

Date: 2026-03-07

## What is now implemented
- `POST /billing/checkout/session`
  - supports `BILLING_MODE=stub`
  - supports `BILLING_MODE=stripe`
- `POST /billing/portal/session`
  - supports `BILLING_MODE=stub`
  - supports `BILLING_MODE=stripe`
- `POST /billing/webhook/mock`
  - admin-only tester path
- `POST /billing/webhook/stripe`
  - Stripe signature verification
  - subscription/customer sync
  - server entitlement update

## Required backend env
- `BILLING_MODE=stripe`
- `STRIPE_SECRET_KEY=<stripe-secret-key>`
- `STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret>`
- `STRIPE_PRICE_ID_PRO_MONTHLY=<stripe-price-id>`

Optional:
- `STRIPE_API_VERSION=<stripe-api-version>`

## Required frontend env
- `NEXT_PUBLIC_API_BASE=https://api.litopc.com`

## Stripe dashboard configuration

### Product / Price
- Create one recurring Pro price first.
- Put its id into:
  - `STRIPE_PRICE_ID_PRO_MONTHLY`

### Webhook endpoint
- Endpoint URL:
  - `https://api.litopc.com/billing/webhook/stripe`

Recommended events:
- `checkout.session.completed`
- `invoice.paid`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Current UI behavior
- Free users see:
  - `Upgrade`
- Paid users with a real Stripe customer see:
  - `Manage Billing`
- Pro users without a Stripe customer still show:
  - `Pro Active`

This preserves internal tester/manual entitlement behavior while allowing real paid accounts to use the portal.

## Production smoke test
1. Sign in with an email-bearing identity.
2. Open `Upgrade`.
3. Complete Stripe checkout.
4. Confirm webhook delivery succeeds.
5. Refresh `/litopc`.
6. Confirm:
   - plan becomes `Pro`
   - `Manage Billing` is visible
   - quota/feature gates unlock server-side

## Rollback path
- Switch `BILLING_MODE=stub`
- keep public Free access available
- continue using:
  - `/litopc/internal-login`
  - `POST /billing/webhook/mock`
