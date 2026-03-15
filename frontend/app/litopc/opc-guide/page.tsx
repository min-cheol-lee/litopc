export default function OpcGuidePage() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "28px 22px 56px", lineHeight: 1.65, color: "rgba(16,28,48,0.92)" }}>

      {/* Header */}
      <h1 style={{ margin: 0, fontSize: 36, letterSpacing: "-0.025em", fontWeight: 720 }}>
        Model-Based OPC Correction
      </h1>
      <p style={{ marginTop: 10, fontSize: 16, opacity: 0.72, maxWidth: 680 }}>
        How litopc iteratively reshapes mask polygons so the simulated printed contour
        matches your design target — and what happens under the hood.
      </p>

      {/* Nav */}
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        {[
          ["Model Guide", "/litopc/model-summary"],
          ["Benchmark Gallery", "/litopc/benchmark-gallery"],
          ["Trust Dashboard", "/litopc/trust-dashboard"],
          ["Model Change Log", "/litopc/model-change-log"],
          ["← Back to Lab", "/litopc"],
        ].map(([label, href]) => (
          <a key={href} className="model-guide-link" href={href}>{label}</a>
        ))}
      </nav>

      {/* 1 — Why OPC */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>1 — Why OPC?</h2>
        <p>
          Light diffracts. When a 100 nm feature is imaged through a lens with wavelength λ = 193 nm,
          the aerial intensity pattern at wafer level is heavily blurred — corners round, line-ends
          pull back, and contacts shrink asymmetrically. Without correction, the printed shape
          can differ from the intended design by tens of nanometers.
        </p>
        <p>
          <strong>Optical Proximity Correction (OPC)</strong> pre-distorts the mask so that after
          diffraction and resist exposure, the printed shape is as close to the design intent as
          possible. Rule-based OPC uses fixed biasing tables derived from process characterization.
          Model-based OPC — what litopc implements — uses a fast simulation loop to measure the
          error directly and converge on the correct mask shape.
        </p>
        <div style={calloutStyle("#eef4ff", "rgba(30,80,200,0.15)")}>
          <strong>Analogy:</strong> Imagine shooting at a target while accounting for wind.
          Rule-based OPC says "wind is usually from the west, offset 5 cm left."
          Model-based OPC measures the actual wind each shot and adjusts accordingly.
        </div>
      </section>

      {/* 2 — The EPE Feedback Loop */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>2 — The EPE Feedback Loop</h2>
        <p>
          The correction algorithm is built around <strong>Edge Placement Error (EPE)</strong>:
          the signed distance from the simulated contour to the target edge, measured along
          the outward normal of that edge.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14 }}>
          <div style={cardStyle}>
            <div style={cardLabelStyle}>EPE &lt; 0</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              Contour is <em>inside</em> the target → mask needs to grow outward
            </div>
          </div>
          <div style={cardStyle}>
            <div style={cardLabelStyle}>EPE &gt; 0</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              Contour is <em>outside</em> the target → mask needs to shrink inward
            </div>
          </div>
        </div>

        <p style={{ marginTop: 16 }}>Each iteration follows four steps:</p>
        <ol style={{ paddingLeft: 22, display: "grid", gap: 6 }}>
          <li><strong>Simulate</strong> the current mask → extract the printed contour at the dose threshold.</li>
          <li><strong>Sample</strong> N evenly-spaced points along each target edge (15 % margin from corners).</li>
          <li><strong>Measure EPE</strong> at each sample: find nearest contour point, project onto outward normal.</li>
          <li><strong>Bias</strong> the mask edge by <code>−gain × mean(EPE)</code> in the outward direction.</li>
        </ol>

        <div style={codeBlockStyle}>
{`delta = −gain × mean_EPE

// Apply to edge:
left   → x_nm  −= delta   (outward = −x)
right  → w_nm  += delta   (outward = +x)
top    → y_nm  −= delta   (outward = −y)
bottom → h_nm  += delta   (outward = +y)`}
        </div>

        <p>
          Sampling is performed on the <em>target</em> edge position (fixed reference frame),
          not on the shifting mask edge. This keeps the EPE measurement stable across iterations
          and prevents feedback oscillation.
        </p>
      </section>

      {/* 3 — Sub-Segmentation */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>3 — Sub-Segmentation for Shape Correction</h2>
        <p>
          A single un-segmented rectangle can only move its edges uniformly — the entire left edge
          shifts by the same amount. Real OPC correction creates <em>non-uniform</em> edge profiles:
          hammerheads at line ends, serifs at corners, asymmetric bias near adjacent features.
        </p>
        <p>
          litopc splits each mask shape into smaller cells before running the correction loop.
          Each cell then corrects its own portion of the edge independently.
        </p>

        <table style={tableStyle}>
          <thead>
            <tr style={{ background: "rgba(240,245,252,0.75)" }}>
              <th style={thStyle}>Shape</th>
              <th style={thStyle}>Condition</th>
              <th style={thStyle}>Segmentation</th>
              <th style={thStyle}>Result</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>Contact hole / pad</td>
              <td style={tdStyle}>Aspect ratio &lt; 2</td>
              <td style={tdStyle}>2D grid (N × M cells)</td>
              <td style={tdStyle}>Corner serifs emerge naturally</td>
            </tr>
            <tr>
              <td style={tdStyle}>Vertical line</td>
              <td style={tdStyle}>h ≥ w, AR ≥ 2</td>
              <td style={tdStyle}>Horizontal strips</td>
              <td style={tdStyle}>Hammerheads at line ends</td>
            </tr>
            <tr>
              <td style={tdStyle}>Horizontal line</td>
              <td style={tdStyle}>w &gt; h, AR ≥ 2</td>
              <td style={tdStyle}>Vertical strips</td>
              <td style={tdStyle}>Line-end pullback compensation</td>
            </tr>
          </tbody>
        </table>

        <p style={{ marginTop: 14 }}>
          Internal boundaries between adjacent cells are automatically detected and skipped —
          only the <em>outer</em> edges of the union are corrected. This works by probing 2 nm
          outward from each edge: if the probe lands inside a neighboring cell, the edge
          is marked interior.
        </p>

        <div style={calloutStyle("#f0fbf4", "rgba(30,160,80,0.15)")}>
          <strong>Segment size and lithography physics:</strong> The minimum segment size is
          chosen per process node so that each cell remains above the Rayleigh printability
          floor (k₁λ/NA). Cells below this floor would produce no contour and stall correction.
          DUV dry uses 80 nm cells; EUV can use 15–20 nm.
        </div>
      </section>

      {/* 4 — Convergence */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>4 — Convergence and Auto-Stop</h2>
        <p>
          OPC is not guaranteed to converge monotonically. Gain values that are too high cause
          oscillation; features near the Rayleigh limit can diverge when the mask grows into
          diffraction-dominated territory.
        </p>
        <p>
          litopc monitors EPE after each iteration within a batch. If the EPE rises more than
          20 % above the best value seen in that batch for two consecutive iterations,
          the run is automatically stopped. After each batch, the UI classifies the outcome:
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 8 }}>
          {[
            { label: "Improved", desc: "> 5 % EPE reduction", color: "#e6f8ee", border: "rgba(30,160,80,0.2)" },
            { label: "Plateau", desc: "< 5 % reduction — further iterations unlikely to help", color: "#fffbec", border: "rgba(160,120,20,0.2)" },
            { label: "Diverged", desc: "EPE increased — roll back recommended", color: "#fff0ee", border: "rgba(200,60,40,0.2)" },
          ].map(({ label, desc, color, border }) => (
            <div key={label} style={{ background: color, border: `1px solid ${border}`, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontWeight: 650, fontSize: 13 }}>{label}</div>
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>{desc}</div>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 14 }}>
          A <strong>rollback checkpoint</strong> is saved before each "+5 iter" continuation batch.
          If results worsen, one click restores the previous mask, contours, and EPE history.
        </p>
      </section>

      {/* 5 — MRC Constraints */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>5 — Mask Rule Check (MRC) Constraints</h2>
        <p>
          Real photomask manufacturing imposes geometric ground rules — collectively called
          MRC — that OPC must respect. Violating them produces masks that either cannot be
          fabricated or print incorrectly. litopc enforces three classes of MRC constraint
          on every edge delta before it is applied.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          {[
            {
              label: "Min CD — no break",
              desc: "Minimum feature width / height. A cell that shrinks below the Rayleigh printability floor creates a physical disconnection — the mask 'breaks' mid-feature. OPC is clamped so this never happens.",
              color: "#eef4ff",
              border: "rgba(30,80,200,0.15)",
            },
            {
              label: "Min Space — no bridge",
              desc: "Minimum gap between distinct shapes. Outward OPC growth is clamped so two separately-corrected cells cannot merge into an unintended bridge connection.",
              color: "#f0fbf4",
              border: "rgba(30,160,80,0.15)",
            },
            {
              label: "Max Bias — bounded amplitude",
              desc: "Maximum edge displacement from the batch-start position. Bounds the total correction amplitude per run so extreme staircase profiles remain within manufacturable limits.",
              color: "#fffbec",
              border: "rgba(160,120,20,0.15)",
            },
            {
              label: "Grid snap — e-beam writeability",
              desc: "All edge coordinates are snapped to the manufacturing grid after each iteration (1 nm for DUV, 0.5 nm for EUV). Prevents sub-grid features that an e-beam mask writer cannot address.",
              color: "#fdf0ff",
              border: "rgba(120,40,160,0.15)",
            },
          ].map(({ label, desc, color, border }) => (
            <div key={label} style={{ background: color, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontWeight: 650, fontSize: 13 }}>{label}</div>
              <div style={{ fontSize: 12.5, marginTop: 5, lineHeight: 1.5, opacity: 0.85 }}>{desc}</div>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 16 }}>
          Each constraint is preset-specific. Min CD and min space are derived from
          the Rayleigh resolution limit (k₁·λ/NA); max bias is ≈ half the segment size;
          grid pitch reflects the e-beam address unit for each process node:
        </p>

        <table style={tableStyle}>
          <thead>
            <tr style={{ background: "rgba(240,245,252,0.75)" }}>
              <th style={thStyle}>Process</th>
              <th style={thStyle}>Min CD</th>
              <th style={thStyle}>Min Space</th>
              <th style={thStyle}>Max Bias</th>
              <th style={thStyle}>Grid</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["DUV 193 nm Dry (NA 0.93)", "50 nm", "50 nm", "40 nm", "1 nm"],
              ["DUV 193 nm Imm (NA 1.35)", "32 nm", "32 nm", "25 nm", "1 nm"],
              ["EUV Low NA (13.5 nm, NA 0.33)", "12 nm", "12 nm", "10 nm", "0.5 nm"],
              ["EUV High NA (13.5 nm, NA 0.55)", "6 nm", "6 nm", "6 nm", "0.5 nm"],
            ].map(([proc, cd, sp, bias, grid]) => (
              <tr key={proc}>
                <td style={tdStyle}>{proc}</td>
                <td style={tdStyle}>{cd}</td>
                <td style={tdStyle}>{sp}</td>
                <td style={tdStyle}>{bias}</td>
                <td style={tdStyle}>{grid}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={calloutStyle("#f0fbf4", "rgba(30,160,80,0.15)")}>
          <strong>What MRC does not cover here:</strong> diagonal proximity, mask-to-mask
          layer interactions, resist/etch bias, and sub-resolution assist feature (SRAF)
          placement — all of which are enforced post-OPC in production EDA flows.
          In litopc these remain out of scope (educational model).
        </div>
      </section>

      {/* 6 — Parameters */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>6 — Algorithm Parameters</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: "rgba(240,245,252,0.75)" }}>
              <th style={thStyle}>Parameter</th>
              <th style={thStyle}>Default</th>
              <th style={thStyle}>Effect</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}><code>iterations</code></td>
              <td style={tdStyle}>5</td>
              <td style={tdStyle}>Number of simulate → correct cycles per batch</td>
            </tr>
            <tr>
              <td style={tdStyle}><code>gain</code></td>
              <td style={tdStyle}>0.5</td>
              <td style={tdStyle}>Fraction of mean EPE applied per iteration (0 = no correction, 1 = full)</td>
            </tr>
            <tr>
              <td style={tdStyle}><code>nSamples</code></td>
              <td style={tdStyle}>7</td>
              <td style={tdStyle}>Sample points per edge for EPE averaging</td>
            </tr>
            <tr>
              <td style={tdStyle}><code>segmentNm</code></td>
              <td style={tdStyle}>preset-dependent</td>
              <td style={tdStyle}>Target cell size for sub-segmentation</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 7 — Limitations */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>7 — Scope and Limitations</h2>
        <p>
          litopc implements a physically grounded but intentionally simplified OPC engine.
          It is accurate enough to demonstrate the key phenomena and give intuition for
          real-world OPC — not to replace production EDA tools.
        </p>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: "rgba(240,245,252,0.75)" }}>
              <th style={thStyle}>In scope</th>
              <th style={thStyle}>Out of scope / planned</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdStyle}>Edge-by-edge EPE measurement and correction</td>
              <td style={tdStyle}>Full vector / partial coherence imaging</td>
            </tr>
            <tr>
              <td style={tdStyle}>Sub-segmented 2D contacts and lines</td>
              <td style={tdStyle}>Inter-feature proximity / SRAF placement</td>
            </tr>
            <tr>
              <td style={tdStyle}>DUV 193 nm and EUV 13.5 nm nodes</td>
              <td style={tdStyle}>Diagonal proximity, layer-to-layer rules</td>
            </tr>
            <tr>
              <td style={tdStyle}>MRC: min CD, min space, max bias, grid snap</td>
              <td style={tdStyle}>Full-chip OPC (single-feature only)</td>
            </tr>
            <tr>
              <td style={tdStyle}>Convergence detection, best-iter restore, rollback</td>
              <td style={tdStyle}>Resist model beyond binary threshold (planned — Pro/Research)</td>
            </tr>
            <tr>
              <td style={tdStyle}>Auto-reset on preset change</td>
              <td style={tdStyle}>Etch bias model (planned — Pro/Research)</td>
            </tr>
          </tbody>
        </table>

        <div style={calloutStyle("#fff8ee", "rgba(160,100,20,0.18)")}>
          <strong>What the OPC contour represents:</strong> EPE is measured against the
          resist-printed contour — the aerial image after dose thresholding. No etch step
          is applied. In a real process flow the OPC target would be offset by the etch
          bias so the final silicon CD matches the design intent. litopc does not apply
          this offset today; resist blur (σ_resist) and etch bias will be introduced as
          Pro and Research plan features.
        </div>
      </section>

      {/* 8 — OPC Parameters */}
      <section style={sectionStyle}>
        <h2 style={h2Style}>8 — OPC Algorithm Parameters</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: "rgba(240,245,252,0.75)" }}>
              <th style={thStyle}>Parameter</th>
              <th style={thStyle}>Default</th>
              <th style={thStyle}>Effect</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["gain", "0.5", "Fraction of mean EPE applied per iteration. Adapted downward when EPE worsens (floor: gain / 4)."],
              ["iterations", "3 (Free) / 5 (Pro)", "Simulate → correct cycles per batch. Continue adds another batch."],
              ["nSamples", "7", "EPE sample points per edge. More samples reduce noise on curved contours."],
              ["segmentNm", "preset-dependent", "Target cell size for sub-segmentation. Smaller cells allow finer edge profiles but must stay above the Rayleigh printability floor."],
              ["maxBiasNm", "preset-dependent", "Maximum edge displacement per batch. Resets each batch; limits staircase amplitude."],
              ["gridNm", "1 nm (DUV) / 0.5 nm (EUV)", "Manufacturing grid. All edges snapped after each iteration."],
            ].map(([param, def, effect]) => (
              <tr key={param as string}>
                <td style={tdStyle}><code>{param}</code></td>
                <td style={tdStyle}>{def}</td>
                <td style={tdStyle}>{effect}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={calloutStyle("#eef4ff", "rgba(30,80,200,0.15)")}>
          <strong>Segment size and fidelity:</strong> The default segment sizes (DUV dry: 80 nm,
          DUV imm: 50 nm, EUV LNA: 20 nm, EUV HNA: 15 nm) are chosen to sit safely above the
          Rayleigh printability floor for each process node. Reducing segment size improves
          correction fidelity on complex shapes but each cell must remain printable.
        </div>
      </section>

      {/* Footer note */}
      <p style={{ marginTop: 36, fontSize: 12.5, opacity: 0.55, borderTop: "1px solid rgba(33,44,64,0.1)", paddingTop: 16 }}>
        This simulation uses a scalar coherent imaging proxy with a binary-threshold resist model and no etch bias.
        Results are educational approximations — not calibrated for manufacturing sign-off.
        See the <a href="/litopc/model-summary" style={{ color: "inherit" }}>Model Guide</a> for optical parameters, resist/etch assumptions, and the physics simplification list.
      </p>
    </main>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = { marginTop: 36 };

const h2Style: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 680,
  letterSpacing: "-0.01em",
  marginBottom: 12,
  paddingBottom: 6,
  borderBottom: "1px solid rgba(33,44,64,0.1)",
};

const calloutStyle = (bg: string, border: string): React.CSSProperties => ({
  background: bg,
  border: `1px solid ${border}`,
  borderRadius: 10,
  padding: "12px 16px",
  marginTop: 14,
  fontSize: 14,
});

const cardStyle: React.CSSProperties = {
  border: "1px solid rgba(33,44,64,0.13)",
  borderRadius: 10,
  padding: "12px 14px",
  background: "rgba(246,250,255,0.8)",
};

const cardLabelStyle: React.CSSProperties = {
  fontWeight: 680,
  fontSize: 14,
  letterSpacing: "0.01em",
};

const codeBlockStyle: React.CSSProperties = {
  background: "rgba(22,32,50,0.04)",
  border: "1px solid rgba(33,44,64,0.1)",
  borderRadius: 8,
  padding: "12px 16px",
  fontFamily: "monospace",
  fontSize: 13,
  lineHeight: 1.8,
  whiteSpace: "pre",
  overflowX: "auto",
  marginTop: 14,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  border: "1px solid rgba(25,35,52,0.14)",
  fontSize: 13.5,
};

const thStyle: React.CSSProperties = {
  padding: "8px 12px",
  textAlign: "left",
  fontWeight: 640,
  borderBottom: "1px solid rgba(25,35,52,0.14)",
  borderRight: "1px solid rgba(25,35,52,0.08)",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid rgba(25,35,52,0.08)",
  borderRight: "1px solid rgba(25,35,52,0.06)",
  verticalAlign: "top",
};
