import type { Metadata } from "next";
import { MarketingShell } from "../../components/MarketingShell";

export const metadata: Metadata = {
  title: "Billing Policy | litopc",
  description: "Subscription and billing policy for litopc.",
};

export default function BillingPolicyPage() {
  return (
    <MarketingShell
      navItems={[
        { label: "Home", href: "/" },
        { label: "Terms", href: "/terms" },
        { label: "Contact", href: "/contact" },
      ]}
    >
      <article className="marketing-doc-page landing-anchor">
        <div className="marketing-doc-hero">
          <div className="landing-eyebrow">Billing policy</div>
          <h1>litopc subscriptions are managed through Stripe.</h1>
          <p>This page summarizes how recurring access, cancellations, and support around billing are handled.</p>
        </div>

        <section className="marketing-doc-section">
          <h2>Subscription model</h2>
          <div className="marketing-doc-copy">
            <p>
              Paid access is offered as a recurring subscription. Plan details, renewal timing, and access state are shown in
              the simulator account card and Stripe billing portal.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Managing billing</h2>
          <div className="marketing-doc-copy">
            <p>
              Customers can manage payment method, cancellation, and portal-based billing actions through Stripe where the
              billing portal is enabled.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Cancellation</h2>
          <div className="marketing-doc-copy">
            <p>
              Unless otherwise stated, cancellation takes effect at the end of the current billing period. Access remains
              active until that period ends.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Refunds</h2>
          <div className="marketing-doc-copy">
            <p>
              Refund requests are handled case by case unless a different rule is required by law or stated in writing at the
              time of purchase.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Support</h2>
          <div className="marketing-doc-copy">
            <p>
              Billing questions can be sent to <a href="mailto:mincheol.chris.lee@gmail.com">mincheol.chris.lee@gmail.com</a>.
            </p>
          </div>
        </section>
      </article>
    </MarketingShell>
  );
}
