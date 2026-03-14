"use client";
import React from "react";
import type { LearnStep } from "./LearnStepPanel";
import type { OpcIterResult } from "../lib/opc-correction";

const ANIM = `
  @keyframes ov-pulse   { 0%,100%{transform:scale(1);opacity:0.75} 50%{transform:scale(2);opacity:0} }
  @keyframes ov-blink   { 0%,100%{opacity:1} 50%{opacity:0.15} }
  @keyframes ov-bounce-x{ 0%,100%{transform:translateX(0)} 50%{transform:translateX(-7px)} }
  @keyframes ov-float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
  @keyframes ov-fadein  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ov-spin    { to{transform:rotate(360deg)} }
  @keyframes ov-glow-g  { 0%,100%{box-shadow:0 0 8px 0 rgba(58,239,138,0.3)} 50%{box-shadow:0 0 22px 4px rgba(58,239,138,0.15)} }
`;

const C = {
  bg:     "rgba(10,16,30,0.82)",
  border: "rgba(255,255,255,0.1)",
  text:   "rgba(220,235,255,0.95)",
  sub:    "rgba(160,190,230,0.65)",
  accent: "#3a8eff",
  purple: "#bf5af2",
  orange: "#ff6b35",
  green:  "#3aef8a",
  font:   "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

/* ── Pulsing ring ── */
function Ring({ x, y, color, size = 16 }: { x: string; y: string; color: string; size?: number }) {
  return (
    <div style={{ position:"absolute", left:x, top:y, transform:"translate(-50%,-50%)", width:size, height:size, pointerEvents:"none" }}>
      <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:color, animation:"ov-pulse 1.8s ease-in-out infinite" }} />
      <div style={{ position:"absolute", inset:size*0.3, borderRadius:"50%", background:color }} />
    </div>
  );
}

/* ── Tooltip bubble ──
   anchor: where the tip points TO (absolute % position of the TARGET)
   place:  "above" | "below" | "left" | "right" — where the card sits relative to anchor
*/
function Bubble({ ax, ay, place, title, sub, color = C.accent, width = 210 }: {
  ax: string; ay: string;
  place: "above" | "below" | "left" | "right";
  title: string; sub?: string; color?: string; width?: number;
}) {
  const TRI = 8;

  // card offset from anchor so triangle tip aligns to anchor point
  const cardStyle: React.CSSProperties = { position:"absolute" };
  const triStyle: React.CSSProperties = { position:"absolute", width:0, height:0 };

  if (place === "above") {
    // card sits above the anchor → bottom edge + tri pointing down to anchor
    cardStyle.left = ax;
    cardStyle.top  = ay;
    cardStyle.transform = `translate(-50%, calc(-100% - ${TRI + 6}px))`;
    triStyle.bottom = -TRI;
    triStyle.left   = "50%";
    triStyle.transform = "translateX(-50%)";
    triStyle.borderLeft   = `${TRI}px solid transparent`;
    triStyle.borderRight  = `${TRI}px solid transparent`;
    triStyle.borderTop    = `${TRI}px solid ${C.bg}`;
  } else if (place === "below") {
    // card sits below the anchor → top edge + tri pointing up to anchor
    cardStyle.left = ax;
    cardStyle.top  = ay;
    cardStyle.transform = `translate(-50%, ${TRI + 6}px)`;
    triStyle.top    = -TRI;
    triStyle.left   = "50%";
    triStyle.transform = "translateX(-50%)";
    triStyle.borderLeft   = `${TRI}px solid transparent`;
    triStyle.borderRight  = `${TRI}px solid transparent`;
    triStyle.borderBottom = `${TRI}px solid ${C.bg}`;
  } else if (place === "left") {
    // card sits to the left → right edge + tri pointing right to anchor
    cardStyle.left = ax;
    cardStyle.top  = ay;
    cardStyle.transform = `translate(calc(-100% - ${TRI + 6}px), -50%)`;
    triStyle.right  = -TRI;
    triStyle.top    = "50%";
    triStyle.transform = "translateY(-50%)";
    triStyle.borderTop    = `${TRI}px solid transparent`;
    triStyle.borderBottom = `${TRI}px solid transparent`;
    triStyle.borderLeft   = `${TRI}px solid ${C.bg}`;
  } else {
    // place === "right" → card sits to the right + tri pointing left to anchor
    cardStyle.left = ax;
    cardStyle.top  = ay;
    cardStyle.transform = `translate(${TRI + 6}px, -50%)`;
    triStyle.left   = -TRI;
    triStyle.top    = "50%";
    triStyle.transform = "translateY(-50%)";
    triStyle.borderTop    = `${TRI}px solid transparent`;
    triStyle.borderBottom = `${TRI}px solid transparent`;
    triStyle.borderRight  = `${TRI}px solid ${C.bg}`;
  }

  return (
    <div style={{ ...cardStyle, width, pointerEvents:"none", animation:"ov-fadein 0.3s ease both", zIndex:20 }}>
      <div style={{
        position:"relative",
        background: C.bg,
        border:`1px solid ${color}44`,
        borderRadius:10,
        padding:"10px 13px",
        backdropFilter:"blur(10px)",
        WebkitBackdropFilter:"blur(10px)",
        fontFamily:C.font,
        boxShadow:`0 6px 28px rgba(0,0,0,0.5), 0 0 0 1px ${color}22`,
      }}>
        {/* top accent line */}
        <div style={{ position:"absolute", top:0, left:10, right:10, height:2, borderRadius:"0 0 2px 2px", background:color, opacity:0.8 }} />
        <div style={{ ...triStyle }} />
        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom: sub ? 4 : 0 }}>{title}</div>
        {sub && <div style={{ fontSize:11, color:C.sub, lineHeight:1.55 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ── Animated directional arrow ── */
function Arrow({ x, y, dir, color, label }: {
  x: string; y: string; dir:"←"|"→"|"↑"|"↓"; color: string; label?: string;
}) {
  const anim = (dir === "←" || dir === "→")
    ? "ov-bounce-x 1.1s ease-in-out infinite"
    : "ov-float 1.1s ease-in-out infinite";
  return (
    <div style={{ position:"absolute", left:x, top:y, transform:"translate(-50%,-50%)", display:"flex", alignItems:"center", gap:5, pointerEvents:"none", zIndex:20 }}>
      <span style={{ fontSize:24, color, fontWeight:900, lineHeight:1, display:"inline-block", animation:`${anim}, ov-blink 2.2s ease-in-out infinite`, textShadow:`0 0 10px ${color}` }}>
        {dir}
      </span>
      {label && (
        <span style={{ fontSize:10, fontWeight:700, color, background:`${color}18`, border:`1px solid ${color}44`, borderRadius:4, padding:"2px 6px", whiteSpace:"nowrap", fontFamily:C.font }}>
          {label}
        </span>
      )}
    </div>
  );
}

/* ── Top-center status badge ── */
function Badge({ text, color, spinner, sub }: { text: string; color: string; spinner?: boolean; sub?: string }) {
  return (
    <div style={{ position:"absolute", left:"50%", top:"9%", transform:"translate(-50%,-50%)", display:"flex", flexDirection:"column", alignItems:"center", gap:5, pointerEvents:"none", animation:"ov-fadein 0.3s ease both", zIndex:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, background:C.bg, border:`1px solid ${color}44`, borderRadius:20, padding:"7px 16px", backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)", boxShadow:`0 2px 16px rgba(0,0,0,0.45)` }}>
        {spinner && <div style={{ width:13, height:13, border:`2px solid ${color}33`, borderTopColor:color, borderRadius:"50%", animation:"ov-spin 0.75s linear infinite", flexShrink:0 }} />}
        <span style={{ fontSize:12, fontWeight:700, color, fontFamily:C.font }}>{text}</span>
      </div>
      {sub && <span style={{ fontSize:11, color:C.sub, fontFamily:C.font, background:C.bg, padding:"2px 10px", borderRadius:8, backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)" }}>{sub}</span>}
    </div>
  );
}

/* ── Bottom-center success card ── */
function SuccessCard() {
  return (
    <div style={{ position:"absolute", left:"50%", bottom:"9%", transform:"translateX(-50%)", pointerEvents:"none", animation:"ov-fadein 0.4s ease both", zIndex:20 }}>
      <div style={{ background:"rgba(8,22,14,0.88)", border:"1px solid rgba(58,239,138,0.4)", borderRadius:12, padding:"11px 22px", backdropFilter:"blur(10px)", WebkitBackdropFilter:"blur(10px)", fontFamily:C.font, textAlign:"center", animation:"ov-glow-g 2.2s ease-in-out infinite", minWidth:230 }}>
        <div style={{ fontSize:15, fontWeight:800, color:C.green, marginBottom:3 }}>✓ OPC Complete</div>
        <div style={{ fontSize:11, color:"rgba(140,200,160,0.75)", lineHeight:1.5 }}>Mask pre-distorted to compensate for diffraction</div>
      </div>
    </div>
  );
}

/* ══ Main overlay ══
   L_CORNER_RAW_DUV shape layout in viewport (empirically calibrated):
   – Horizontal arm center:  x≈46%  y≈37%
   – Vertical arm center:    x≈61%  y≈60%
   – Inner corner (elbow):   x≈61%  y≈47%
   – Top-right tip of H-arm: x≈68%  y≈30%
   – Bottom tip of V-arm:    x≈61%  y≈77%
*/
export default function LearnOverlay(props: {
  step: LearnStep;
  loading: boolean;
  opcRunning: boolean;
  opcProgress: OpcIterResult[];
}) {
  const { step, loading, opcRunning, opcProgress } = props;
  const opcDone = !opcRunning && opcProgress.length === 5;
  const opcStarted = opcRunning || opcProgress.length > 0;

  return (
    <div style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:10, overflow:"hidden" }}>
      <style>{ANIM}</style>

      {/* ── Step 0: The Mask ── */}
      {step === 0 && <>
        {/* rings on mask body + target corner */}
        <Ring x="46%" y="37%" color={C.accent} size={18} />
        <Ring x="68%" y="30%" color="rgba(80,220,200,0.9)" size={14} />
        {/* tooltip below the L-shape, triangle pointing UP to the mask */}
        <Bubble ax="50%" ay="77%" place="above"
          title="This is your photomask"
          sub="Pink shape = mask · Cyan dashed = target"
          color={C.accent} width={220}
        />
      </>}

      {/* ── Step 1 loading ── */}
      {step === 1 && loading && <Badge text="Simulating..." color={C.accent} spinner />}

      {/* ── Step 1 loaded ── */}
      {step === 1 && !loading && <>
        {/* purple ring at the rounded corner of the L (high diffraction zone) */}
        <Ring x="68%" y="30%" color={C.purple} size={22} />
        {/* tooltip above the ring, card pointing DOWN to it */}
        <Bubble ax="68%" ay="30%" place="above"
          title="Diffraction blurs the edges"
          sub="Light bends around the mask — sharp corners print rounded"
          color={C.purple} width={230}
        />
      </>}

      {/* ── Step 2 EPE phase ── */}
      {step === 2 && !opcStarted && <>
        {/* ring at inner corner — highest EPE */}
        <Ring x="61%" y="47%" color={C.orange} size={20} />
        {/* animated arrow pointing at the corner from the left */}
        <Arrow x="53%" y="47%" dir="→" color={C.orange} label="large EPE" />
        {/* callout card to the right of the corner */}
        <Bubble ax="61%" ay="47%" place="right"
          title="EPE — Edge Placement Error"
          sub="Gap between printed contour and target · Even 5 nm causes failures"
          color={C.orange} width={210}
        />
      </>}

      {/* ── Step 2 OPC running ── */}
      {step === 2 && opcRunning && (
        <Badge text={`OPC iteration ${opcProgress.length} / 5`} color={C.green} spinner sub="Watch the mask reshape" />
      )}

      {/* ── Step 2 OPC done ── */}
      {step === 2 && opcDone && <SuccessCard />}
    </div>
  );
}
