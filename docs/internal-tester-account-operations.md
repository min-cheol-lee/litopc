# Internal Tester Account Operations

Date: 2026-03-07

## Purpose
- Keep day-to-day simulator QA fast.
- Separate feature testing from billing-state testing.
- Avoid using production customer identities for internal entitlement checks.

## Current retained internal accounts
- `master` / `master@opc-lab`
- `tester1` / `tester1@opc-lab`

These legacy identities are acceptable for routine internal testing through:
- `/litopc/internal-login`

They should remain available until the public auth provider rollout is complete.

## Recommended account categories

### 1. Daily feature QA
Use stable tester identities for repeatable UI and simulator checks.

Examples:
- `master`
- `tester1`
- future naming: `tester-pro-main`, `tester-free-main`

Use cases:
- 2D/3D UI verification
- mask editing regression checks
- quota display validation
- Pro-only feature access checks

### 2. Billing-state tests
Use separate identities when validating subscription transitions.

Recommended naming:
- `tester-billing-01`
- `tester-billing-cancel`
- `tester-billing-trial`

Use cases:
- checkout session creation
- webhook-driven Pro activation
- downgrade / cancellation
- portal availability

Do not reuse daily QA identities for destructive billing-state tests unless there is a specific reason.

### 3. Invite-only and staging access tests
Use allowlisted email identities that are not shared with daily QA.

Recommended naming:
- `tester-invite-01`
- `tester-invite-expiry`

Use cases:
- allowlist enforcement
- invite expiry checks
- email-identity-required flows

## Operational rules
- Keep internal identities deterministic. Do not test with anonymous `cid:*` users when entitlement behavior matters.
- If a test depends on server plan state, use:
  - internal login for identity
  - admin/manual entitlement or billing webhook mock for state transition
- Do not use real customer email addresses for internal-only tests.
- Do not remove the retained legacy accounts until external auth is fully live and rollback-safe.

## Which path to use

### Use internal login only
Use when:
- you need a stable identity
- you are verifying existing Pro access already granted on the server

Path:
- `/litopc/internal-login`

### Use internal login + admin entitlement set
Use when:
- you need the fastest manual Free/Pro switch
- billing flow itself is not under test

Endpoint:
- `POST /admin/entitlements/set`

### Use internal login + billing webhook mock
Use when:
- you are validating billing-state transitions
- you want behavior closer to the future Stripe production path

Endpoint:
- `POST /billing/webhook/mock`

Script:
- `./dev-billing-mock.ps1`

## Current practical recommendation
- Keep using `master` and `tester1` for normal internal Pro testing.
- Use dedicated `tester-billing-*` identities for checkout / downgrade / cancellation simulation.
- After external auth is live, keep internal login hidden but available for emergency QA and rollback verification.
