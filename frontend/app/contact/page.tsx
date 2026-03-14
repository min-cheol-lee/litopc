import type { Metadata } from "next";
import { MarketingShell } from "../../components/MarketingShell";

export const metadata: Metadata = {
  title: "Contact | litopc",
  description: "Get in touch with the litopc team for questions, bug reports, or licensing.",
};

export default function ContactPage() {
  return (
    <MarketingShell navItems={[{ label: "Home", href: "/" }]}>
      <article className="marketing-doc-page landing-anchor">
        <div className="marketing-doc-hero">
          <div className="landing-eyebrow">Contact</div>
          <h1>Questions, bug reports, or licensing inquiries.</h1>
          <p>
            Reach out for simulator feedback, billing support, institutional or team licensing, or anything else.
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
          <h2>Billing support</h2>
          <div className="marketing-doc-copy">
            <p>
              For billing questions, cancellation requests, or refund inquiries, email the address above.
              Please include your account email and a description of the issue.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Institutional licensing</h2>
          <div className="marketing-doc-copy">
            <p>
              Team and institutional licensing is available. Email with your organization name and intended use case
              and we will respond with options.
            </p>
          </div>
        </section>
      </article>
    </MarketingShell>
  );
}
