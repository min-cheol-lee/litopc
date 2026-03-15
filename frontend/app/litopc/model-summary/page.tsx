import type { CSSProperties } from "react";

export default function ModelSummaryPage() {
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "28px 22px 44px", lineHeight: 1.6 }}>
      <h1 style={{ margin: 0, fontSize: 36, letterSpacing: "-0.02em" }}>litopc Imaging & Limits Guide</h1>
      <p style={{ marginTop: 10, opacity: 0.78 }}>
        Educational approximation only. Not calibrated for manufacturing sign-off.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
        <a className="model-guide-link" href="/litopc/opc-guide">OPC Guide</a>
        <a className="model-guide-link" href="/litopc/benchmark-gallery">Benchmark Gallery</a>
        <a className="model-guide-link" href="/litopc/model-change-log">Model Change Log</a>
        <a className="model-guide-link" href="/litopc/trust-dashboard">Trust Dashboard</a>
        <a className="model-guide-link" href="/litopc">Back to Lab</a>
      </div>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 24, marginBottom: 10 }}>1) Model Scope</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid rgba(25,35,52,0.16)" }}>
          <thead>
            <tr style={{ background: "rgba(240,245,252,0.75)" }}>
              <th style={thStyle}>Layer</th>
              <th style={thStyle}>Current Model</th>
              <th style={thStyle}>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>Mask</td>
              <td style={tdStyle}>Binary rectangle rasterization</td>
              <td style={tdStyle}>No absorber 3D, no full reflective EUV mask stack physics</td>
            </tr>
            <tr>
              <td style={tdStyle}>Optics</td>
              <td style={tdStyle}>Scalar coherent proxy — FFT pupil + Gaussian MTF + focus blur</td>
              <td style={tdStyle}>No partial coherence (σ), no Zernike aberrations, no source-shape modeling. n = 1 assumed throughout image space.</td>
            </tr>
            <tr>
              <td style={tdStyle}>Material stack</td>
              <td style={tdStyle}>Not modeled — n = 1 free-space assumed</td>
              <td style={tdStyle}>No substrate reflectivity, no thin-film standing wave, no BARC/resist stack. Aerial image computed at resist surface only.</td>
            </tr>
            <tr>
              <td style={tdStyle}>Resist</td>
              <td style={tdStyle}>Binary threshold on aerial intensity</td>
              <td style={tdStyle}>No resist blur, no contrast model. Dose = normalized intensity threshold [0, 1], not physical mJ/cm²</td>
            </tr>
            <tr>
              <td style={tdStyle}>Etch bias</td>
              <td style={tdStyle}>None — contour = resist edge = silicon edge</td>
              <td style={tdStyle}>No isotropic or proximity-dependent etch offset is applied</td>
            </tr>
            <tr>
              <td style={tdStyle}>Contour</td>
              <td style={tdStyle}>Iso-contour at level = dose</td>
              <td style={tdStyle}>Represents resist-printed boundary, not post-etch silicon</td>
            </tr>
            <tr>
              <td style={tdStyle}>CD Metric</td>
              <td style={tdStyle}>Center-line simple CD + Rayleigh printability guard</td>
              <td style={tdStyle}>Sub-limit requested CD is treated as non-printing</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 24, marginBottom: 10 }}>2) Core Simulation Flow</h2>
        <pre style={preStyle}>{`Mask (rectangles)
  → rasterize to binary amplitude mask
  → FFT optics: pupil cutoff (NA/λ) × Gaussian MTF (0.10·λ/NA) × focus blur
     [n = 1 assumed; no thin-film stack; aerial image at resist surface only]
  → aerial intensity I(x,y), clipped to [0, 1]  ← absolute scale, open field ≈ 1.0
  → resist: printed(x,y) = 1  if  I(x,y) ≥ dose  else 0  ← binary threshold
  → contour extraction at iso-level = dose
  → CD metric (center-line) + Rayleigh printability guard`}</pre>
        <p style={{ marginTop: 12, fontSize: 13.5, opacity: 0.75 }}>
          No etch step is applied. No material stack (BARC, substrate) is modeled.
          The extracted contour represents the resist-developed boundary, not the post-etch silicon feature.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 24, marginBottom: 10 }}>3) DUV/EUV Limit Logic (Rayleigh Guard)</h2>
        <p>
          The app applies an industry-style printability criterion using
          <b> CD_min ~= k1 * lambda / NA</b>. If the requested nominal CD is below this floor,
          the result is treated as non-printing (contours removed, CD metric omitted).
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid rgba(25,35,52,0.16)" }}>
          <thead>
            <tr style={{ background: "rgba(240,245,252,0.75)" }}>
              <th style={thStyle}>Regime</th>
              <th style={thStyle}>Preset</th>
              <th style={thStyle}>k1 (guard)</th>
              <th style={thStyle}>Approx CD_min</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>DUV | 193 nm Dry</td>
              <td style={tdStyle}>NA 0.93</td>
              <td style={tdStyle}>0.28</td>
              <td style={tdStyle}>~58 nm</td>
            </tr>
            <tr>
              <td style={tdStyle}>DUV | 193 nm Immersion</td>
              <td style={tdStyle}>NA 1.35</td>
              <td style={tdStyle}>0.26</td>
              <td style={tdStyle}>~37 nm</td>
            </tr>
            <tr>
              <td style={tdStyle}>EUV | 13.5 nm Low-NA</td>
              <td style={tdStyle}>13.5 nm, NA 0.33</td>
              <td style={tdStyle}>0.30</td>
              <td style={tdStyle}>~12.3 nm</td>
            </tr>
            <tr>
              <td style={tdStyle}>EUV | 13.5 nm High-NA</td>
              <td style={tdStyle}>13.5 nm, NA 0.55</td>
              <td style={tdStyle}>0.26</td>
              <td style={tdStyle}>~6.4 nm</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 24, marginBottom: 10 }}>4) Why Small SRAF-Like Lines Can Disappear</h2>
        <p>
          Very thin assist-like lines can be below the printability floor for the selected wavelength/NA pair.
          In that case, the model suppresses printed contour output by design. This prevents false-positive
          printing that can happen when each pattern is independently normalized.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 24, marginBottom: 10 }}>5) Optical Parameters Explained</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid rgba(25,35,52,0.16)" }}>
          <thead>
            <tr style={{ background: "rgba(240,245,252,0.75)" }}>
              <th style={thStyle}>Parameter</th>
              <th style={thStyle}>Physical Meaning</th>
              <th style={thStyle}>In this simulator</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}><strong>Dose</strong></td>
              <td style={tdStyle}>Exposure energy (mJ/cm²) × resist sensitivity</td>
              <td style={tdStyle}>Normalized aerial-intensity threshold [0, 1]. Higher dose = less printed area (higher bar to expose). Not in mJ/cm².</td>
            </tr>
            <tr>
              <td style={tdStyle}><strong>Focus</strong> (Pro)</td>
              <td style={tdStyle}>Defocus Δz from best focus plane</td>
              <td style={tdStyle}>Proxy [0, 1]. At 0 = sharpest imaging. Higher values apply additional Gaussian blur to the aerial image. Not in nm.</td>
            </tr>
            <tr>
              <td style={tdStyle}><strong>NA</strong></td>
              <td style={tdStyle}>Numerical aperture — sets the optical bandwidth</td>
              <td style={tdStyle}>Set by preset. Determines pupil cutoff frequency and Rayleigh CD floor.</td>
            </tr>
            <tr>
              <td style={tdStyle}><strong>λ</strong></td>
              <td style={tdStyle}>Illumination wavelength</td>
              <td style={tdStyle}>193 nm (DUV) or 13.5 nm (EUV). Set by preset. Scales both pupil cutoff and diffraction blur.</td>
            </tr>
            <tr>
              <td style={tdStyle}><strong>σ (partial coherence)</strong></td>
              <td style={tdStyle}>Source coherence — determines NILS and DoF</td>
              <td style={tdStyle}>Not yet exposed as a user control. Internal value σ = 0.7 applies to all presets via the diffraction blur term.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 24, marginBottom: 10 }}>6) Physics Simplifications</h2>
        <ul style={{ lineHeight: 1.8, fontSize: 14 }}>
          <li><strong>Optics:</strong> scalar coherent approximation — no vector polarization, no partial coherence (σ), no Zernike aberrations.</li>
          <li><strong>Material stack:</strong> n = 1 throughout image space — no substrate reflectivity, no thin-film standing wave, no BARC/TARC. Aerial image computed at resist surface only.</li>
          <li><strong>Resist:</strong> binary threshold only — no acid-diffusion blur, no contrast model (γ), no development kinetics.</li>
          <li><strong>Etch:</strong> not modeled — contour = resist edge. No isotropic, proximity, or loading-effect bias.</li>
          <li><strong>Mask:</strong> binary transmission, rectangles only. No sub-resolution assist features (SRAF).</li>
          <li><strong>k₁ limits:</strong> conservative educational guardrails (DUV dry 0.28, DUV imm 0.26, EUV LNA 0.30, EUV HNA 0.26) — not process-of-record values.</li>
        </ul>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 24, marginBottom: 10 }}>7) Material Stack & Thin-Film Effects</h2>
        <p style={{ fontSize: 14, marginBottom: 12 }}>
          Real lithography stacks (substrate / BARC / resist / topcoat) create thin-film interference that affects
          the effective intensity inside the resist. litopc does not model this — the aerial image is computed at
          the resist surface assuming a uniform n = 1 medium. Here is what that omission means in practice:
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid rgba(25,35,52,0.16)" }}>
          <thead>
            <tr style={{ background: "rgba(240,245,252,0.75)" }}>
              <th style={thStyle}>Effect</th>
              <th style={thStyle}>Physical Cause</th>
              <th style={thStyle}>Typical CD Impact</th>
              <th style={thStyle}>In litopc</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}><strong>Standing wave</strong></td>
              <td style={tdStyle}>Incident + substrate-reflected light interfere in Z. Period = λ/(2·n_resist) ≈ 57 nm for DUV.</td>
              <td style={tdStyle}>±3–8 nm CD swing with resist thickness (no BARC)</td>
              <td style={tdStyle}>Not modeled. Negligible when BARC is used (R &lt; 1%).</td>
            </tr>
            <tr>
              <td style={tdStyle}><strong>Substrate reflectivity</strong></td>
              <td style={tdStyle}>Si reflects ~35% at 193 nm; adds to effective absorbed dose.</td>
              <td style={tdStyle}>Dose shift equivalent to ±5–10 nm CD (without BARC)</td>
              <td style={tdStyle}>Not modeled. Absorbed into the dose threshold calibration.</td>
            </tr>
            <tr>
              <td style={tdStyle}><strong>BARC</strong></td>
              <td style={tdStyle}>Anti-reflection coating tuned to suppress substrate reflection.</td>
              <td style={tdStyle}>Reduces CD swing to &lt;0.5 nm when optimized</td>
              <td style={tdStyle}>Implicitly assumed present (justifies n=1 approximation).</td>
            </tr>
            <tr>
              <td style={tdStyle}><strong>3D resist profile</strong></td>
              <td style={tdStyle}>Absorption gradient → tapered sidewalls, footing.</td>
              <td style={tdStyle}>Sidewall angle 80–88° typical</td>
              <td style={tdStyle}>Out of scope — 2D model only.</td>
            </tr>
          </tbody>
        </table>
        <p style={{ marginTop: 12, fontSize: 13.5, opacity: 0.75 }}>
          For most educational and planning purposes, assuming BARC suppresses standing waves makes the
          2D aerial-image approximation a reasonable proxy for the printed CD. The dose slider absorbs
          the effective stack reflectance offset implicitly.
        </p>
        <p style={{ marginTop: 8, fontSize: 13.5, opacity: 0.75 }}>
          <strong>Research tier (planned):</strong> Transfer Matrix Method (TMM) reflectivity correction —
          users provide a material stack (n, k, thickness per layer) as a JSON object and the simulator
          adjusts the effective dose accordingly.
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 24, marginBottom: 10 }}>8) FAQ</h2>
        {[
          ["Is this sign-off accurate?",
           "No. Educational visualization only. Results are physics-inspired approximations, not calibrated for manufacturing."],
          ["Why does changing dose move the contour so strongly?",
           "Dose is directly the aerial-intensity threshold. Lowering it means a fainter aerial signal can still expose the resist — expanding the printed area. Real lithography doses are buffered by resist contrast (γ), which this model does not include."],
          ["What does the contour actually represent?",
           "The resist-developed boundary after applying the dose threshold to the aerial image. It is not the post-etch silicon edge — no etch bias is applied."],
          ["Why doesn't a very small feature print?",
           "The Rayleigh printability guard (CD_min = k₁·λ/NA) removes contours when the requested feature size is below the physical resolution limit of the selected optical tool."],
          ["Does the model account for substrate reflection or BARC?",
           "No. The aerial image is computed assuming n = 1 throughout. In practice, this is a good approximation when an optimized BARC is used (substrate reflectivity < 1%). Without BARC, substrate reflections (up to ~35% for bare Si at 193 nm) would shift the effective dose — this is absorbed implicitly into the dose threshold in the current model."],
          ["Can the model be extended with a custom resist, etch, or material stack?",
           "Not in the current release. Pro will add a resist blur slider (σ_resist) and isotropic etch bias. Research tier will expose a full sigmoid resist model, Zernike aberration input, and TMM-based material stack correction."],
        ].map(([q, a]) => (
          <p key={q as string} style={{ marginTop: 12, fontSize: 14 }}>
            <strong>Q: {q}</strong><br />
            <span style={{ opacity: 0.8 }}>A: {a}</span>
          </p>
        ))}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 24, marginBottom: 10 }}>9) Reference Notes for k₁ Guard</h2>
        <p>
          The k1 guard values in this app are hard-coded educational guardrails, selected from common
          industry Rayleigh ranges rather than copied from a single process-of-record.
        </p>
        <ul>
          <li>
            ASML Rayleigh criterion overview (CD = k1 * lambda / NA, physical bound near k1=0.25):{" "}
            <a href="https://www.asml.com/en/technology/lithography-principles/rayleigh-criterion" target="_blank" rel="noreferrer">
              asml.com/.../rayleigh-criterion
            </a>
          </li>
          <li>
            Micron photolithography educational material (practical k1 context beyond theoretical bound):{" "}
            <a
              href="https://www.micron.com/content/dam/micron/educatorhub/fabrication/photolithography/micron-fabrication-intro-to-photolithography-presentation.pdf"
              target="_blank"
              rel="noreferrer"
            >
              micron.com photolithography presentation
            </a>
          </li>
          <li>
            EUV symposium material used for NA/CD scaling intuition (0.33 NA vs high-NA trend):{" "}
            <a href="https://euvlsymposium.lbl.gov/pdf/2012/pres/V.%20Banine.pdf" target="_blank" rel="noreferrer">
              euvlsymposium.lbl.gov V. Banine
            </a>
          </li>
        </ul>
        <p>
          Current hard-coded values: DUV dry 0.28, DUV immersion 0.26, EUV low-NA 0.30, EUV high-NA 0.26.
        </p>
      </section>
    </main>
  );
}

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid rgba(25,35,52,0.16)",
  borderRight: "1px solid rgba(25,35,52,0.12)",
  fontWeight: 650,
  fontSize: 14,
};

const tdStyle: CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid rgba(25,35,52,0.12)",
  borderRight: "1px solid rgba(25,35,52,0.12)",
  fontSize: 14,
};

const preStyle: CSSProperties = {
  margin: 0,
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid rgba(25,35,52,0.14)",
  background: "rgba(245,248,253,0.7)",
  fontSize: 14,
};
