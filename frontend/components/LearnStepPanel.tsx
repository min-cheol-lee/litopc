"use client";
import React from "react";
import type { OpcIterResult } from "../lib/opc-correction";

export type LearnStep = 0 | 1 | 2 | 3;

const STEPS: { title: string; tag: string }[] = [
  { title: "The Mask",       tag: "Design intent" },
  { title: "Aerial Image",   tag: "How light prints it" },
  { title: "EPE",            tag: "The problem" },
  { title: "OPC",            tag: "The fix" },
];

const C = {
  bg:     "rgba(14,22,38,0.97)",
  text:   "rgba(220,235,255,0.92)",
  sub:    "rgba(160,190,230,0.5)",
  border: "rgba(255,255,255,0.06)",
  card:   "rgba(255,255,255,0.04)",
  accent: "#3a8eff",
  green:  "#3aef8a",
  purple: "#bf5af2",
  orange: "#ff6b35",
  maskPink:   "rgba(255,130,160,0.95)",
  contourW:   "rgba(255,255,255,0.9)",
  targetCyan: "rgba(80,220,200,0.9)",
  btnBg: "linear-gradient(135deg,#1a6cf8,#0e4db5)",
};

const ANIM = `
  @keyframes lrn-blink  { 0%,100%{opacity:1}  50%{opacity:0.2} }
  @keyframes lrn-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
  @keyframes lrn-glow   { 0%,100%{box-shadow:0 0 0 0 rgba(255,107,53,0.4)} 50%{box-shadow:0 0 0 6px rgba(255,107,53,0)} }
  @keyframes spin        { to{transform:rotate(360deg)} }
`;

export default function LearnStepPanel(props: {
  step: LearnStep;
  loading: boolean;
  opcRunning: boolean;
  opcProgress: OpcIterResult[];
  onNextStep: () => void;
}) {
  const { step, loading, opcRunning, opcProgress, onNextStep } = props;

  const bestEpe  = opcProgress.length > 0 ? Math.min(...opcProgress.map(r => r.epeMeanNm)) : null;
  const opcDone  = !opcRunning && opcProgress.length === 5;
  const opcStarted = opcRunning || opcProgress.length > 0;

  const content: React.ReactNode = (() => {

    /* ── Step 0: Mask ── */
    if (step === 0) return (
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <Card center>
          <span style={{ fontSize:15, fontWeight:700, color:C.text }}>This is a photomask</span>
          <span style={{ fontSize:13, color:C.sub, lineHeight:1.65 }}>
            A template that projects circuit patterns onto silicon using light.
            The L-shape is exactly what we want printed on the wafer.
          </span>
        </Card>
        <LegendCard rows={[
          { color:C.maskPink,   dashed:false, label:"Mask",   desc:"The design you want to print" },
          { color:C.targetCyan, dashed:true,  label:"Target", desc:"Ideal printed shape" },
        ]} />
      </div>
    );

    /* ── Step 1: Aerial Image ── */
    if (step === 1) return (
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {loading ? <Spinner text="Running simulation..." accent={C.accent} /> : (
          <>
            <Card center>
              <span style={{ fontSize:15, fontWeight:700, color:C.text }}>Light doesn{"'"}t go straight</span>
              <span style={{ fontSize:13, color:C.sub, lineHeight:1.65 }}>
                193 nm DUV diffracts through the lens.
                Sharp edges become blurry — the printed shape deviates from the mask.
              </span>
            </Card>
            <div style={{ padding:"9px 12px", borderRadius:10, background:`${C.purple}14`, border:`1px solid ${C.purple}33`, fontSize:12, color:"rgba(220,235,255,0.75)" }}>
              Bright region = <strong style={{color:C.purple}}>aerial image</strong> (light intensity hitting the wafer)
            </div>
            <LegendCard rows={[
              { color:C.contourW,   dashed:false, label:"Contour", desc:"Actual printed edge" },
              { color:C.targetCyan, dashed:true,  label:"Target",  desc:"Where it should be" },
            ]} />
          </>
        )}
      </div>
    );

    /* ── Step 2: EPE ── */
    if (step === 2) return (
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <Card center>
          <span style={{ fontSize:15, fontWeight:700, color:C.text }}>The contour misses the target</span>
          <span style={{ fontSize:13, color:C.sub, lineHeight:1.65 }}>
            The gap between printed contour and target is{" "}
            <strong style={{color:C.orange}}>EPE</strong>. Even a few nm causes transistor failures.
          </span>
        </Card>
        <LegendCard rows={[
          { color:C.contourW,   dashed:false, label:"Contour", desc:"Actual printed edge" },
          { color:C.targetCyan, dashed:true,  label:"Target",  desc:"Where it should be" },
        ]} />
        <EpeCallout />
      </div>
    );

    /* ── Step 3: OPC ── */
    if (step === 3) return (
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {opcRunning && <Spinner text={`OPC iteration ${opcProgress.length} / 5...`} accent={C.green} />}

        {opcProgress.length > 0 && (
          <div style={{ padding:"12px 14px", background:C.card, borderRadius:10, border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:11, fontWeight:600, color:C.sub, marginBottom:8, textTransform:"uppercase", letterSpacing:"0.06em" }}>
              EPE Convergence
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {opcProgress.map((r, i) => {
                const maxEpe = opcProgress[0]?.epeMeanNm ?? 1;
                const pct    = Math.max(4, Math.round((r.epeMeanNm / maxEpe) * 100));
                const isLast = i === opcProgress.length - 1;
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ fontSize:10, color:C.sub, width:36 }}>#{r.iteration}</div>
                    <div style={{ flex:1, height:12, background:"rgba(255,255,255,0.06)", borderRadius:4, overflow:"hidden" }}>
                      <div style={{ width:`${pct}%`, height:"100%", borderRadius:4, background: isLast ? C.green : C.accent, transition:"width 0.4s ease" }} />
                    </div>
                    <div style={{ fontSize:10, color: isLast ? C.green : C.text, width:44, textAlign:"right", fontWeight: isLast ? 700 : 400 }}>
                      {r.epeMeanNm.toFixed(1)} nm
                    </div>
                  </div>
                );
              })}
            </div>
            {bestEpe !== null && opcProgress.length === 5 && (
              <div style={{ marginTop:10, paddingTop:8, borderTop:`1px solid ${C.border}`, fontSize:13, color:C.text }}>
                Final EPE: <strong style={{ color:C.green }}>{bestEpe.toFixed(1)} nm</strong>
                {opcProgress[0] && (
                  <span style={{ color:C.sub, marginLeft:8, fontSize:12 }}>
                    ({Math.round((1 - bestEpe / opcProgress[0].epeMeanNm) * 100)}% improvement)
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {opcDone && (
          <>
            <div style={{ padding:"10px 12px", borderRadius:10, background:"rgba(58,239,138,0.08)", border:"1px solid rgba(58,239,138,0.2)", fontSize:13, color:C.green, fontWeight:600 }}>
              ✓ OPC complete — mask pre-distorted to print perfect
            </div>
            <div style={{ fontSize:13, color:C.sub, lineHeight:1.7 }}>
              The mask now looks "wrong" on purpose — it compensates for optical distortion so the wafer prints correctly.
            </div>
            <a href="/litopc" style={{
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              padding:"13px 0", borderRadius:12, marginTop:4,
              background:C.btnBg, color:"white", fontWeight:700, fontSize:14,
              textDecoration:"none", boxShadow:"0 2px 14px rgba(26,108,248,0.35)",
            }}>
              Try the Simulator →
            </a>
          </>
        )}
      </div>
    );
  })();

  const btnLabel = (() => {
    if (step === 0) return loading ? "Simulating..." : "Run Simulation →";
    if (step === 1) return loading ? "Simulating..." : "See EPE →";
    if (step === 2) return "Run OPC Correction →";
    return null;
  })();

  return (
    <div style={{ width:300, flexShrink:0, height:"100%", background:C.bg, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", overflow:"hidden", fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{ANIM}</style>

      {/* Header */}
      <div style={{ padding:"14px 18px 10px", borderBottom:`1px solid ${C.border}` }}>
        <div style={{ fontSize:14, fontWeight:800, color:C.text, letterSpacing:"-0.01em" }}>How OPC Works</div>
        <div style={{ fontSize:11, color:C.sub, marginTop:1 }}>Interactive lithography simulation</div>
      </div>

      {/* Progress bar + step title */}
      <div style={{ padding:"12px 18px 0" }}>
        <div style={{ display:"flex", gap:5, marginBottom:12 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ flex:1, height:3, borderRadius:2, background: i <= step ? C.accent : "rgba(255,255,255,0.1)", transition:"background 0.3s" }} />
          ))}
        </div>
        <div style={{ fontSize:10, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", color:C.sub, marginBottom:3 }}>
          {step + 1} / {STEPS.length}
        </div>
        <div style={{ fontSize:20, fontWeight:800, color:C.text, lineHeight:1.15, marginBottom:2 }}>{STEPS[step].title}</div>
        <div style={{ fontSize:12, color:C.sub }}>{STEPS[step].tag}</div>
      </div>

      {/* Content */}
      <div style={{ flex:1, padding:"14px 18px", overflowY:"auto", display:"flex", flexDirection:"column", gap:10 }}>
        {content}
      </div>

      {/* Action button */}
      {btnLabel && (
        <div style={{ padding:"12px 18px", borderTop:`1px solid ${C.border}` }}>
          <button type="button" onClick={onNextStep} disabled={loading}
            style={{ width:"100%", padding:"13px 0", fontSize:14, fontWeight:700, background: loading ? "rgba(255,255,255,0.07)" : C.btnBg, color: loading ? C.sub : "white", border:"none", borderRadius:12, cursor: loading ? "default" : "pointer", boxShadow: loading ? "none" : "0 2px 14px rgba(26,108,248,0.35)", transition:"all 0.2s" }}>
            {btnLabel}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function Card({ center, children }: { center?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ padding:"14px 16px", borderRadius:12, background:C.card, border:`1px solid ${C.border}`, display:"flex", flexDirection:"column", gap:8, alignItems: center ? "center" : "flex-start", textAlign: center ? "center" : "left" }}>
      {children}
    </div>
  );
}

function LegendCard({ rows }: { rows: { color: string; dashed: boolean; label: string; desc: string }[] }) {
  return (
    <div style={{ padding:"12px 14px", borderRadius:12, background:C.card, border:`1px solid ${C.border}`, display:"flex", flexDirection:"column", gap:10 }}>
      <span style={{ fontSize:11, fontWeight:600, color:C.sub, textTransform:"uppercase", letterSpacing:"0.08em" }}>Legend</span>
      {rows.map((r, i) => (
        <React.Fragment key={i}>
          {i > 0 && <div style={{ height:1, background:C.border }} />}
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:28, flexShrink:0 }}>
              <svg width="28" height="10" viewBox="0 0 28 10">
                {r.dashed
                  ? <line x1="0" y1="5" x2="28" y2="5" stroke={r.color} strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />
                  : <line x1="0" y1="5" x2="28" y2="5" stroke={r.color} strokeWidth="2.5" strokeLinecap="round" />
                }
              </svg>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:1 }}>
              <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{r.label}</span>
              <span style={{ fontSize:11, color:C.sub }}>{r.desc}</span>
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function EpeCallout() {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12, background:"rgba(255,107,53,0.1)", border:"1px solid rgba(255,107,53,0.3)", animation:"lrn-glow 1.8s ease-in-out infinite" }}>
      <div style={{ position:"relative", width:14, height:14, flexShrink:0 }}>
        <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:C.orange, opacity:0.25, animation:"lrn-bounce 1.4s ease-in-out infinite" }} />
        <div style={{ position:"absolute", inset:3, borderRadius:"50%", background:C.orange }} />
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
        <span style={{ fontSize:13, fontWeight:700, color:C.orange }}>Red arrows = large EPE</span>
        <span style={{ fontSize:11, color:"rgba(160,190,230,0.5)" }}>Look right → arrows show EPE magnitude</span>
      </div>
    </div>
  );
}

function BounceHint({ label, color }: { label: string; color: string }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", borderRadius:8, background:`${color}0f`, border:`1px solid ${color}2a` }}>
      <span style={{ fontSize:15, color, animation:"lrn-bounce 1.5s ease-in-out infinite", display:"inline-block" }}>↗</span>
      <span style={{ fontSize:12, fontWeight:600, color, animation:"lrn-blink 2s ease-in-out infinite" }}>{label}</span>
    </div>
  );
}

function Spinner({ text, accent }: { text: string; accent: string }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10, padding:"20px 0" }}>
      <div style={{ width:32, height:32, border:`3px solid ${accent}33`, borderTopColor:accent, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <span style={{ fontSize:13, fontWeight:600, color:accent }}>{text}</span>
    </div>
  );
}
