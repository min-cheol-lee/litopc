import type { Metadata } from "next";
import React from "react";
import LitopcPage from "./litopc/page";
import { MarketingShell } from "../components/MarketingShell";
import { getSiteHostInfo } from "../lib/site-host";

export const metadata: Metadata = {
  title: "litopc | OPC & lithography simulator",
  description:
    "Web-based OPC and lithography simulator for DUV and EUV. See mask-to-silicon in seconds. Publication-ready figures. No installation, no license fee.",
};

const navItems = [
  { label: "Why OPC", href: "#why-opc" },
  { label: "Features", href: "#why-litopc" },
  { label: "Pricing", href: "#pricing" },
];

const featureRail = [
  {
    title: "Easy to approach",
    body: "Start from representative OPC masks instead of a full process stack. DUV 193 nm and EUV 13.5 nm presets included.",
  },
  {
    title: "Easy to visualize",
    body: "Mask, aerial image, contour, and 3D silicon view — all in one workspace. Compare A/B runs side by side.",
  },
  {
    title: "Easy to export",
    body: "High-resolution PNG and SVG with auto-generated figure captions. Designed to go straight into papers and presentations.",
  },
  {
    title: "Real coherent optics",
    body: "Hopkins formulation, Rayleigh criterion, k₁ factor — all computed accurately in your browser, not approximated.",
  },
  {
    title: "OPC metrics built in",
    body: "EPE and contour deviation computed automatically. See quantitatively how much correction your mask delivers.",
  },
  {
    title: "No EDA license needed",
    body: "Works entirely in the browser. No install, no Calibre seat, no cloud queue. Open a tab and start exploring.",
  },
];

const builtIns = [
  "Representative OPC templates",
  "Manual mask edit",
  "2D mask / aerial / contour view",
  "3D silicon-style view",
  "A/B compare and parameter sweep",
  "DUV 193 nm & EUV 13.5 nm presets",
];

/* ── SVG icon badges ── */
const IconBolt = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M9 2L3 9h5l-1 5 6-7H8L9 2z" stroke="rgba(120,180,255,0.9)" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
  </svg>
);
const IconFigure = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="2" y="9" width="3" height="5" rx="1" stroke="rgba(120,180,255,0.9)" strokeWidth="1.3" fill="none"/>
    <rect x="6.5" y="5" width="3" height="9" rx="1" stroke="rgba(120,180,255,0.9)" strokeWidth="1.3" fill="none"/>
    <rect x="11" y="2" width="3" height="12" rx="1" stroke="rgba(120,180,255,0.9)" strokeWidth="1.3" fill="none"/>
  </svg>
);
const IconWave = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M1 8 C3 4, 5 4, 7 8 S11 12, 13 8 S15 4, 15 6" stroke="rgba(120,180,255,0.9)" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
    <circle cx="13" cy="8" r="1.2" fill="rgba(120,180,255,0.7)"/>
  </svg>
);
const IconStudent = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="5.5" r="2.5" stroke="rgba(120,180,255,0.9)" strokeWidth="1.3" fill="none"/>
    <path d="M2 13c0-3 2.7-5 6-5s6 2 6 5" stroke="rgba(120,180,255,0.9)" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
    <path d="M5 4 L8 2.5 L11 4" stroke="rgba(120,180,255,0.9)" strokeWidth="1.2" strokeLinejoin="round" fill="none"/>
  </svg>
);
const IconChip = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="rgba(120,180,255,0.9)" strokeWidth="1.3" fill="none"/>
    <path d="M6.5 1.5v2M9.5 1.5v2M6.5 12.5v2M9.5 12.5v2M1.5 6.5h2M1.5 9.5h2M12.5 6.5h2M12.5 9.5h2" stroke="rgba(120,180,255,0.9)" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);
const IconSlides = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="1.5" y="2" width="13" height="9" rx="1.5" stroke="rgba(120,180,255,0.9)" strokeWidth="1.3" fill="none"/>
    <path d="M8 11v3M5.5 14h5" stroke="rgba(120,180,255,0.9)" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M5 6.5l2 1.5 4-3" stroke="rgba(120,180,255,0.9)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const valueProps: { icon: React.ReactNode; title: string; body: string }[] = [
  {
    icon: <IconBolt />,
    title: "Instant Results",
    body: "Run aerial image simulations in your browser. No CAD tools, no setup, no waiting.",
  },
  {
    icon: <IconFigure />,
    title: "Publication-Ready Figures",
    body: "Export high-resolution PNG and SVG — beautiful enough for papers, conference posters, and slide decks.",
  },
  {
    icon: <IconWave />,
    title: "Real Physics",
    body: "Coherent imaging model with DUV 193 nm and EUV 13.5 nm. Rayleigh criterion, OPC correction, EPE metrics.",
  },
];

const whoCards: { icon: React.ReactNode; title: string; body: string }[] = [
  {
    icon: <IconStudent />,
    title: "Students & Researchers",
    body: "Understand OPC intuitively — no EDA license required. Visualize how k₁ factor limits resolution at different NA values. Generate thesis figures in minutes.",
  },
  {
    icon: <IconChip />,
    title: "Process & Design Engineers",
    body: "Quick sanity checks before running full Calibre or Synopsys flows. Generate clear lithography figures for design reviews, tapeout presentations, and internal reports.",
  },
  {
    icon: <IconSlides />,
    title: "Educators",
    body: "Show students real aerial images, not textbook diagrams. Use litopc in lecture slides to make lithography physics tangible and interactive.",
  },
];

const freeFeatures = [
  "DUV 193 nm dry (NA 0.93)",
  "EUV 13.5 nm (NA 0.33)",
  "All OPC templates",
  "Manual mask editor (up to 5 shapes)",
  "2D aerial & contour view",
  "HD export (up to 1800 px)",
  "8 saved scenarios",
  "20 simulation runs / day",
];

const proFeatures = [
  { text: "Everything in Free", strong: false },
  { text: "DUV 193 nm immersion (NA 1.35)", strong: true },
  { text: "EUV High-NA (NA 0.55)", strong: true },
  { text: "Manual mask editor (up to 48 shapes)", strong: false },
  { text: "3D silicon surface view", strong: false },
  { text: "Batch parameter sweep", strong: true },
  { text: "High-res export (up to 4200 px)", strong: true },
  { text: "Unlimited saved scenarios", strong: false },
  { text: "2,000 simulation runs / day", strong: false },
  { text: "No ads", strong: false },
];

export default function Home() {
  const { isAppHost, simulatorHref } = getSiteHostInfo();

  if (isAppHost) {
    return <LitopcPage />;
  }

  return (
    <MarketingShell navItems={navItems}>
      {/* ── HERO ── */}
      <section className="lp-hero-split landing-anchor">
        <div className="lp-hero-split-copy">
          <div className="landing-eyebrow lp-hero-eyebrow">Lithography &amp; OPC Simulator</div>
          <h1 className="lp-hero-title">
            From mask<br />to silicon.
          </h1>
          <p className="lp-hero-sub">
            Simulate how DUV and EUV optics print nanometer-scale patterns —
            and see how OPC brings the silicon contour on target.
          </p>
          <p className="lp-hero-sub2">
            Web-based. No installation. No license fee.
          </p>
          <div className="lp-hero-actions">
            <a href={simulatorHref} className="lp-btn-primary" target="_blank" rel="noopener noreferrer">
              Try Free →
            </a>
            <a href="#pricing" className="lp-btn-ghost">See Pricing</a>
          </div>
        </div>
        <div className="lp-hero-split-visual">
          <div className="lp-hero-img-wrap">
            <img
              src="/marketing/hero-3d-opc.png"
              alt="OPC mask correction and DUV/EUV aerial imaging — 3D view"
              className="lp-hero-img"
            />
          </div>
          <div className="landing-hero-shot-note lp-hero-img-note">
            OPC mask · DUV/EUV aerial image · silicon contour
          </div>
        </div>
      </section>

      {/* ── VALUE PROPS ── */}
      <section className="lp-props-section landing-anchor">
        <div className="lp-props-grid">
          {valueProps.map((p) => (
            <article key={p.title} className="lp-prop-card">
              <div className="lp-card-icon">{p.icon}</div>
              <h3>{p.title}</h3>
              <p>{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <hr className="lp-section-divider" />

      {/* ── WHY OPC ── */}
      <section id="why-opc" className="landing-opc-section landing-anchor">
        <div className="landing-section-head landing-section-head-tight">
          <div className="landing-eyebrow">Why OPC</div>
          <h2>The silicon print is not the mask.</h2>
          <p>
            A clean L-shape on the mask can miss the target after lithography. OPC pre-distorts the mask so the final silicon contour lands where it needs to be.
          </p>
        </div>
        <div className="landing-compare-grid landing-compare-grid-clean">
          <article className="landing-visual-block landing-visual-block-plain">
            <div className="landing-visual-label">
              <span className="landing-visual-kicker">Without correction</span>
              <h3>Non-OPC</h3>
            </div>
            <img
              className="landing-example-image landing-example-image-non-opc"
              src="/marketing/non-opc.svg?v=20260311d"
              alt="Non-OPC L-shape print example"
            />
          </article>
          <article className="landing-visual-block landing-visual-block-plain">
            <div className="landing-visual-label">
              <span className="landing-visual-kicker">Mask tuned for print</span>
              <h3>OPC</h3>
            </div>
            <img
              className="landing-example-image landing-example-image-opc"
              src="/marketing/opc.svg?v=20260311d"
              alt="OPC corrected L-shape print example"
            />
          </article>
        </div>
      </section>

      <hr className="lp-section-divider" />

      {/* ── FEATURES ── */}
      <section id="why-litopc" className="landing-why-section landing-anchor">
        <div className="landing-section-head landing-section-head-tight">
          <div className="landing-eyebrow">Features</div>
          <h2>
            Why <span className="landing-logo-word">litopc</span>
          </h2>
          <p>
            Built for education and fast insight — not to replace Calibre, but to make
            lithography physics approachable before you reach for the heavy tools.
          </p>
        </div>

        <div className="landing-feature-rail">
          {featureRail.map((item, index) => (
            <article key={item.title} className="landing-feature-line">
              <div className="landing-feature-index">0{index + 1}</div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>

        <div className="landing-builtins">
          {builtIns.map((item) => (
            <div key={item} className="landing-builtins-item">
              <span className="landing-builtins-index" aria-hidden="true">&bull;</span>
              <span className="landing-builtins-copy">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <hr className="lp-section-divider" />

      {/* ── WHO IT'S FOR ── */}
      <section id="who" className="lp-who-section landing-anchor">
        <div className="landing-section-head landing-section-head-tight">
          <div className="landing-eyebrow">Who it&apos;s for</div>
          <h2>Built for anyone who works with light and silicon.</h2>
        </div>
        <div className="lp-who-grid">
          {whoCards.map((c) => (
            <article key={c.title} className="lp-who-card">
              <div className="lp-card-icon">{c.icon}</div>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </article>
          ))}
        </div>
      </section>

      <hr className="lp-section-divider" />

      {/* ── PRICING ── */}
      <section id="pricing" className="lp-pricing-section landing-anchor">
        <div className="landing-section-head landing-section-head-tight">
          <div className="landing-eyebrow">Pricing</div>
          <h2>Start free. Upgrade when you need more.</h2>
          <p>Every plan includes the full physics engine. Pro unlocks advanced optics, higher resolution, and batch analysis.</p>
        </div>

        <div className="lp-pricing-grid">
          {/* FREE */}
          <article className="lp-pricing-card">
            <div className="lp-pricing-plan-name">Free</div>
            <div className="lp-pricing-price">
              <span className="lp-pricing-amount">$0</span>
              <span className="lp-pricing-period">/mo</span>
            </div>
            <p className="lp-pricing-desc">Everything you need to explore OPC and lithography basics.</p>
            <ul className="lp-pricing-features">
              {freeFeatures.map((f) => (
                <li key={f}><span className="lp-pf-check">✓</span>{f}</li>
              ))}
            </ul>
            <a href={simulatorHref} className="lp-btn-pricing-free" target="_blank" rel="noopener noreferrer">
              Start Free →
            </a>
          </article>

          {/* PRO */}
          <article className="lp-pricing-card lp-pricing-card-pro">
            <div className="lp-pricing-pro-badge">Pro</div>
            <div className="lp-pricing-plan-name">Pro</div>
            <div className="lp-pricing-price">
              <span className="lp-pricing-amount">$19</span>
              <span className="lp-pricing-period">/mo</span>
            </div>
            <p className="lp-pricing-desc">Advanced optics, higher resolution, and batch sweep for serious work.</p>
            <ul className="lp-pricing-features">
              {proFeatures.map((f) => (
                <li key={f.text}>
                  <span className="lp-pf-check lp-pf-check-pro">✓</span>
                  {f.strong ? <strong>{f.text}</strong> : f.text}
                </li>
              ))}
            </ul>
            <a href={simulatorHref} className="lp-btn-pricing-pro" target="_blank" rel="noopener noreferrer">
              Upgrade to Pro →
            </a>
          </article>
        </div>

        <p className="lp-pricing-note">
          Educational simulator. Not a sign-off tool.
          For team or institutional access, <a href="mailto:mincheol.chris.lee@gmail.com">contact us</a>.
        </p>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="landing-cta-strip">
        <div>
          <div className="landing-eyebrow">Start here</div>
          <h2>The most beautiful lithography simulator on the web.</h2>
          <p className="lp-cta-sub">
            Open <span className="landing-logo-word">litopc</span> and see your first aerial image in under a minute.
          </p>
        </div>
        <div className="lp-cta-actions">
          <a href={simulatorHref} className="lp-btn-primary" target="_blank" rel="noopener noreferrer">
            Try Free →
          </a>
          <a href="#pricing" className="lp-btn-ghost-cta">See Pricing</a>
        </div>
      </section>
    </MarketingShell>
  );
}
