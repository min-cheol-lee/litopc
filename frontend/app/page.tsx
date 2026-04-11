import type { Metadata } from "next";
import React from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { MarketingShell } from "../components/MarketingShell";
import { getSiteHostInfo } from "../lib/site-host";

const LitopcPage = dynamic(() => import("./litopc/page"), { ssr: false });

export const metadata: Metadata = {
  title: "litopc | OPC & Lithography Simulator",
  description:
    "Web-based OPC and lithography simulator for DUV and EUV. Hopkins wave-optics model, EPE metrics, Bossung curves, and publication-ready figures. No installation, no license fee.",
};

const navItems: { label: React.ReactNode; href: string }[] = [];

const featureRail = [
  {
    title: "1-click OPC correction",
    body: "Click Run OPC. The algorithm shifts mask vertices until EPE converges at every edge segment. Watch the correction happen iteration by iteration — no scripting, no setup.",
  },
  {
    title: "4 view modes",
    body: "Mask · aerial image · printed contour · 3D silicon surface — all in one workspace. Switch views instantly. A/B compare any two parameter sets side by side.",
  },
  {
    title: "8 color maps & export",
    body: "Hot, Viridis, Plasma, Grayscale, Inferno, and more. Adjust the intensity scale. Export PNG up to 4200 px or SVG — every figure auto-includes λ, NA, k₁, and CD_min captions.",
  },
  {
    title: "EPE & CD per edge",
    body: "Edge placement error computed at every contour segment. CD measured across critical dimensions. Both auto-updated on every run — no manual measurement needed.",
  },
  {
    title: "Batch sweep",
    body: "Sweep focus, dose, sigma, or any parameter across up to 120 points (Pro) or 200 points (Research). Results shown as an overlay grid — Bossung curves auto-generated.",
    tag: "Pro",
  },
  {
    title: "Custom process model",
    body: "Dial in Mack resist parameters (n, m, Eth), set isotropic etch bias, and run Focus-Exposure Matrix sweeps. Process window analysis without an EDA stack.",
    tag: "Research",
  },
];

const opcTemplates = [
  "L-shape", "Contact hole", "Dense lines", "Isolated line",
  "Line-end", "SRAM cell", "T-junction", "Corner rounding",
];

/* ── SVG icon badges ── */
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
const IconFlask = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M6 2v5L2 13h12L10 7V2" stroke="rgba(120,180,255,0.9)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <path d="M5 2h6" stroke="rgba(120,180,255,0.9)" strokeWidth="1.3" strokeLinecap="round"/>
    <circle cx="6" cy="11" r="1" fill="rgba(120,180,255,0.6)"/>
  </svg>
);


const whoCards: { icon: React.ReactNode; title: string; body: string }[] = [
  {
    icon: <IconStudent />,
    title: "Students & Researchers",
    body: "Understand OPC intuitively — no EDA license required. Visualize how k₁ factor limits resolution at different NA values. Generate thesis and paper figures in minutes.",
  },
  {
    icon: <IconChip />,
    title: "Process & Design Engineers",
    body: "Quick sanity checks before running full Calibre or Synopsys flows. Generate clear lithography figures for design reviews, tape-out presentations, and internal reports.",
  },
  {
    icon: <IconSlides />,
    title: "Educators",
    body: "Show students real aerial images, not textbook diagrams. Use litopc in lecture slides to make lithography physics tangible and interactive.",
  },
  {
    icon: <IconFlask />,
    title: "Research Teams & Startups",
    body: "Custom process models, etch bias parameters, and Bossung curves — without a six-figure EDA license. Ideal for academic process labs, equipment R&D, and semiconductor startups exploring new nodes.",
  },
];

const freeFeatures = [
  "DUV 193 nm dry (NA 0.93)",
  "EUV 13.5 nm Low-NA (NA 0.33)",
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
  { text: "Batch parameter sweep (120 pts)", strong: true },
  { text: "High-res export (up to 4200 px)", strong: true },
  { text: "Unlimited saved scenarios", strong: false },
  { text: "2,000 simulation runs / day", strong: false },
  { text: "No ads", strong: false },
];

const researchFeatures = [
  { text: "Everything in Pro", strong: false },
  { text: "Custom resist model (Mack: n, m, Eth)", strong: true },
  { text: "Etch bias correction (isotropic)", strong: true },
  { text: "Focus-Exposure Matrix / Bossung curves", strong: true },
  { text: "Process window analysis", strong: true },
  { text: "Custom illumination shape (annular, dipole)", strong: false },
  { text: "Batch sweep up to 200 points", strong: false },
  { text: "10,000 simulation runs / day", strong: false },
  { text: "Priority simulation queue", strong: false },
  { text: "PDF process report export", strong: false },
];

export default function Home() {
  const { isAppHost, simulatorHref } = getSiteHostInfo();

  if (isAppHost) {
    return <LitopcPage />;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "litopc",
    "applicationCategory": "SimulationApplication",
    "operatingSystem": "Web",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    <MarketingShell navItems={navItems}>
      {/* ── HERO ── */}
      <section className="lp-hero-split landing-anchor">
        <div className="lp-hero-split-copy">
          <h1 className="lp-hero-title">
            See what prints.<br />Correct what doesn&apos;t.
          </h1>
          <p className="lp-hero-sub">
            Run DUV/EUV lithography simulations and OPC correction in seconds. No EDA license. No installation. Export publication-ready figures.
          </p>
          <div className="lp-hero-actions">
            <a href={simulatorHref} className="lp-btn-primary" target="_blank" rel="noopener noreferrer">
              Try for free — no signup needed
            </a>
            <a href="#pricing" className="lp-btn-ghost">See Pricing</a>
          </div>
        </div>
        <div className="lp-hero-split-visual">
          <div className="lp-hero-img-wrap">
            <Image
              src="/marketing/hero-3d-opc.png"
              alt="OPC mask correction and DUV/EUV aerial imaging — 3D view"
              className="lp-hero-img"
              width={3200}
              height={3200}
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <div className="landing-hero-shot-note lp-hero-img-note">
            Actual litopc output — mask, aerial image, contour, and 3D silicon view
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:"12px",padding:"0 0 2.5rem"}}>
        <article className="lp-preset-card" style={{textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <p style={{margin:0,fontWeight:700,fontSize:"13px",letterSpacing:"0.02em"}}>DUV 193nm · EUV 13.5nm</p>
        </article>
        <article className="lp-preset-card" style={{textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <p style={{margin:0,fontWeight:700,fontSize:"13px",letterSpacing:"0.02em"}}>Hopkins coherent imaging</p>
        </article>
        <article className="lp-preset-card" style={{textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <p style={{margin:0,fontWeight:700,fontSize:"13px",letterSpacing:"0.02em"}}>Export-ready PNG / SVG / CSV</p>
        </article>
      </div>

      {/* ── HOW IT WORKS (3-column visual story) ── */}
      <section className="lp-story-section landing-anchor">
        <div className="landing-section-head landing-section-head-tight">
          <div className="landing-eyebrow">How it works</div>
          <h2>From mask to silicon — see the physics.</h2>
        </div>

        <div className="lp-story-cols">
          {/* Step 01 — CSS mockup */}
          <div className="lp-story-col">
            <span className="lp-story-num">01</span>
            <div className="lp-story-col-visual lp-story-col-visual-mockup">
              <div className="lp-sim-mockup">
                <div className="lp-sim-mockup-field">
                  <span className="lp-sim-mockup-label">Imaging Tool</span>
                  <div className="lp-sim-mockup-select">DUV 193 nm dry <span className="lp-sim-mockup-caret">▾</span></div>
                </div>
                <div className="lp-sim-mockup-field">
                  <span className="lp-sim-mockup-label">Pattern</span>
                  <div className="lp-sim-mockup-select">L-Shape (DUV) <span className="lp-sim-mockup-caret">▾</span></div>
                </div>
                <div className="lp-sim-mockup-divider" />
                <button className="lp-sim-mockup-btn" tabIndex={-1}>Run Simulation →</button>
              </div>
            </div>
            <h3 className="lp-story-title">Set up your simulation</h3>
            <p className="lp-story-body">
              Pick DUV 193 nm or EUV 13.5 nm. Load an L-shape, contact hole, or any built-in template. No install, no EDA license.
            </p>
          </div>

          <div className="lp-story-arrow" aria-hidden="true">→</div>

          {/* Step 02 — non-OPC 3D */}
          <div className="lp-story-col">
            <span className="lp-story-num">02</span>
            <div className="lp-story-col-visual">
              <Image src="/marketing/non-opc-3d.png" alt="Non-OPC — silicon print misses the mask target" width={900} height={900} loading="lazy" />
            </div>
            <h3 className="lp-story-title">Diffraction distorts the print</h3>
            <p className="lp-story-body">
              193 nm light diffracts through the lens. Corners round, line-ends pull back. The silicon print misses the mask target.
            </p>
          </div>

          <div className="lp-story-arrow" aria-hidden="true">→</div>

          {/* Step 03 — OPC 3D */}
          <div className="lp-story-col">
            <span className="lp-story-num">03</span>
            <div className="lp-story-col-visual">
              <Image src="/marketing/opc-3d.png" alt="OPC complete — silicon contour matches mask target" width={900} height={900} loading="lazy" />
            </div>
            <h3 className="lp-story-title">One click — OPC corrects, export</h3>
            <p className="lp-story-body">
              Click Run OPC. Mask vertices shift until EPE converges. Export PNG, SVG, or 3D — auto-captioned for any audience.
            </p>
          </div>
        </div>
      </section>

      <hr className="lp-section-divider" />

      {/* ── PHYSICS ENGINE ── */}
      <section id="physics" className="lp-physics-section landing-anchor">
        <div className="landing-section-head landing-section-head-tight">
          <div className="landing-eyebrow">The Physics</div>
          <h2>Wave-optics simulation. Real resolution limits.</h2>
          <p>
            Hopkins wave-optics model — the same optical framework used in commercial litho tools, running in your browser.
            Resolution limits and EPE are physics-derived, not approximated.
          </p>
        </div>

        <div className="lp-physics-grid">
          <div className="lp-physics-left">
            <div className="lp-physics-formula-box">
              <div className="lp-physics-formula-label">Rayleigh Resolution Criterion</div>
              <div className="lp-physics-formula">
                CD<sub>min</sub> = k<sub>1</sub> &times; &lambda; / NA
              </div>
              <div className="lp-physics-formula-note">
                k<sub>1</sub> &asymp; 0.26 &ndash; 0.28 &nbsp;&middot;&nbsp; Rayleigh limit &nbsp;&middot;&nbsp; Computed per preset
              </div>
            </div>
            <div className="lp-physics-formula-box">
              <div className="lp-physics-formula-label">Edge Placement Error (EPE)</div>
              <div className="lp-physics-formula lp-physics-formula-sm">
                EPE = contour<sub>actual</sub> &minus; target
              </div>
              <div className="lp-physics-formula-note">
                Signed distance in nm &nbsp;&middot;&nbsp; Auto-computed per edge segment &nbsp;&middot;&nbsp; Drives OPC iteration
              </div>
            </div>
          </div>

          <div className="lp-physics-presets">
            <div className="lp-physics-preset-row lp-physics-preset-header">
              <span>System</span><span>&lambda;</span><span>NA</span><span>Limit</span><span>Typical</span>
            </div>
            <div className="lp-physics-preset-row">
              <span>DUV dry</span><span>193 nm</span><span>0.93</span><span>~56 nm</span><span className="lp-physics-cd-typical">~65 nm</span>
            </div>
            <div className="lp-physics-preset-row lp-physics-preset-pro">
              <span>DUV immersion <span className="lp-physics-plan-tag">Pro</span></span>
              <span>193 nm</span><span>1.35</span><span>~39 nm</span><span className="lp-physics-cd-typical">~40 nm</span>
            </div>
            <div className="lp-physics-preset-row">
              <span>EUV Low-NA</span><span>13.5 nm</span><span>0.33</span><span>~11 nm</span><span className="lp-physics-cd-typical">~13 nm</span>
            </div>
            <div className="lp-physics-preset-row lp-physics-preset-pro">
              <span>EUV High-NA <span className="lp-physics-plan-tag">Pro</span></span>
              <span>13.5 nm</span><span>0.55</span><span>~7 nm</span><span className="lp-physics-cd-typical">~8 nm</span>
            </div>
            <div className="lp-physics-preset-note">
              Limit: k<sub>1</sub> &asymp; 0.27 (Rayleigh) &nbsp;&middot;&nbsp; Typical: production k<sub>1</sub> &asymp; 0.32 &nbsp;&middot;&nbsp; 1D nested half-pitch &nbsp;&middot;&nbsp; Pro presets require upgrade
            </div>
          </div>
        </div>

        {/* PLACEHOLDER_PHYSICS — uncomment to restore figure slots
        <div className="lp-fig-placeholder-row">
          <div className="lp-fig-placeholder">
            <div className="lp-fig-placeholder-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <rect x="2" y="5" width="16" height="10" rx="2" stroke="rgba(120,180,255,0.6)" strokeWidth="1.3" fill="none"/>
                <circle cx="7" cy="10" r="2.5" stroke="rgba(120,180,255,0.5)" strokeWidth="1.2" fill="none"/>
                <path d="M11 8l3 2-3 2" stroke="rgba(120,180,255,0.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </div>
            <div className="lp-fig-placeholder-label">Aerial image — Hopkins TCC output</div>
            <div className="lp-fig-placeholder-note">Intensity map · OPC mask overlay · CD contour</div>
          </div>
          <div className="lp-fig-placeholder">
            <div className="lp-fig-placeholder-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 15 C5 8, 8 6, 10 10 S14 14, 17 5" stroke="rgba(120,180,255,0.6)" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
                <circle cx="10" cy="10" r="1.5" fill="rgba(120,180,255,0.5)"/>
                <line x1="3" y1="15" x2="17" y2="15" stroke="rgba(120,180,255,0.3)" strokeWidth="1" strokeDasharray="2 2"/>
              </svg>
            </div>
            <div className="lp-fig-placeholder-label">Bossung curve — CD vs Focus × Dose</div>
            <div className="lp-fig-placeholder-note">Focus-Exposure Matrix · process window overlay</div>
          </div>
        </div>
        END PLACEHOLDER_PHYSICS */}
      </section>

      <hr className="lp-section-divider" />

      {/* ── PRESETS ── */}
      <section className="lp-presets-section landing-anchor">
        <div className="landing-section-head landing-section-head-tight">
          <div className="landing-eyebrow">Optical presets & templates</div>
          <h2>Four optical configurations. Eight OPC templates. Ready out of the box.</h2>
        </div>

        <div className="lp-presets-grid">
          {[
            { sys: "DUV dry",       lambda: "193 nm", na: "0.93", cd: "~56 nm", plan: "Free" },
            { sys: "DUV immersion", lambda: "193 nm", na: "1.35", cd: "~39 nm", plan: "Pro"  },
            { sys: "EUV Low-NA",    lambda: "13.5 nm", na: "0.33", cd: "~11 nm", plan: "Free" },
            { sys: "EUV High-NA",   lambda: "13.5 nm", na: "0.55", cd: "~7 nm",  plan: "Pro"  },
          ].map((p) => (
            <article key={p.sys} className={`lp-preset-card${p.plan === "Pro" ? " lp-preset-card-pro" : ""}`}>
              <div className="lp-preset-top">
                <span className="lp-preset-name">{p.sys}</span>
                <span className={`lp-preset-badge${p.plan === "Pro" ? " lp-preset-badge-pro" : ""}`}>{p.plan}</span>
              </div>
              <div className="lp-preset-row"><span>λ</span><span>{p.lambda}</span></div>
              <div className="lp-preset-row"><span>NA</span><span>{p.na}</span></div>
              <div className="lp-preset-row lp-preset-cd"><span>CD<sub>min</sub></span><span>{p.cd}</span></div>
            </article>
          ))}
        </div>

        <div className="lp-preset-templates">
          <span className="lp-preset-templates-label">OPC templates included</span>
          <div className="lp-preset-templates-chips">
            {opcTemplates.map((t) => (
              <span key={t} className="lp-preset-chip">{t}</span>
            ))}
          </div>
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
            From quick simulation to research-grade process modeling —{" "}
            <span className="landing-logo-word">litopc</span> scales with what you need.
          </p>
        </div>

        <div className="landing-feature-rail">
          {[featureRail[0], featureRail[1], featureRail[4]].map((item, index) => (
            <article key={item.title} className="landing-feature-line">
              <div className="landing-feature-index">0{index + 1}</div>
              <h3>
                {item.title}
                {"tag" in item && item.tag && (
                  <span className="lp-feature-plan-tag">{item.tag}</span>
                )}
              </h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
        <details style={{marginTop:"1.5rem"}}>
          <summary style={{cursor:"pointer",fontSize:"14px",opacity:0.6,userSelect:"none",marginBottom:"1rem"}}>More features ↓</summary>
          <div className="landing-feature-rail">
            {[featureRail[2], featureRail[3], featureRail[5]].map((item, index) => (
              <article key={item.title} className="landing-feature-line">
                <div className="landing-feature-index">0{index + 4}</div>
                <h3>
                  {item.title}
                  {"tag" in item && item.tag && (
                    <span className="lp-feature-plan-tag">{item.tag}</span>
                  )}
                </h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </details>

        {/* PLACEHOLDER_FEATURES — uncomment to restore figure slots
        <div className="lp-fig-placeholder-row">
          <div className="lp-fig-placeholder">
            <div className="lp-fig-placeholder-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <rect x="3" y="3" width="6" height="6" rx="1" stroke="rgba(120,180,255,0.6)" strokeWidth="1.2" fill="none"/>
                <rect x="11" y="3" width="6" height="6" rx="1" stroke="rgba(120,180,255,0.5)" strokeWidth="1.2" fill="rgba(120,180,255,0.06)"/>
                <rect x="3" y="11" width="6" height="6" rx="1" stroke="rgba(120,180,255,0.5)" strokeWidth="1.2" fill="rgba(120,180,255,0.06)"/>
                <rect x="11" y="11" width="6" height="6" rx="1" stroke="rgba(120,180,255,0.4)" strokeWidth="1.2" fill="none"/>
              </svg>
            </div>
            <div className="lp-fig-placeholder-label">Mask · aerial · contour · 3D — side by side</div>
            <div className="lp-fig-placeholder-note">Full workspace view · A/B compare mode</div>
          </div>
          <div className="lp-fig-placeholder">
            <div className="lp-fig-placeholder-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M3 14 L6 9 L9 12 L12 6 L15 10 L17 7" stroke="rgba(120,180,255,0.6)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                <circle cx="9" cy="12" r="1.2" fill="rgba(120,180,255,0.5)"/>
              </svg>
            </div>
            <div className="lp-fig-placeholder-label">OPC convergence — EPE per iteration</div>
            <div className="lp-fig-placeholder-note">Edge placement error · CD deviation · MRC check</div>
          </div>
        </div>
        END PLACEHOLDER_FEATURES */}
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
          <p>Every plan includes the full physics engine. Pro unlocks advanced optics and batch analysis. Research adds custom process model integration.</p>
        </div>

        <div className="lp-pricing-beta-notice">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{flexShrink:0,marginTop:1}}>
            <circle cx="8" cy="8" r="6.5" stroke="rgba(120,200,255,0.6)" strokeWidth="1.3"/>
            <path d="M8 5v4M8 11v.5" stroke="rgba(120,200,255,0.7)" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span><strong>Beta period — no subscription fee.</strong> Free plan is open to everyone. Pro is in closed beta testing; paid billing is not yet active.</span>
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
          <article className="lp-pricing-card lp-pricing-card-pro lp-pricing-card-beta">
            <div className="lp-pricing-pro-badge">Closed Beta</div>
            <div className="lp-pricing-plan-name">Pro</div>
            <div className="lp-pricing-price">
              <span className="lp-pricing-amount lp-pricing-amount-beta">$19</span>
              <span className="lp-pricing-period">/mo</span>
            </div>
            <div className="lp-pricing-annual">or <strong>$149/yr</strong> <span className="lp-pricing-save">save $79</span></div>
            <p className="lp-pricing-desc">Advanced optics, higher resolution, and batch sweep for serious work.</p>
            <ul className="lp-pricing-features">
              {proFeatures.map((f) => (
                <li key={f.text}>
                  <span className="lp-pf-check lp-pf-check-pro">✓</span>
                  {f.strong ? <strong>{f.text}</strong> : f.text}
                </li>
              ))}
            </ul>
            <a href="mailto:contact@litopc.com" className="lp-btn-pricing-pro lp-btn-pricing-beta">
              Join Closed Beta →
            </a>
          </article>

          {/* RESEARCH */}
          <article className="lp-pricing-card lp-pricing-card-research lp-pricing-card-beta">
            <div className="lp-pricing-research-badge">Research</div>
            <div className="lp-pricing-plan-name">Research</div>
            <div className="lp-pricing-price">
              <span className="lp-pricing-amount lp-pricing-amount-beta">$79</span>
              <span className="lp-pricing-period">/mo</span>
            </div>
            <div className="lp-pricing-annual">or <strong>$699/yr</strong> <span className="lp-pricing-save">save $249</span></div>
            <p className="lp-pricing-desc">Custom process models, Bossung curves, and process window analysis for fab-grade insight.</p>
            <ul className="lp-pricing-features">
              {researchFeatures.map((f) => (
                <li key={f.text}>
                  <span className="lp-pf-check lp-pf-check-research">✓</span>
                  {f.strong ? <strong>{f.text}</strong> : f.text}
                </li>
              ))}
            </ul>
            <a href="mailto:contact@litopc.com" className="lp-btn-pricing-research lp-btn-pricing-beta">
              Join Closed Beta →
            </a>
          </article>
        </div>

        <p className="lp-pricing-note">
          For team or institutional licensing, <a href="mailto:contact@litopc.com">contact us</a>.
          Calibre costs $100k+/year — litopc is not a sign-off replacement, but it should cost a lot less.
        </p>
      </section>

      <hr className="lp-section-divider" />

      {/* ── CREATOR / ABOUT ── */}
      <section id="about" className="lp-about-section landing-anchor">
        <div className="lp-creator-inner">
          <div>
            <div className="landing-eyebrow">About</div>
            <h2 className="lp-creator-name">Built by a working OPC engineer.</h2>
            <p className="lp-creator-text">
              <strong>Min-Cheol Lee</strong> — OPC and lithography engineer at Intel.
              Ph.D. in Physics, with research background spanning optical and condensed matter physics.
              Specialized in semiconductor patterning simulation and OPC for advanced nodes.
            </p>
            <div className="lp-creator-links">
              <a href="https://mincheollee.com" target="_blank" rel="noopener noreferrer" className="lp-creator-link">mincheollee.com</a>
              <a href="https://linkedin.com/in/min-cheol-lee" target="_blank" rel="noopener noreferrer" className="lp-creator-link">LinkedIn</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="landing-cta-strip">
        <div>
          <h2>Ready to simulate?</h2>
          <p className="lp-cta-sub">Free to use. No sign-up required to start.</p>
        </div>
        <div className="lp-cta-actions">
          <a href={simulatorHref} className="lp-btn-primary" target="_blank" rel="noopener noreferrer">
            Open Simulator →
          </a>
        </div>
      </section>
    </MarketingShell>
    </>
  );
}
