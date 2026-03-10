import type { Metadata } from "next";
import { MarketingShell } from "../../components/MarketingShell";

export const metadata: Metadata = {
  title: "Privacy | litopc",
  description: "Privacy policy for litopc.",
};

export default function PrivacyPage() {
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
          <div className="landing-eyebrow">Privacy</div>
          <h1>litopc keeps the data footprint focused on authentication, billing, and product operation.</h1>
          <p>This page summarizes the main categories of data used to run the site and simulator.</p>
        </div>

        <section className="marketing-doc-section">
          <h2>Information we use</h2>
          <div className="marketing-doc-copy">
            <p>
              litopc may process account identity from Clerk authentication, billing information from Stripe, usage counters,
              saved simulation state, and normal service logs needed to operate and debug the product.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>How it is used</h2>
          <div className="marketing-doc-copy">
            <p>
              This information is used to sign users in, manage subscriptions, enforce plan limits, restore access to paid
              features, monitor reliability, and respond to support requests.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Third-party services</h2>
          <div className="marketing-doc-copy">
            <p>
              Clerk is used for authentication and Stripe is used for billing. Their handling of data is governed by their own
              policies and agreements.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Advertising note</h2>
          <div className="marketing-doc-copy">
            <p>
              litopc may include advertising or sponsorship placements in the future. If Google AdSense or similar services are
              enabled, this policy will be updated to describe cookie usage and ad-related disclosures clearly.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Contact</h2>
          <div className="marketing-doc-copy">
            <p>Privacy questions can be sent to <a href="mailto:mincheol.chris.lee@gmail.com">mincheol.chris.lee@gmail.com</a>.</p>
          </div>
        </section>
      </article>
    </MarketingShell>
  );
}
