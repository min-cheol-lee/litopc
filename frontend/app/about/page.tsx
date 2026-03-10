import type { Metadata } from "next";
import { MarketingShell } from "../../components/MarketingShell";
import { getSiteHostInfo } from "../../lib/site-host";

export const metadata: Metadata = {
  title: "About | litopc",
  description: "About litopc, its scope, and what the simulator is designed to teach.",
};

function AboutSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="marketing-doc-section">
      <h2>{title}</h2>
      <div className="marketing-doc-copy">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  const { simulatorHref } = getSiteHostInfo();

  return (
    <MarketingShell
      navItems={[
        { label: "Home", href: "/" },
        { label: "Simulator", href: "/litopc" },
        { label: "Contact", href: "/contact" },
      ]}
    >
      <article className="marketing-doc-page landing-anchor">
        <div className="marketing-doc-hero">
          <div className="landing-eyebrow">About litopc</div>
          <h1>litopc is a browser-based OPC education and visual debugging tool.</h1>
          <p>
            It is designed to help users understand how mask geometry, aerial image, and silicon contour interact, without
            pretending to replace a full sign-off flow.
          </p>
        </div>

        <AboutSection title="What litopc is for">
          <p>
            litopc is built for teaching, exploration, and early-stage discussion around optical proximity correction. The
            core workflow is simple: place a mask, inspect the contour, compare it against a target, and edit the mask again.
          </p>
        </AboutSection>

        <AboutSection title="What you can expect">
          <p>
            The simulator includes representative OPC templates, DUV and EUV presets, manual mask manipulation, 2D and 3D
            aerial views, A/B compare, and sweep utilities for visual process exploration.
          </p>
        </AboutSection>

        <AboutSection title="What it is not">
          <p>
            litopc is not a manufacturing sign-off tool, a process certification system, or a guarantee of wafer print
            accuracy. It should be treated as an educational simulator and exploratory interface.
          </p>
        </AboutSection>

        <div className="marketing-doc-cta">
          <a href={simulatorHref} className="landing-cta-btn landing-cta-btn-primary">
            Open Simulator
          </a>
        </div>
      </article>
    </MarketingShell>
  );
}
