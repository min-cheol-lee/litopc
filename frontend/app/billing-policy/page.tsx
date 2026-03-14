import type { Metadata } from "next";
import { MarketingShell } from "../../components/MarketingShell";

export const metadata: Metadata = {
  title: "Billing Policy | litopc",
  description: "Subscription and billing policy for litopc.",
};

export default function BillingPolicyPage() {
  return (
    <MarketingShell navItems={[{ label: "Home", href: "/" }]}>
      <article className="marketing-doc-page landing-anchor">
        <div className="marketing-doc-hero">
          <div className="landing-eyebrow">Billing policy</div>
          <h1>Subscriptions are monthly or annual, managed through Stripe.</h1>
          <p>
            This page covers how recurring billing, cancellations, and refunds are handled for Pro and Research plans.
          </p>
        </div>

        <section className="marketing-doc-section">
          <h2>Subscription model</h2>
          <div className="marketing-doc-copy">
            <p>
              Pro ($19/mo or $149/yr) and Research ($79/mo or $699/yr) plans are recurring subscriptions.
              Plan details, renewal date, and current access state are shown in the simulator account panel.
              Payment is processed through Stripe.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Managing billing</h2>
          <div className="marketing-doc-copy">
            <p>
              You can update your payment method, switch plans, or cancel at any time through the Stripe billing
              portal, accessible from the account panel inside the simulator.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Cancellation</h2>
          <div className="marketing-doc-copy">
            <p>
              Cancellation takes effect at the end of the current billing period. Access to paid features remains
              active until that period ends. You will not be charged again after cancellation.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Refunds</h2>
          <div className="marketing-doc-copy">
            <p>
              Refund requests are handled case by case. If you believe a charge was made in error, email{" "}
              <a href="mailto:mincheol.chris.lee@gmail.com">mincheol.chris.lee@gmail.com</a> with your account email
              and a description of the issue.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Questions</h2>
          <div className="marketing-doc-copy">
            <p>
              For billing questions not covered here, contact{" "}
              <a href="mailto:mincheol.chris.lee@gmail.com">mincheol.chris.lee@gmail.com</a>.
            </p>
          </div>
        </section>
      </article>
    </MarketingShell>
  );
}
