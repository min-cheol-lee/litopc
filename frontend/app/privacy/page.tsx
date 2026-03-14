import type { Metadata } from "next";
import { MarketingShell } from "../../components/MarketingShell";

export const metadata: Metadata = {
  title: "Privacy | litopc",
  description: "Privacy policy for litopc.",
};

export default function PrivacyPage() {
  return (
    <MarketingShell navItems={[{ label: "Home", href: "/" }]}>
      <article className="marketing-doc-page landing-anchor">
        <div className="marketing-doc-hero">
          <div className="landing-eyebrow">Privacy</div>
          <h1>litopc collects only what it needs to run the product.</h1>
          <p>
            This page describes what data is processed to operate the site, simulator, and subscriptions.
          </p>
        </div>

        <section className="marketing-doc-section">
          <h2>Data we process</h2>
          <div className="marketing-doc-copy">
            <p>
              litopc processes account identity via Clerk authentication, billing and payment information via Stripe,
              simulation usage counters, saved scenario state, and service logs used to operate and debug the product.
              No simulation input data is sold or shared with third parties.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>How it is used</h2>
          <div className="marketing-doc-copy">
            <p>
              This data is used to authenticate users, manage subscriptions, enforce plan limits, restore access to
              paid features, monitor reliability, and respond to support requests.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Third-party services</h2>
          <div className="marketing-doc-copy">
            <p>
              Authentication is handled by <a href="https://clerk.com" target="_blank" rel="noreferrer">Clerk</a>.
              Billing is handled by <a href="https://stripe.com" target="_blank" rel="noreferrer">Stripe</a>.
              Their handling of data is governed by their respective privacy policies and agreements.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Advertising</h2>
          <div className="marketing-doc-copy">
            <p>
              litopc may include advertising on free-tier pages. If advertising services such as Google AdSense are
              active, cookie usage and ad-related disclosures will be noted on the relevant pages. Pro and Research
              plans are ad-free.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Contact</h2>
          <div className="marketing-doc-copy">
            <p>
              Privacy questions can be sent to{" "}
              <a href="mailto:mincheol.chris.lee@gmail.com">mincheol.chris.lee@gmail.com</a>.
            </p>
          </div>
        </section>
      </article>
    </MarketingShell>
  );
}
