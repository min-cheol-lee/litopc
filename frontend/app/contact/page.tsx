import type { Metadata } from "next";
import { MarketingShell } from "../../components/MarketingShell";

export const metadata: Metadata = {
  title: "Contact | litopc",
  description: "Support and contact information for litopc.",
};

export default function ContactPage() {
  return (
    <MarketingShell
      navItems={[
        { label: "Home", href: "/" },
        { label: "About", href: "/about" },
        { label: "Privacy", href: "/privacy" },
      ]}
    >
      <article className="marketing-doc-page landing-anchor">
        <div className="marketing-doc-hero">
          <div className="landing-eyebrow">Contact</div>
          <h1>Questions, bug reports, partnership, or testing support.</h1>
          <p>
            For simulator questions, internal testing coordination, billing issues, or launch inquiries, use the channels
            below.
          </p>
        </div>

        <section className="marketing-doc-section">
          <h2>Email</h2>
          <div className="marketing-doc-copy">
            <p>
              <a href="mailto:mincheol.chris.lee@gmail.com">mincheol.chris.lee@gmail.com</a>
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Website</h2>
          <div className="marketing-doc-copy">
            <p>
              <a href="https://mincheollee.com" target="_blank" rel="noreferrer">
                mincheollee.com
              </a>
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Support note</h2>
          <div className="marketing-doc-copy">
            <p>
              If you are testing litopc internally, include your copied Account ID from the simulator account card when asking
              for Pro access or entitlement help.
            </p>
          </div>
        </section>
      </article>
    </MarketingShell>
  );
}
