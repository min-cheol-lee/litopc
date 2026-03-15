"use client";
import { useState } from "react";

export default function OpcGuidePage() {
  return (
    <main style={pageStyle}>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={h1Style}>Model-Based OPC Correction</h1>
          <p style={subtitleStyle}>
            How litopc iteratively reshapes mask polygons so the printed contour
            matches your design target — and what happens under the hood.
          </p>
          <nav style={navStyle}>
            {[
              ["Model Guide", "/litopc/model-summary"],
              ["Benchmark Gallery", "/litopc/benchmark-gallery"],
              ["Trust Dashboard", "/litopc/trust-dashboard"],
              ["Model Change Log", "/litopc/model-change-log"],
            ].map(([label, href]) => (
              <a key={href} className="model-guide-link" href={href}>{label}</a>
            ))}
            <a href="/litopc" style={backBtnStyle}>← Back to Lab</a>
          </nav>
        </div>
      </div>

      {/* ── §1 Why OPC? ──────────────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={h2Style}><SectionBadge n={1} />Why OPC?</h2>
        <p>
          Light diffracts. A 100 nm feature imaged at λ = 193 nm arrives at the wafer
          heavily blurred — corners round, line-ends pull back, contacts shrink
          asymmetrically. Without correction the printed shape can deviate from design
          intent by tens of nanometers.
        </p>
        <p style={{ marginTop: 10 }}>
          <strong>Optical Proximity Correction (OPC)</strong> pre-distorts the mask so
          that after diffraction and resist exposure the printed shape is as close to the
          design intent as possible. Rule-based OPC uses fixed biasing tables.
          Model-based OPC — what litopc implements — measures the error directly each
          iteration and converges on the correct mask shape.
        </p>
        <Callout type="info">
          <strong>Analogy:</strong> Imagine shooting at a target in wind. Rule-based OPC
          says "wind is usually from the west — offset 5 cm left." Model-based OPC
          measures the actual wind each shot and adjusts accordingly.
        </Callout>
      </section>

      {/* ── §2 EPE Feedback Loop ─────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={h2Style}><SectionBadge n={2} />The EPE Feedback Loop</h2>
        <p>
          The algorithm is built around <strong>Edge Placement Error (EPE)</strong>:
          the signed distance from the simulated contour to the target edge, measured
          along the outward normal.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          <StatCard label="EPE < 0" desc="Contour is inside the target → mask grows outward" />
          <StatCard label="EPE > 0" desc="Contour is outside the target → mask shrinks inward" />
        </div>

        <p style={{ marginTop: 16 }}>Each iteration follows four steps:</p>
        <ol style={{ paddingLeft: 22, display: "grid", gap: 7, marginTop: 6 }}>
          <li><strong>Simulate</strong> the current mask → extract printed contour at dose threshold.</li>
          <li><strong>Sample</strong> N evenly-spaced points along each target edge (15% margin from corners).</li>
          <li><strong>Measure EPE</strong> at each sample: find nearest contour point, project onto outward normal.</li>
          <li><strong>Bias</strong> the mask edge by <code style={inlineCode}>−gain × mean(EPE)</code> in the outward direction.</li>
        </ol>

        <pre style={codeBlockStyle}>{`delta = −gain × mean_EPE

// Applied per edge direction:
left   →  x_nm  −= delta   (outward = −x)
right  →  w_nm  += delta   (outward = +x)
top    →  y_nm  −= delta   (outward = −y)
bottom →  h_nm  += delta   (outward = +y)`}</pre>

        <p style={{ marginTop: 12 }}>
          EPE is sampled on the <em>target</em> edge (fixed reference frame), not the
          shifting mask edge. This keeps the measurement stable and prevents feedback oscillation.
        </p>
      </section>

      {/* ── §3 Sub-Segmentation ──────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={h2Style}><SectionBadge n={3} />Sub-Segmentation for Shape Correction</h2>
        <p>
          A single rectangle can only move its edges uniformly. Real OPC produces
          non-uniform profiles — hammerheads at line ends, serifs at corners, asymmetric
          bias near adjacent features. litopc splits each shape into smaller cells;
          each cell corrects its own portion of the edge independently.
        </p>

        <table style={tableStyle}>
          <thead>
            <tr style={theadRowStyle}>
              <th style={thStyle}>Shape</th>
              <th style={thStyle}>Condition</th>
              <th style={thStyle}>Segmentation</th>
              <th style={thStyle}>Result</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Contact / pad", "Aspect ratio < 2", "2D grid (N × M cells)", "Corner serifs emerge naturally"],
              ["Vertical line", "h ≥ w, AR ≥ 2", "Horizontal strips", "Hammerheads at line ends"],
              ["Horizontal line", "w > h, AR ≥ 2", "Vertical strips", "Line-end pullback compensation"],
            ].map(([s, c, seg, r], i) => (
              <tr key={s} style={i % 2 === 1 ? zebraStyle : {}}>
                <td style={tdStyle}>{s}</td>
                <td style={tdStyle}>{c}</td>
                <td style={tdStyle}>{seg}</td>
                <td style={tdStyle}>{r}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ marginTop: 14 }}>
          Internal boundaries between adjacent cells are automatically detected and
          skipped — only <em>outer</em> edges of the union are corrected. Detection works
          by probing 2 nm outward from each edge: if the probe lands inside a neighboring
          cell, the edge is marked interior and excluded.
        </p>
        <Callout type="tip">
          <strong>Segment size and physics:</strong> The minimum cell size is chosen per
          process so each cell stays above the Rayleigh printability floor (k₁λ/NA).
          Cells below this floor produce no contour and stall correction.
          Default sizes: DUV dry 80 nm · DUV imm 50 nm · EUV LNA 20 nm · EUV HNA 15 nm.
        </Callout>
      </section>

      {/* ── §4 Convergence ───────────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={h2Style}><SectionBadge n={4} />Convergence and Auto-Stop</h2>
        <p>
          OPC is not guaranteed to converge monotonically. Gain values that are too high
          cause oscillation; features near the Rayleigh limit can diverge as the mask
          grows into diffraction-dominated territory.
        </p>
        <p style={{ marginTop: 10 }}>
          litopc monitors EPE after each iteration. If EPE rises more than 20% above
          the best value seen in the batch for two consecutive iterations, the run
          stops automatically. After each batch the UI classifies the outcome:
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 12 }}>
          {[
            { label: "Improved", desc: "> 5% EPE reduction", bg: "#e8f8ee", border: "rgba(30,160,80,0.25)" },
            { label: "Plateau", desc: "< 5% reduction — further iterations unlikely to help", bg: "#fffbec", border: "rgba(160,120,20,0.25)" },
            { label: "Diverged", desc: "EPE increased — roll back recommended", bg: "#fff0ee", border: "rgba(200,60,40,0.25)" },
          ].map(({ label, desc, bg, border }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontWeight: 660, fontSize: 13 }}>{label}</div>
              <div style={{ fontSize: 12.5, marginTop: 5, opacity: 0.82, lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 14 }}>
          A <strong>rollback checkpoint</strong> is saved before each "+5 iter" batch.
          If results worsen, one click restores the previous mask, contours, and EPE history.
        </p>
      </section>

      {/* ── §5 MRC Constraints ───────────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={h2Style}><SectionBadge n={5} />Mask Rule Check (MRC) Constraints</h2>
        <p>
          Real photomask manufacturing imposes geometric ground rules (MRC) that OPC
          must respect. litopc enforces four constraint classes on every edge delta
          before it is applied.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          {[
            { label: "Min CD — no break", desc: "A cell that shrinks below the Rayleigh floor creates a physical disconnection. OPC is clamped so this never happens.", bg: "#eef4ff", border: "rgba(30,80,200,0.18)" },
            { label: "Min Space — no bridge", desc: "Outward OPC growth is clamped so two separately-corrected cells cannot merge into an unintended bridge.", bg: "#f0fbf4", border: "rgba(30,160,80,0.18)" },
            { label: "Max Bias — bounded amplitude", desc: "Maximum edge displacement from the batch-start position. Limits correction amplitude so staircase profiles stay manufacturable.", bg: "#fffbec", border: "rgba(160,120,20,0.18)" },
            { label: "Grid snap — e-beam writeability", desc: "All coordinates snapped to the manufacturing grid after each iteration (1 nm DUV, 0.5 nm EUV). Prevents sub-grid features.", bg: "#fdf0ff", border: "rgba(120,40,160,0.18)" },
          ].map(({ label, desc, bg, border }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontWeight: 660, fontSize: 13 }}>{label}</div>
              <div style={{ fontSize: 12.5, marginTop: 5, lineHeight: 1.5, opacity: 0.85 }}>{desc}</div>
            </div>
          ))}
        </div>

        <table style={{ ...tableStyle, marginTop: 16 }}>
          <thead>
            <tr style={theadRowStyle}>
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
              ["EUV Low-NA (13.5 nm, NA 0.33)", "12 nm", "12 nm", "10 nm", "0.5 nm"],
              ["EUV High-NA (13.5 nm, NA 0.55)", "6 nm", "6 nm", "6 nm", "0.5 nm"],
            ].map(([proc, cd, sp, bias, grid], i) => (
              <tr key={proc} style={i % 2 === 1 ? zebraStyle : {}}>
                <td style={tdStyle}>{proc}</td>
                <td style={tdStyle}>{cd}</td>
                <td style={tdStyle}>{sp}</td>
                <td style={tdStyle}>{bias}</td>
                <td style={tdStyle}>{grid}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <Callout type="caution">
          <strong>Not covered here:</strong> diagonal proximity, mask-to-mask layer
          interactions, resist/etch bias, and SRAF placement — all enforced
          post-OPC in production EDA flows. Out of scope for this educational model.
        </Callout>
      </section>

      {/* ── §6 Algorithm Parameters ──────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={h2Style}><SectionBadge n={6} />Algorithm Parameters</h2>
        <table style={tableStyle}>
          <thead>
            <tr style={theadRowStyle}>
              <th style={thStyle}>Parameter</th>
              <th style={thStyle}>Default</th>
              <th style={thStyle}>Effect</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["gain", "0.5", "Fraction of mean EPE applied per iteration. Adapted downward when EPE worsens (floor: gain / 4)."],
              ["iterations", "3 (Free) · 5 (Pro)", "Simulate → correct cycles per batch. Continue adds another batch."],
              ["nSamples", "7", "EPE sample points per edge. More samples reduce noise on curved contours."],
              ["segmentNm", "preset-dependent", "Target cell size for sub-segmentation. Must stay above the Rayleigh printability floor. Smaller cells improve fidelity on complex shapes."],
              ["maxBiasNm", "preset-dependent", "Maximum edge displacement per batch. Resets each batch; limits staircase amplitude."],
              ["gridNm", "1 nm (DUV) · 0.5 nm (EUV)", "Manufacturing grid. All edges snapped after each iteration."],
            ].map(([param, def, effect], i) => (
              <tr key={param as string} style={i % 2 === 1 ? zebraStyle : {}}>
                <td style={tdStyle}><code style={inlineCode}>{param}</code></td>
                <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{def}</td>
                <td style={tdStyle}>{effect}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ── §7 Scope & Customization ─────────────────────────────────── */}
      <section style={sectionStyle}>
        <h2 style={h2Style}><SectionBadge n={7} />Scope and Customization</h2>
        <p>
          litopc implements a physically grounded but intentionally simplified OPC engine —
          accurate enough to demonstrate key phenomena and build intuition for real-world OPC,
          not a replacement for production EDA tools.
        </p>

        <table style={{ ...tableStyle, marginTop: 14 }}>
          <thead>
            <tr style={theadRowStyle}>
              <th style={thStyle}>Feature</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Free</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Pro</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Research</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Edge-by-edge EPE correction", "✓", "✓", "✓"],
              ["Sub-segmented contacts and lines", "✓", "✓", "✓"],
              ["DUV 193 nm + EUV 13.5 nm nodes", "✓", "✓", "✓"],
              ["MRC: min CD, min space, max bias, grid snap", "✓", "✓", "✓"],
              ["Convergence detection + rollback", "✓", "✓", "✓"],
              ["Iterations per batch", "3", "5", "5"],
              ["Resist blur σ (Gaussian)", "—", "✦ Pro", "✦ Pro"],
              ["Isotropic etch bias", "—", "✦ Pro", "✦ Pro"],
              ["Custom segment size (finer cells)", "—", "—", "✦ Research"],
              ["Partial coherence σ + illumination shape", "—", "—", "✦ Research"],
              ["Zernike aberration correction", "—", "—", "✦ Research"],
              ["Full vector / partial coherence imaging", "—", "—", "planned"],
              ["Inter-feature proximity / SRAF placement", "—", "—", "planned"],
              ["Full-chip OPC", "—", "—", "out of scope"],
            ].map(([feat, free, pro, res], i) => (
              <tr key={feat as string} style={i % 2 === 1 ? zebraStyle : {}}>
                <td style={tdStyle}>{feat}</td>
                <td style={{ ...tdStyle, textAlign: "center", color: free === "✓" ? "rgba(30,140,70,0.9)" : "rgba(0,0,0,0.3)" }}>{free}</td>
                <td style={{ ...tdStyle, textAlign: "center", color: pro === "✦ Pro" ? "rgba(30,80,200,0.9)" : pro === "✓" ? "rgba(30,140,70,0.9)" : "rgba(0,0,0,0.3)" }}>{pro}</td>
                <td style={{ ...tdStyle, textAlign: "center", color: res === "✦ Research" ? "rgba(120,40,160,0.9)" : res === "✓" ? "rgba(30,140,70,0.9)" : "rgba(0,0,0,0.35)" }}>{res}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <Callout type="caution">
          <strong>What the OPC contour represents:</strong> EPE is measured against the
          resist-printed contour — aerial image after dose thresholding. No etch step
          is applied. In a real flow the OPC target would be offset by etch bias so
          final silicon CD matches design intent. Resist blur and etch bias are planned
          for Pro; custom segment size and optical overrides for Research.
        </Callout>

        <UpgradeCard />
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer style={footerStyle}>
        <p style={{ margin: 0, fontSize: 12.5, opacity: 0.55 }}>
          Scalar coherent imaging proxy · binary-threshold resist · no etch bias.
          Educational approximations — not calibrated for manufacturing sign-off.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
          <a href="/litopc" style={footerLinkStyle}>← Back to Lab</a>
          <a href="/litopc/model-summary" style={footerLinkStyle}>Model Guide</a>
          <a href="/litopc/benchmark-gallery" style={footerLinkStyle}>Benchmark Gallery</a>
          <a href="/litopc/model-change-log" style={footerLinkStyle}>Change Log</a>
        </div>
      </footer>
    </main>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

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

function StatCard({ label, desc }: { label: string; desc: string }) {
  return (
    <div style={{ border: "1px solid rgba(33,44,64,0.13)", borderRadius: 10, padding: "12px 14px", background: "rgba(246,250,255,0.8)" }}>
      <div style={{ fontWeight: 680, fontSize: 14 }}>{label}</div>
      <div style={{ fontSize: 13, marginTop: 5, opacity: 0.78, lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

function UpgradeCard() {
  return (
    <div style={{
      marginTop: 20,
      border: "1px solid rgba(30,80,200,0.18)",
      borderRadius: 12,
      padding: "18px 20px",
      background: "linear-gradient(135deg, rgba(240,246,255,0.9) 0%, rgba(248,244,255,0.9) 100%)",
    }}>
      <div style={{ fontWeight: 680, fontSize: 14, marginBottom: 10 }}>Unlock advanced OPC controls</div>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 12px", fontSize: 13, alignItems: "start" }}>
        <span style={planBadge("pro")}>Pro</span>
        <span style={{ opacity: 0.82 }}>Resist blur σ · Isotropic etch bias · 5 iterations/batch</span>
        <span style={planBadge("research")}>Research</span>
        <span style={{ opacity: 0.82 }}>Custom segment size · Partial coherence σ · Zernike aberrations · TMM stack</span>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <a href="/litopc" style={{ ...ctaBtnStyle, background: "rgba(30,80,200,0.9)", color: "#fff" }}>Try it free →</a>
        <a href="/#pricing" style={{ ...ctaBtnStyle, background: "transparent", color: "rgba(30,80,200,0.85)", border: "1px solid rgba(30,80,200,0.25)" }}>View plans</a>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  maxWidth: 960, margin: "0 auto", padding: "32px 22px 64px",
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
  borderRadius: 8, padding: "12px 16px", fontFamily: "monospace",
  fontSize: 13, lineHeight: 1.8, whiteSpace: "pre", overflowX: "auto", marginTop: 14,
};

const inlineCode: React.CSSProperties = {
  background: "rgba(18,28,48,0.06)", borderRadius: 4,
  padding: "1px 5px", fontSize: "0.88em", fontFamily: "monospace",
};

const tableStyle: React.CSSProperties = {
  width: "100%", borderCollapse: "collapse",
  border: "1px solid rgba(25,35,52,0.13)", fontSize: 13.5,
};

const theadRowStyle: React.CSSProperties = {
  background: "rgba(15,30,80,0.07)",
};

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

const footerStyle: React.CSSProperties = {
  marginTop: 48, paddingTop: 18,
  borderTop: "1px solid rgba(33,44,64,0.1)",
};

const footerLinkStyle: React.CSSProperties = {
  fontSize: 13, color: "rgba(30,80,200,0.7)", textDecoration: "none",
  padding: "4px 10px", borderRadius: 6,
  background: "rgba(30,80,200,0.05)",
};

const planBadge = (tier: "pro" | "research"): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  padding: "2px 9px", borderRadius: 20, fontWeight: 660, fontSize: 11.5,
  background: tier === "pro" ? "rgba(30,80,200,0.1)" : "rgba(120,40,160,0.1)",
  color: tier === "pro" ? "rgba(30,80,200,0.9)" : "rgba(120,40,160,0.9)",
  border: tier === "pro" ? "1px solid rgba(30,80,200,0.2)" : "1px solid rgba(120,40,160,0.2)",
  whiteSpace: "nowrap", marginTop: 2,
});

const ctaBtnStyle: React.CSSProperties = {
  display: "inline-block", padding: "7px 16px", borderRadius: 8,
  fontSize: 13, fontWeight: 600, textDecoration: "none", cursor: "pointer",
};
