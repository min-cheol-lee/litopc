# Auth Provider Transition Plan

Date: 2026-03-07

## Decision
Use **Clerk** as the primary public auth provider for the first commercial rollout.

## Why this choice
- Fastest path for a polished sign-in UX on Next.js.
- Good fit for `app.litopc.com` on Vercel.
- Supports Google sign-in and email-based sign-in without custom auth UI work.
- Keeps the frontend experience cleaner than maintaining an internal-only login surface.

## Scope of this document
This is the rollout plan for replacing the current internal-header identity path with a real auth provider.

Current internal mode remains available for tester operations:
- `AUTH_REQUIRED=0`
- `AUTH_ALLOW_HEADER_USER=1`

Production target:
- `AUTH_REQUIRED=1`
- `AUTH_ALLOW_HEADER_USER=0`

## Target architecture

### Frontend
- Clerk handles:
  - sign-in
  - sign-out
  - session management
  - Google OAuth
  - email-based sign-in

### Backend
- FastAPI accepts bearer JWT only.
- Header-based tester identity is disabled in public production.
- Backend verifies OIDC/JWKS tokens before resolving user identity.

### Billing
- Stripe checkout and portal require an email-bearing signed-in identity.
- Billing entitlement is still server-authoritative.
- UI never switches Free/Pro locally.

## Required rollout phases

### Phase 0. Keep public Free usage open
- Continue:
  - `AUTH_REQUIRED=0`
  - `AUTH_ALLOW_HEADER_USER=1`
  - `AUTH_ENFORCE_ALLOWLIST=0`
- This preserves acquisition and free usage while billing is finalized.

### Phase 1. Add Clerk to frontend
- Add public sign-in entry point.
- Add account menu with:
  - sign in
  - sign out
  - current identity
- Keep internal tester login hidden but still reachable.

### Phase 2. Add backend bearer-token verification
- Add OIDC/JWKS verification path.
- Accept bearer JWT as the authoritative public identity path.
- Keep current HS256/header fallback only in staging until migration is complete.

### Phase 3. Stage hardening
- In staging:
  - `AUTH_REQUIRED=1`
  - `AUTH_ALLOW_HEADER_USER=0`
- Run:
  - anonymous access rejection test
  - signed-in free flow test
  - signed-in Pro flow test
  - Stripe checkout + webhook entitlement sync test

### Phase 4. Production cutover
- Production env:
  - `AUTH_REQUIRED=1`
  - `AUTH_ALLOW_HEADER_USER=0`
- Public app uses Clerk only.
- Internal login remains hidden and restricted for emergency testing only.

## Environment variables to add

### Frontend
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

### Backend
- `AUTH_PROVIDER=clerk`
- `AUTH_JWKS_URL`
- `AUTH_ISSUER`
- `AUTH_AUDIENCE`

### Existing auth controls
- `AUTH_REQUIRED`
- `AUTH_ALLOW_HEADER_USER`
- `AUTH_ENFORCE_ALLOWLIST`

## Exit criteria
- Anonymous users cannot reach authenticated billing routes.
- Signed-in free users can use the simulator.
- Signed-in users can start Stripe checkout.
- Successful Stripe subscription updates server entitlement to Pro.
- `Manage Billing` opens Stripe portal for paid users.
- Header-based tester identity is disabled in public production.

## Keep until cutover is stable
- `/litopc/internal-login`
- retained internal identities:
  - `master`
  - `tester1`
- admin/manual entitlement tooling
- billing webhook mock

## Remove after cutover is proven stable
- public reliance on localStorage identity
- public reliance on header user fallback
- public mention of internal login
