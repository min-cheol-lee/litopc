import type { Metadata } from "next";
import { MarketingShell } from "../../components/MarketingShell";

export const metadata: Metadata = {
  title: "Terms | litopc",
  description: "Terms of use for litopc.",
};

export default function TermsPage() {
  return (
    <MarketingShell navItems={[{ label: "Home", href: "/" }]}>
      <article className="marketing-doc-page landing-anchor">
        <div className="marketing-doc-hero">
          <div className="landing-eyebrow">Terms of use</div>
          <h1>Use litopc for simulation, research, and process exploration.</h1>
          <p>
            These terms describe the expected use of the site, simulator, and subscription features.
          </p>
        </div>

        <section className="marketing-doc-section">
          <h2>Acceptable use</h2>
          <div className="marketing-doc-copy">
            <p>
              You may use litopc to simulate lithography processes, explore OPC behavior, run parameter sweeps,
              generate figures, and evaluate the simulator for research or engineering work. You may not use the
              service for abuse, unauthorized access attempts, data scraping, or automated misuse of the simulation
              infrastructure.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Scope of the simulator</h2>
          <div className="marketing-doc-copy">
            <p>
              litopc is a simulation and visualization tool. It is not a sign-off platform and should not be used as
              the sole basis for manufacturing, process certification, or legal compliance decisions. Simulation
              outputs are physics-based approximations and may not capture all real-world process effects.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Accounts and billing</h2>
          <div className="marketing-doc-copy">
            <p>
              Authentication is handled through Clerk. Subscription billing and plan management are handled through
              Stripe. Plan details and renewal timing are shown in the simulator account panel and Stripe billing
              portal.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>No warranty</h2>
          <div className="marketing-doc-copy">
            <p>
              The service is provided on an as-available basis. Simulation outputs, figures, and process estimates
              are provided without warranty and may change as the product evolves. litopc is not liable for decisions
              made based on simulator output.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Changes to these terms</h2>
          <div className="marketing-doc-copy">
            <p>
              These terms may be updated as the product and its features evolve. Continued use of the service after
              a revision constitutes acceptance of the updated terms.
            </p>
          </div>
        </section>
      </article>
    </MarketingShell>
  );
}
