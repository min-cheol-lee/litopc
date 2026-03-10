import type { Metadata } from "next";
import { MarketingShell } from "../../components/MarketingShell";

export const metadata: Metadata = {
  title: "Terms | litopc",
  description: "Terms of use for litopc.",
};

export default function TermsPage() {
  return (
    <MarketingShell
      navItems={[
        { label: "Home", href: "/" },
        { label: "Privacy", href: "/privacy" },
        { label: "Billing", href: "/billing-policy" },
      ]}
    >
      <article className="marketing-doc-page landing-anchor">
        <div className="marketing-doc-hero">
          <div className="landing-eyebrow">Terms</div>
          <h1>litopc is provided for educational and exploratory use.</h1>
          <p>These terms describe the basic expectations for accessing the site, simulator, and subscription features.</p>
        </div>

        <section className="marketing-doc-section">
          <h2>Use of the product</h2>
          <div className="marketing-doc-copy">
            <p>
              You may use litopc to explore OPC behavior, evaluate educational examples, and test browser-based simulator
              workflows. You may not use the service for abuse, unauthorized access attempts, or harmful automation.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Scope of the simulator</h2>
          <div className="marketing-doc-copy">
            <p>
              litopc is not a sign-off platform and should not be relied on as a final manufacturing, process, or legal
              certification decision system.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Accounts and billing</h2>
          <div className="marketing-doc-copy">
            <p>
              Authentication is handled through supported sign-in providers. Subscription billing and plan management are
              handled through Stripe and the Stripe billing portal where available.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>No warranty</h2>
          <div className="marketing-doc-copy">
            <p>
              The service is provided on an as-available basis. Educational outputs, examples, and visualizations are provided
              without warranty and may change as the product evolves.
            </p>
          </div>
        </section>
      </article>
    </MarketingShell>
  );
}
