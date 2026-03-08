# Auth + Billing Productionization Checklist

Date: 2026-03-07
Scope: public auth, paid subscription control, entitlement sync, and operational launch readiness.

## Objective
- Keep anonymous Free usage open.
- Move Pro access control to verified billing state only.
- Remove internal-only trust leaks from the public product surface.
- Make account identity, billing state, and simulator entitlement auditable.

## Current baseline
- Public app:
  - `https://app.litopc.com/litopc`
- Public API:
  - `https://api.litopc.com`
- Current public access model:
  - `AUTH_REQUIRED=0`
  - `AUTH_ALLOW_HEADER_USER=1`
  - `AUTH_ENFORCE_ALLOWLIST=0`
- Current billing mode:
  - `BILLING_MODE=stub`
- Current public UI state:
  - Plan is read-only in the control panel.
  - Upgrade is the only account CTA in the public plan card.
  - Scenario/history restore no longer changes plan locally.
- Internal-only surfaces still exist in code:
  - `/litopc/internal-login`
  - header/localStorage identity fallback
  - `/billing/webhook/mock`
  - `/admin/entitlements/set`

## Execution order

## Phase 1: Identity foundation
- [ ] Choose a real identity provider.
  - Recommended classes:
    - Clerk
    - Auth0
    - Supabase Auth
    - Google Identity + custom backend session layer
- [ ] Define the primary user key.
  - Use a stable provider subject as the canonical user id.
  - Keep email as profile metadata, not as the primary key.
- [ ] Add production callback URLs for:
  - `https://app.litopc.com`
  - `https://app.litopc.com/litopc`
- [ ] Define auth session rules.
  - Free usage stays available without sign-in.
  - Pro purchase, billing portal, and saved paid resources require sign-in.

## Phase 2: Backend auth hardening
- [ ] Replace public header/localStorage fallback with provider token verification.
- [ ] Set production env target:
  - `AUTH_REQUIRED=1`
  - `AUTH_ALLOW_HEADER_USER=0`
- [ ] Migrate `AUTH_JWT_HS256_SECRET`-based fallback to provider JWKS/JWT validation.
- [ ] Restrict `/litopc/internal-login` to non-production environments or remove it from public builds.
- [ ] Keep admin endpoints protected by a rotated admin token until a real admin console exists.

## Phase 3: Billing provider integration
- [ ] Replace `BILLING_MODE=stub` with a real billing provider.
  - Recommended: Stripe Billing
- [ ] Create production product catalog:
  - `litopc Pro Monthly`
  - `litopc Pro Annual` (optional but recommended)
- [ ] Map price ids through environment variables.
  - Example:
    - `STRIPE_PRICE_PRO_MONTHLY`
    - `STRIPE_PRICE_PRO_ANNUAL`
- [ ] Replace mock checkout session generation in:
  - `POST /billing/checkout/session`
- [ ] Replace mock portal flow in:
  - `POST /billing/portal/session`

## Phase 4: Webhook-driven entitlement
- [ ] Add a real billing webhook endpoint.
- [ ] Verify webhook signatures.
- [ ] Make webhook processing idempotent.
- [ ] Convert billing states to simulator entitlement:
  - `active` -> `PRO`
  - `trialing` -> `PRO`
  - `past_due` -> policy decision; normally short grace period
  - `canceled` -> `FREE` after period end
  - `unpaid` -> `FREE`
- [ ] Persist:
  - customer id
  - subscription id
  - status
  - current period end
  - last processed event id
- [ ] Remove public dependence on manual admin entitlement changes.

## Phase 5: Customer account surface
- [ ] Keep the plan card read-only.
- [ ] Show only server-trusted values:
  - current plan
  - plan source
  - billing status
  - renewal/expiry
- [ ] Keep `Upgrade` for Free users.
- [ ] Replace `Upgrade` with `Manage Billing` only after the real billing portal exists.
- [ ] Add post-checkout confirmation refresh:
  - after redirect, re-fetch `/entitlements/me`
  - show success/failure state explicitly

## Phase 6: Revenue instrumentation
- [ ] Track funnel events end-to-end:
  - upgrade prompt viewed
  - upgrade clicked
  - checkout session created
  - checkout completed
  - entitlement upgraded
  - billing portal opened
  - subscription canceled
- [ ] Build a simple daily dashboard for:
  - visitors
  - simulator starters
  - upgrade click-through
  - checkout completion
  - Free to Pro conversion rate
  - churn

## Phase 7: Compliance and trust
- [ ] Add public documents:
  - Privacy Policy
  - Terms of Service
  - Billing / Refund Policy
  - Contact / support path
- [ ] Add cookie/consent handling if ad or analytics scope requires it.
- [ ] Review tax, invoicing, and subscription disclosure requirements before live paid rollout.
- [ ] Keep simulator positioning explicit:
  - educational benchmark simulator
  - not a sign-off tool

## Phase 8: Launch gate
- [ ] Free anonymous user can run the simulator without invite or login.
- [ ] Signed-in user can complete checkout.
- [ ] Webhook upgrades entitlement without manual intervention.
- [ ] Paid user sees Pro unlocks immediately after refresh/return.
- [ ] Cancel/downgrade returns account to Free when the billing state requires it.
- [ ] Admin secrets are rotated and not exposed in screenshots or docs.

## Current file touchpoints
- Backend auth and entitlement:
  - `backend/app/auth.py`
  - `backend/app/main.py`
- Frontend plan/account UI:
  - `frontend/components/ControlPanel.tsx`
  - `frontend/app/litopc/page.tsx`
- Frontend billing client:
  - `frontend/lib/billing.ts`
- Internal-only login surface:
  - `frontend/app/litopc/internal-login/page.tsx`

## Recommended next implementation block
1. Real auth provider integration
2. Stripe checkout + portal
3. Real webhook entitlement sync
4. Public account/billing UI cleanup
5. Funnel analytics and launch review
