# Free to Pro Conversion UX

Date: 2026-03-07
Scope: public plan presentation, upgrade prompts, paid unlock trust, and conversion flow.

## Goal
- Make Free feel usable, not crippled.
- Make Pro feel like the professional path, not a hidden toggle.
- Ensure plan state comes from account entitlement, not local UI tricks.
- Reduce trust damage from internal tooling leaking into the public product.

## What is now implemented
- The control panel plan card is read-only.
- Manual Free/Pro switching has been removed from the public panel.
- The public plan card keeps a single primary CTA:
  - `Upgrade`
- Scenario/history restore no longer overwrites plan state locally.
- The active plan is shown as a server-managed status, not a client toggle.

## Public plan card rules
- Show:
  - current plan badge
  - usage counters
  - plan source
  - billing status
  - renewal/expiry when available
- Do not show:
  - manual Free/Pro switch
  - internal login shortcut
  - public refresh/billing controls before real account operations are production-ready

## Conversion design principles
- Free must support meaningful first value in under two minutes.
- Pro prompts should appear only where the user understands the value gap.
- Upgrade copy must be capability-led, not vague.
- Plan changes must always feel server-verified.

## Recommended upgrade trigger points

## 1. Persistent account card CTA
- Location:
  - top plan card in the control panel
- Behavior:
  - Free: show `Upgrade`
  - Pro: show `Pro Active`
- Reason:
  - stable conversion anchor without interrupting workflow

## 2. Feature lock prompts
- Keep upgrade prompts at moments of clear value:
  - batch sweep
  - higher custom shape limits
  - advanced optical presets
  - 3D panel / advanced views if they remain paid
- Copy pattern:
  - state the locked capability
  - state the outcome benefit
  - offer one clear CTA

## 3. Quota wall prompts
- Use only after the user has already received simulator value.
- Good trigger examples:
  - daily run quota exhausted
  - sweep/export quota exhausted
- Copy pattern:
  - confirm the user has hit the Free boundary
  - explain what Pro removes or expands
  - link directly to checkout

## 4. Post-checkout confirmation
- After billing redirect:
  - immediately re-fetch entitlement
  - replace stale Free indicators
  - show a concise Pro unlock confirmation
- Do not rely on query params alone as the trusted signal.

## 5. Pro trust signals
- Show read-only account facts:
  - plan source
  - billing status
  - renewal date
- This increases commercial credibility.
- It also reduces support churn caused by unclear subscription state.

## Messaging guidelines
- Prefer:
  - `Upgrade to Pro`
  - `Unlock batch sweep`
  - `Unlock advanced optics`
  - `Increase geometry edit capacity`
- Avoid:
  - vague `Go Premium`
  - internal language like `manual entitlement`
  - engineering-only terms in the main CTA path

## Suggested rollout order
1. Keep the current read-only plan card
2. Replace stub checkout with real checkout
3. Replace `Upgrade` destination with live billing
4. Add entitlement-confirmed success state
5. Add `Manage Billing` only after the billing portal is real
6. Tune prompts using funnel analytics

## Metrics to watch
- upgrade prompt viewed
- upgrade prompt clicked
- checkout session created
- checkout completed
- entitlement changed to Pro
- first paid session within 24h
- Free to Pro conversion rate
- canceled subscriptions

## Revenue and reputation lens
- Revenue:
  - one stable upgrade CTA outperforms noisy plan toggles
  - feature-specific prompts convert better than generic premium messaging
- Reputation:
  - server-managed plan state looks credible
  - removing fake toggles reduces the impression of a prototype or internal tool

## Immediate next UX changes after billing goes live
- `Upgrade` opens real checkout
- `Pro Active` opens real billing portal
- post-checkout success banner confirms Pro unlock
- public account state no longer mentions internal-only flows
