import type { Metadata } from "next";
import { MarketingShell } from "../../components/MarketingShell";
import { getSiteHostInfo } from "../../lib/site-host";

export const metadata: Metadata = {
  title: "About | litopc",
  description: "litopc is a physics-accurate OPC and lithography simulator built for engineers, researchers, and students working with DUV and EUV processes.",
};

export default function AboutPage() {
  const { simulatorHref } = getSiteHostInfo();

  return (
    <MarketingShell navItems={[{ label: "Home", href: "/" }]}>
      <article className="marketing-doc-page landing-anchor">
        <div className="marketing-doc-hero">
          <div className="landing-eyebrow">About litopc</div>
          <h1>A physics-accurate lithography and OPC simulator for the browser.</h1>
          <p>
            litopc runs Hopkins coherent imaging in your browser — no installation, no EDA license, no setup.
            Place a mask, simulate the aerial image, inspect the contour, and iterate.
          </p>
        </div>

        <section className="marketing-doc-section">
          <h2>What it does</h2>
          <div className="marketing-doc-copy">
            <p>
              litopc simulates how a mask pattern prints onto silicon under DUV (193 nm) and EUV (13.5 nm) illumination.
              The core workflow: design or load a mask, run a Hopkins TCC-based aerial image simulation, overlay the
              printed contour, measure EPE and CD, and apply iterative OPC correction. All in a single browser tab.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>The physics engine</h2>
          <div className="marketing-doc-copy">
            <p>
              The simulator is built on the Hopkins coherent imaging formulation — the same framework used in
              commercial litho tools. Resolution limits follow the Rayleigh criterion (CD<sub>min</sub> = k<sub>1</sub> × λ / NA),
              computed per preset. Four optical configurations are included: DUV dry (NA 0.93),
              DUV immersion (NA 1.35), EUV Low-NA (NA 0.33), and EUV High-NA (NA 0.55).
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Plans</h2>
          <div className="marketing-doc-copy">
            <p>
              The Free plan includes DUV dry and EUV Low-NA presets, all OPC templates, manual mask editing, and 20
              simulation runs per day. Pro adds immersion and High-NA optics, 3D silicon view, batch parameter sweep,
              and higher export resolution. The Research plan adds custom resist model parameters (Mack model),
              etch bias correction, and Bossung curve generation for process window analysis.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>Scope</h2>
          <div className="marketing-doc-copy">
            <p>
              litopc is a simulation and visualization tool — not a manufacturing sign-off platform. It is well-suited
              for process exploration, parameter studies, figure generation, and learning the physics of optical
              lithography. It is not a substitute for Calibre, Synopsys, or other full-node OPC sign-off flows.
            </p>
          </div>
        </section>

        <section className="marketing-doc-section">
          <h2>The creator</h2>
          <div className="marketing-doc-copy">
            <p>
              litopc was built by <strong>Min-Cheol Lee</strong> — OPC and lithography engineer at Intel, Ph.D. in Physics.
              Research background in optical and condensed matter physics, with hands-on OPC experience across advanced DUV
              and EUV nodes. More at{" "}
              <a href="https://mincheollee.com" target="_blank" rel="noreferrer">mincheollee.com</a>.
            </p>
          </div>
        </section>

        <div className="marketing-doc-cta">
          <a href={simulatorHref} className="landing-cta-btn landing-cta-btn-primary">
            Open Simulator →
          </a>
          <a href="/contact" className="landing-cta-btn landing-cta-btn-ghost">
            Contact
          </a>
        </div>
      </article>
    </MarketingShell>
  );
}
