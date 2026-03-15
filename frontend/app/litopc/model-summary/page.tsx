"use client";

export default function ModelSummaryPage() {
  return (
    <main style={pageStyle}>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={h1Style}>How Imaging Works</h1>
          <p style={subtitleStyle}>
            How litopc's optical model works, what it simplifies, and where the
            physics boundaries are — so you can interpret simulation results correctly.
          </p>
          <nav style={navStyle}>
            {[
              ["OPC Guide", "/litopc/opc-guide"],
            ].map(([label, href]) => (
              <a key={href} className="model-guide-link" href={href}>{label}</a>
            ))}
            <a href="/litopc" style={backBtnStyle}>← Back to Lab</a>
          </nav>
        </div>
      </div>

      {/* ── §1 Model Scope ───────────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={h2Style}><SectionBadge n={1} />Model Scope</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={theadRowStyle}>
              <th style={thStyle}>Layer</th>
              <th style={thStyle}>Current model</th>
              <th style={thStyle}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Mask", "Binary rectangle rasterization",
               "No absorber 3D, no full reflective EUV mask stack physics"],
              ["Optics", "Scalar coherent proxy — FFT pupil + Gaussian MTF + focus blur",
               "No partial coherence (σ), no Zernike aberrations, no source-shape modeling. n = 1 assumed throughout image space."],
              ["Material stack", "Not modeled — n = 1 free-space assumed",
               "No substrate reflectivity, no thin-film standing wave, no BARC/resist stack. Aerial image computed at resist surface only."],
              ["Resist", "Binary threshold on aerial intensity",
               "No resist blur, no contrast model. Dose = normalized intensity threshold [0, 1], not physical mJ/cm²."],
              ["Etch bias", "None — contour = resist edge = silicon edge",
               "No isotropic or proximity-dependent etch offset applied."],
              ["Contour", "Iso-contour at level = dose",
               "Represents resist-printed boundary, not post-etch silicon."],
              ["CD metric", "Center-line simple CD + Rayleigh printability guard",
               "Sub-limit requested CD is treated as non-printing."],
            ].map(([layer, model, notes], i) => (
              <tr key={layer as string} style={i % 2 === 1 ? zebraStyle : {}}>
                <td style={{ ...tdStyle, fontWeight: 550 }}>{layer}</td>
                <td style={tdStyle}>{model}</td>
                <td style={tdStyle}>{notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── §2 Simulation Flow ───────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={h2Style}><SectionBadge n={2} />Core Simulation Flow</h2>
        <pre style={codeBlockStyle}>{`Mask (rectangles)
  → rasterize to binary amplitude mask
  → FFT optics:  pupil cutoff (NA/λ)  ×  Gaussian MTF (0.10·λ/NA)  ×  focus blur
     [n = 1 assumed; no thin-film stack; aerial image at resist surface only]
  → aerial intensity I(x,y),  clipped to [0, 1]   ← open field ≈ 1.0
  → resist:  printed(x,y) = 1  if  I(x,y) ≥ dose  else 0   ← binary threshold
  → contour extraction at iso-level = dose
  → CD metric (center-line)  +  Rayleigh printability guard`}</pre>
        <p style={{ marginTop: 10, fontSize: 13.5, opacity: 0.72 }}>
          No etch step. No material stack. The contour represents the resist-developed
          boundary, not post-etch silicon.
        </p>
      </section>

      {/* ── §3 Rayleigh Guard ────────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={h2Style}><SectionBadge n={3} />Rayleigh Printability Guard</h2>
        <p>
          The app applies an industry-style printability criterion:{" "}
          <strong>CD_min ≈ k₁ · λ / NA</strong>. If the requested nominal CD is below
          this floor, the result is treated as non-printing (contours removed, CD metric
          omitted).
        </p>
        <table style={{ ...tableStyle, marginTop: 14 }}>
          <thead>
            <tr style={theadRowStyle}>
              <th style={thStyle}>Preset</th>
              <th style={thStyle}>NA</th>
              <th style={thStyle}>k₁ (guard)</th>
              <th style={thStyle}>CD_min</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["DUV | 193 nm Dry", "0.93", "0.28", "~58 nm"],
              ["DUV | 193 nm Immersion", "1.35", "0.26", "~37 nm"],
              ["EUV | 13.5 nm Low-NA", "0.33", "0.30", "~12 nm"],
              ["EUV | 13.5 nm High-NA", "0.55", "0.26", "~6.4 nm"],
            ].map(([preset, na, k1, cd], i) => (
              <tr key={preset as string} style={i % 2 === 1 ? zebraStyle : {}}>
                <td style={tdStyle}>{preset}</td>
                <td style={tdStyle}>{na}</td>
                <td style={tdStyle}>{k1}</td>
                <td style={tdStyle}>{cd}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Callout type="tip">
          Very thin assist-like lines below the printability floor are intentionally
          suppressed. This prevents false-positive printing that can occur when each
          pattern is independently normalized. This also applies to OPC sub-segments:
          each cell must stay above CD_min to remain correctable.
        </Callout>
      </section>

      {/* ── §4 Optical Parameters ────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={h2Style}><SectionBadge n={4} />Optical Parameters</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={theadRowStyle}>
              <th style={thStyle}>Parameter</th>
              <th style={thStyle}>Physical meaning</th>
              <th style={thStyle}>In this simulator</th>
              <th style={thStyle}>Customizable</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Dose", "Exposure energy × resist sensitivity",
               "Normalized aerial-intensity threshold [0, 1]. Higher dose = less printed area. Not in mJ/cm².",
               "All tiers"],
              ["Focus (Pro)", "Defocus Δz from best focus",
               "Proxy [0, 1]. 0 = sharpest. Higher values apply Gaussian blur to aerial image. Not in nm.",
               "Pro +"],
              ["NA", "Numerical aperture — optical bandwidth",
               "Set by preset. Determines pupil cutoff and Rayleigh CD floor.",
               "Research (planned)"],
              ["λ", "Illumination wavelength",
               "193 nm (DUV) or 13.5 nm (EUV). Set by preset.",
               "Research (planned)"],
              ["σ (partial coherence)", "Source coherence — controls NILS and DoF",
               "Not yet user-controllable. Internal σ = 0.7 applied to all presets via diffraction blur term.",
               "Research (planned)"],
              ["Zernike aberrations", "Wavefront error in pupil plane",
               "Not modeled. Would modify the pupil phase: P(ρ,θ) · exp(i·2π/λ · Σcₙ·Zₙ).",
               "Research (planned)"],
            ].map(([param, phys, sim, tier], i) => (
              <tr key={param as string} style={i % 2 === 1 ? zebraStyle : {}}>
                <td style={{ ...tdStyle, fontWeight: 550, whiteSpace: "nowrap" }}>{param}</td>
                <td style={tdStyle}>{phys}</td>
                <td style={tdStyle}>{sim}</td>
                <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                  <TierBadge tier={tier as string} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── §5 Physics Simplifications ───────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={h2Style}><SectionBadge n={5} />Physics Simplifications</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
          {[
            { title: "Optics", body: "Scalar coherent — no vector polarization, no partial coherence (σ), no Zernike aberrations.", bg: "#eef4ff", border: "rgba(30,80,200,0.15)" },
            { title: "Material stack", body: "n = 1 throughout. No substrate reflectivity, no thin-film standing wave, no BARC/TARC.", bg: "#f5f0ff", border: "rgba(100,40,180,0.15)" },
            { title: "Resist", body: "Binary threshold only — no acid-diffusion blur, no contrast model (γ), no development kinetics.", bg: "#fff8ee", border: "rgba(180,110,20,0.18)" },
            { title: "Etch", body: "Not modeled. Contour = resist edge. No isotropic, proximity, or loading-effect bias.", bg: "#fff0ee", border: "rgba(200,60,40,0.18)" },
            { title: "Mask", body: "Binary transmission, rectangles only. No EUV mask 3D effects, no sub-resolution assist features (SRAF).", bg: "#f0fbf4", border: "rgba(30,160,80,0.15)" },
            { title: "k₁ limits", body: "Conservative educational guardrails — not process-of-record values.", bg: "#f8f9fb", border: "rgba(30,30,60,0.12)" },
          ].map(({ title, body, bg, border }) => (
            <div key={title} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontWeight: 660, fontSize: 13, marginBottom: 5 }}>{title}</div>
              <div style={{ fontSize: 13, opacity: 0.82, lineHeight: 1.55 }}>{body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── §6 Material Stack ────────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={h2Style}><SectionBadge n={6} />Material Stack &amp; Thin-Film Effects</h2>
        <p>
          Real lithography stacks (substrate / BARC / resist / topcoat) create thin-film
          interference that modifies the effective intensity inside the resist. litopc
          computes the aerial image at the resist surface only, assuming n = 1.
        </p>
        <table style={{ ...tableStyle, marginTop: 14 }}>
          <thead>
            <tr style={theadRowStyle}>
              <th style={thStyle}>Effect</th>
              <th style={thStyle}>Physical cause</th>
              <th style={thStyle}>CD impact</th>
              <th style={thStyle}>In litopc</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Standing wave", "Incident + reflected light interfere in Z. Period = λ/(2·n_r) ≈ 57 nm for DUV.", "±3–8 nm CD swing (no BARC)", "Not modeled. Negligible with optimized BARC (R < 1%)."],
              ["Substrate reflectivity", "Si reflects ~35% at 193 nm; adds to effective absorbed dose.", "Dose shift ≈ ±5–10 nm CD (no BARC)", "Absorbed into dose threshold implicitly."],
              ["BARC", "Anti-reflection coating suppresses substrate reflection.", "Reduces CD swing to <0.5 nm", "Implicitly assumed present."],
              ["3D resist profile", "Absorption gradient → tapered sidewalls, footing.", "Sidewall angle 80–88° typical", "Out of scope — 2D model only."],
            ].map(([eff, cause, impact, status], i) => (
              <tr key={eff as string} style={i % 2 === 1 ? zebraStyle : {}}>
                <td style={{ ...tdStyle, fontWeight: 550 }}>{eff}</td>
                <td style={tdStyle}>{cause}</td>
                <td style={tdStyle}>{impact}</td>
                <td style={tdStyle}>{status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Callout type="info">
          For most educational and planning use cases, assuming BARC suppresses standing
          waves makes the 2D aerial-image model a reasonable proxy for the printed CD.
          The dose slider absorbs the effective stack reflectance offset implicitly.
          TMM-based material stack correction (n, k, thickness per layer) is planned for
          the Research tier.
        </Callout>
      </section>

      {/* ── §7 FAQ ───────────────────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={h2Style}><SectionBadge n={7} />FAQ</h2>
        <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
          {[
            ["Is this sign-off accurate?",
             "No. Educational visualization only. Results are physics-inspired approximations, not calibrated for manufacturing."],
            ["Why does changing dose move the contour so strongly?",
             "Dose is directly the aerial-intensity threshold. Real lithography doses are buffered by resist contrast (γ), which this model omits — so the sensitivity here is higher than a calibrated tool."],
            ["What does the contour actually represent?",
             "The resist-developed boundary after applying the dose threshold to the aerial image. Not the post-etch silicon edge — no etch bias is applied."],
            ["Why doesn't a very small feature print?",
             "The Rayleigh printability guard (CD_min = k₁·λ/NA) suppresses contours when the requested feature is below the physical resolution limit of the selected optical tool."],
            ["Does the model account for substrate reflection or BARC?",
             "No. The aerial image is computed at n = 1. In practice this is a good approximation when optimized BARC is used (R < 1%). Without BARC, substrate reflections (~35% for bare Si at 193 nm) would shift the effective dose — this is absorbed implicitly into the dose threshold."],
            ["Can the model be extended with a custom resist, etch, or material stack?",
             "Not in the current release. Pro will add resist blur σ and isotropic etch bias. Research tier will add partial coherence σ, Zernike aberration input, sigmoid resist model, and TMM-based material stack correction."],
          ].map(([q, a]) => (
            <div key={q as string} style={faqCardStyle}>
              <div style={{ fontWeight: 640, fontSize: 14, marginBottom: 6 }}>Q: {q}</div>
              <div style={{ fontSize: 13.5, opacity: 0.78, lineHeight: 1.6 }}>A: {a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── §8 References ────────────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={h2Style}><SectionBadge n={8} />Reference Notes for k₁ Guard</h2>
        <p style={{ fontSize: 14 }}>
          The k₁ guard values are hard-coded educational guardrails selected from common
          industry Rayleigh ranges, not copied from a single process-of-record.
          Current values: DUV dry 0.28 · DUV imm 0.26 · EUV LNA 0.30 · EUV HNA 0.26.
        </p>
        <ul style={{ fontSize: 13.5, lineHeight: 2, paddingLeft: 20, marginTop: 8 }}>
          <li>
            ASML Rayleigh criterion overview:{" "}
            <a href="https://www.asml.com/en/technology/lithography-principles/rayleigh-criterion" target="_blank" rel="noreferrer" style={linkStyle}>
              asml.com/.../rayleigh-criterion
            </a>
          </li>
          <li>
            Micron photolithography educational material:{" "}
            <a href="https://www.micron.com/content/dam/micron/educatorhub/fabrication/photolithography/micron-fabrication-intro-to-photolithography-presentation.pdf" target="_blank" rel="noreferrer" style={linkStyle}>
              micron.com photolithography presentation
            </a>
          </li>
          <li>
            EUV NA/CD scaling intuition:{" "}
            <a href="https://euvlsymposium.lbl.gov/pdf/2012/pres/V.%20Banine.pdf" target="_blank" rel="noreferrer" style={linkStyle}>
              euvlsymposium.lbl.gov — V. Banine
            </a>
          </li>
        </ul>
      </section>

      {/* ── §9 Validated Cases ───────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={h2Style}><SectionBadge n={9} />Validated Behaviors</h2>
        <p style={{ fontSize: 14, opacity: 0.78, marginBottom: 14 }}>
          Representative cases verified against expected physics behavior. Educational
          validation only — not manufacturing qualification.
        </p>
        <table style={tableStyle}>
          <thead>
            <tr style={theadRowStyle}>
              <th style={thStyle}>Case</th>
              <th style={thStyle}>Preset</th>
              <th style={thStyle}>What is checked</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["ISO line dose monotonicity", "DUV 193 nm Imm", "Higher dose threshold shrinks printed CD monotonically", "verified"],
              ["Sub-resolution guardrail non-print", "DUV 193 nm Dry", "Features below k₁λ/NA return no contour and CD = null", "verified"],
              ["Square width monotonicity", "DUV 193 nm Dry", "Larger mask width yields non-decreasing printed CD", "verified"],
              ["Stepped interconnect dose stability", "EUV Low-NA", "CD monotonically shrinks with dose across sampled range", "verified"],
              ["Dense L/S EUV presence", "EUV Low-NA", "Representative dense pattern prints within expected CD band", "verified"],
              ["OPC serif response", "DUV 193 nm Dry", "Increasing serif size yields monotonic non-decreasing CD", "verified"],
            ].map(([title, preset, check, status], i) => (
              <tr key={title as string} style={i % 2 === 1 ? zebraStyle : {}}>
                <td style={tdStyle}>{title}</td>
                <td style={{ ...tdStyle, whiteSpace: "nowrap", fontSize: 12.5 }}>{preset}</td>
                <td style={tdStyle}>{check}</td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", background: "rgba(27,133,84,0.1)", color: "#176744", border: "1px solid rgba(27,133,84,0.25)" }}>
                    ✓ {(status as string).toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── §10 Recent Updates ───────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={h2Style}><SectionBadge n={10} />Recent Updates</h2>
        <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
          {[
            { date: "2026-02-24", tag: "visualization", summary: "Non-dose stack view and 3D sweep rendering", impact: "Sweep stacks are now readable in both 2D and 3D across camera angles." },
            { date: "2026-02-23", tag: "visualization", summary: "Sweep overlay in 2D/3D with active-point focus controls", impact: "Dose/focus/CD sweep trends can be inspected directly on geometry and contour overlays." },
            { date: "2026-02-20", tag: "model", summary: "Baseline educational guard model with CD_min check", impact: "Features below k₁λ/NA are treated as non-printing. Contour output suppressed." },
          ].map(({ date, tag, summary, impact }) => (
            <div key={date + summary} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid rgba(33,44,64,0.08)" }}>
              <div style={{ flexShrink: 0, minWidth: 90 }}>
                <div style={{ fontSize: 12, fontWeight: 660, color: "rgba(16,28,48,0.55)" }}>{date}</div>
                <span style={{ display: "inline-block", marginTop: 4, padding: "1px 7px", borderRadius: 20, fontSize: 11, fontWeight: 660, background: "rgba(30,80,200,0.07)", color: "rgba(30,80,200,0.8)", border: "1px solid rgba(30,80,200,0.15)" }}>{tag}</span>
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>{summary}</div>
                <div style={{ fontSize: 13, opacity: 0.72, lineHeight: 1.55 }}>{impact}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Upgrade card ─────────────────────────────────────────────── */}
      <UpgradeCard />

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer style={footerStyle}>
        <p style={{ margin: 0, fontSize: 12.5, opacity: 0.55 }}>
          Educational approximation only. Not calibrated for manufacturing sign-off.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <a href="/litopc" style={footerLinkStyle}>← Back to Lab</a>
          <a href="/litopc/opc-guide" style={footerLinkStyle}>OPC Guide</a>
        </div>
      </footer>
    </main>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionBadge({ n }: { n: number }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 24, height: 24, borderRadius: "50%",
      background: "rgba(30,80,200,0.1)", color: "rgba(30,80,200,0.85)",
      fontSize: 12, fontWeight: 720, marginRight: 10, flexShrink: 0,
    }}>{n}</span>
  );
}

function Callout({ type, children }: { type: "info" | "tip" | "caution"; children: React.ReactNode }) {
  const cfg = {
    info:    { bg: "#eef4ff", border: "rgba(30,80,200,0.2)" },
    tip:     { bg: "#f0fbf4", border: "rgba(30,160,80,0.2)" },
    caution: { bg: "#fff8ee", border: "rgba(180,110,20,0.25)" },
  }[type];
  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, padding: "12px 16px", marginTop: 14, fontSize: 14, lineHeight: 1.6 }}>
      {children}
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  if (tier === "All tiers") return <span style={{ fontSize: 12.5, color: "rgba(30,140,70,0.9)" }}>All tiers</span>;
  if (tier.startsWith("Pro")) return <span style={badge("pro")}>Pro +</span>;
  if (tier.startsWith("Research")) return <span style={badge("research")}>Research</span>;
  return <span style={{ fontSize: 12.5, opacity: 0.5 }}>{tier}</span>;
}

const badge = (tier: "pro" | "research"): React.CSSProperties => ({
  display: "inline-block", padding: "2px 8px", borderRadius: 20,
  fontWeight: 660, fontSize: 11.5,
  background: tier === "pro" ? "rgba(30,80,200,0.08)" : "rgba(120,40,160,0.08)",
  color: tier === "pro" ? "rgba(30,80,200,0.9)" : "rgba(120,40,160,0.9)",
  border: tier === "pro" ? "1px solid rgba(30,80,200,0.18)" : "1px solid rgba(120,40,160,0.18)",
});

function UpgradeCard() {
  return (
    <div style={{
      marginTop: 32,
      border: "1px solid rgba(30,80,200,0.18)", borderRadius: 12,
      padding: "20px 22px",
      background: "linear-gradient(135deg, rgba(240,246,255,0.9) 0%, rgba(248,244,255,0.9) 100%)",
    }}>
      <div style={{ fontWeight: 680, fontSize: 14.5, marginBottom: 10 }}>
        Unlock advanced model controls
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 12px", fontSize: 13, alignItems: "start" }}>
        <span style={badge("pro")}>Pro</span>
        <span style={{ opacity: 0.82 }}>Resist blur σ · Isotropic etch bias · 5 OPC iterations/batch</span>
        <span style={badge("research")}>Research</span>
        <span style={{ opacity: 0.82 }}>Partial coherence σ · Custom illumination · Zernike aberrations · TMM material stack · Custom segment size</span>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <a href="/litopc" style={{ ...ctaBtnStyle, background: "rgba(30,80,200,0.9)", color: "#fff" }}>
          Try it free →
        </a>
        <a href="/#pricing" style={{ ...ctaBtnStyle, background: "transparent", color: "rgba(30,80,200,0.85)", border: "1px solid rgba(30,80,200,0.25)" }}>
          View plans
        </a>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  maxWidth: 980, margin: "0 auto", padding: "32px 22px 64px",
  lineHeight: 1.65, color: "rgba(16,28,48,0.92)",
};

const h1Style: React.CSSProperties = {
  margin: 0, fontSize: 38, letterSpacing: "-0.025em", fontWeight: 740,
};

const subtitleStyle: React.CSSProperties = {
  marginTop: 10, fontSize: 16, opacity: 0.68, maxWidth: 640,
};

const navStyle: React.CSSProperties = {
  display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16, alignItems: "center",
};

const backBtnStyle: React.CSSProperties = {
  padding: "5px 14px", borderRadius: 20,
  background: "rgba(30,80,200,0.08)", color: "rgba(30,80,200,0.85)",
  fontSize: 13, fontWeight: 560, textDecoration: "none",
  border: "1px solid rgba(30,80,200,0.15)",
};

const sectionStyle: React.CSSProperties = { marginTop: 40 };

const h2Style: React.CSSProperties = {
  display: "flex", alignItems: "center",
  fontSize: 21, fontWeight: 700, letterSpacing: "-0.01em",
  marginBottom: 14, paddingBottom: 8,
  borderBottom: "1px solid rgba(33,44,64,0.1)",
};

const codeBlockStyle: React.CSSProperties = {
  background: "rgba(18,28,48,0.04)", border: "1px solid rgba(33,44,64,0.1)",
  borderRadius: 8, padding: "14px 16px", fontFamily: "monospace",
  fontSize: 13, lineHeight: 1.8, whiteSpace: "pre", overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%", borderCollapse: "collapse",
  border: "1px solid rgba(25,35,52,0.13)", fontSize: 13.5,
};

const theadRowStyle: React.CSSProperties = { background: "rgba(15,30,80,0.07)" };

const thStyle: React.CSSProperties = {
  padding: "9px 12px", textAlign: "left", fontWeight: 650,
  borderBottom: "1px solid rgba(25,35,52,0.13)",
  borderRight: "1px solid rgba(25,35,52,0.08)",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 12px", borderBottom: "1px solid rgba(25,35,52,0.08)",
  borderRight: "1px solid rgba(25,35,52,0.06)", verticalAlign: "top",
};

const zebraStyle: React.CSSProperties = { background: "rgba(248,251,255,0.55)" };

const faqCardStyle: React.CSSProperties = {
  borderLeft: "3px solid rgba(30,80,200,0.25)",
  padding: "12px 16px", borderRadius: "0 8px 8px 0",
  background: "rgba(246,250,255,0.6)",
};

const footerStyle: React.CSSProperties = {
  marginTop: 48, paddingTop: 18,
  borderTop: "1px solid rgba(33,44,64,0.1)",
};

const footerLinkStyle: React.CSSProperties = {
  fontSize: 13, color: "rgba(30,80,200,0.7)", textDecoration: "none",
  padding: "4px 10px", borderRadius: 6,
  background: "rgba(30,80,200,0.05)",
};

const linkStyle: React.CSSProperties = { color: "rgba(30,80,200,0.8)" };

const ctaBtnStyle: React.CSSProperties = {
  display: "inline-block", padding: "7px 16px", borderRadius: 8,
  fontSize: 13, fontWeight: 600, textDecoration: "none",
};
