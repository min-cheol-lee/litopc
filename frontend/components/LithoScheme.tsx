// LithoScheme — Apple-style premium 3D lithography hero
// Three-layer floating composition:
//   1. Mask plate   (back)   — dark quartz glass + UV aperture + OPC outline
//   2. Beam layer   (middle) — soft UV photon column between plates
//   3. Silicon plate (front) — thermal aerial image + simulation contour
//
// Paths extracted verbatim from litopc SVG export (L_CORNER_OPC_DUV, DUV 193 dry)

// OPC-corrected mask opening — the UV-transparent region
const MASK_PATH =
  "M 570 850 L 750 850 L 750 795 L 720 795 L 720 668 L 735 668 " +
  "L 735 543 L 720 543 L 720 475 L 740 475 L 740 385 L 650 385 " +
  "L 650 400 L 560 400 L 560 385 L 470 385 L 470 400 L 300 400 " +
  "L 300 380 L 245 380 L 245 560 L 300 560 L 300 520 L 470 520 " +
  "L 470 545 L 560 545 L 560 520 L 600 520 L 600 543 L 585 543 " +
  "L 585 668 L 600 668 L 600 795 L 570 795 L 570 850";

// Target L-shape — design intent (spec box)
const TARGET_PATH =
  "M 610 830 L 710 830 L 710 410 L 260 410 L 260 510 L 610 510 L 610 830";

// Simulation contour — printed silicon edge from aerial image threshold
const CONTOUR_PATH =
  "M 655.99 826.52 L 648.83 825.07 L 641.67 822.03 L 635.44 817.84 " +
  "L 629.46 812.11 L 619.97 797.79 L 612.55 777.73 L 608.26 754.82 " +
  "L 606.73 727.60 L 607.97 700.39 L 613.87 641.67 L 614.07 625.91 " +
  "L 613.00 613.02 L 609.23 595.83 L 602.87 580.08 L 593.21 564.32 " +
  "L 581.51 550.57 L 565.76 536.93 L 547.26 525.65 L 528.52 518.17 " +
  "L 507.03 513.28 L 486.98 511.15 L 461.20 510.27 L 327.99 510.93 " +
  "L 306.51 508.91 L 290.76 504.82 L 280.49 499.87 L 271.52 492.71 " +
  "L 265.25 484.11 L 261.94 475.52 L 260.86 465.49 L 262.86 454.04 " +
  "L 267.65 444.01 L 274.64 435.42 L 283.57 428.26 L 294.31 422.53 " +
  "L 306.73 418.23 L 322.27 415.03 L 352.34 412.35 L 454.04 408.48 " +
  "L 482.68 409.02 L 551.43 412.85 L 620.18 411.13 L 643.10 411.99 " +
  "L 658.85 414.56 L 671.74 418.71 L 683.20 424.84 L 692.50 432.55 " +
  "L 700.46 442.58 L 706.89 455.47 L 711.02 469.79 L 713.34 486.98 " +
  "L 713.61 512.76 L 710.07 565.76 L 709.49 590.10 L 710.54 615.89 " +
  "L 716.45 691.80 L 716.78 719.01 L 715.49 743.36 L 713.02 761.98 " +
  "L 708.95 779.17 L 703.26 793.96 L 696.09 806.03 L 687.50 815.49 " +
  "L 677.47 822.32 L 667.45 825.88 L 655.99 826.52";

// viewBox spans content + padding
const VB = "215 355 560 520";

// Plate dimensions for clipPath / border rects
const CR = { x: 215, y: 355, w: 560, h: 520, r: 13 };

export function LithoScheme() {
  const { x, y, w, h, r } = CR;

  return (
    <div className="lps-outer" aria-hidden="true">
      {/* Scene ambient bloom */}
      <div className="lps-ambient" />

      <div className="lps-persp">
        <div className="lps-scene">

          {/* ══ MASK PLATE ════════════════════════════════════════════════ */}
          {/* Dark quartz glass optical mask — OPC aperture glows UV */}
          <div className="lps-pw lps-pw-mask">
            <svg viewBox={VB} xmlns="http://www.w3.org/2000/svg">
              <defs>
                {/* Quartz glass plate */}
                <linearGradient id="m-bg" x1="0" y1="0" x2="0.65" y2="1">
                  <stop offset="0%"   stopColor="#0d1628"/>
                  <stop offset="55%"  stopColor="#07101e"/>
                  <stop offset="100%" stopColor="#040c18"/>
                </linearGradient>

                {/* Micro engineering grid */}
                <pattern id="m-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M20,0 L20,20 L0,20" fill="none"
                    stroke="rgba(148,176,228,0.042)" strokeWidth="0.6"/>
                </pattern>

                {/* UV light in aperture — white-hot center → deep violet */}
                <radialGradient id="m-uv" cx="50%" cy="50%" r="58%">
                  <stop offset="0%"   stopColor="#ffffff"/>
                  <stop offset="9%"   stopColor="#ede9ff"/>
                  <stop offset="22%"  stopColor="#c4b5fd"/>
                  <stop offset="42%"  stopColor="#8b5cf6"/>
                  <stop offset="64%"  stopColor="#5b21b6"/>
                  <stop offset="84%"  stopColor="#3b0764"/>
                  <stop offset="100%" stopColor="#1a0040"/>
                </radialGradient>

                {/* UV soft bloom filter */}
                <filter id="m-bloom" x="-32%" y="-32%" width="164%" height="164%">
                  <feGaussianBlur stdDeviation="10" result="glow"/>
                  <feMerge>
                    <feMergeNode in="glow"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>

                {/* Directional glass sheen — top-left light source */}
                <linearGradient id="m-sheen" x1="0" y1="0" x2="0.22" y2="1">
                  <stop offset="0%"   stopColor="rgba(230,242,255,0.68)"/>
                  <stop offset="4%"   stopColor="rgba(210,228,255,0.20)"/>
                  <stop offset="16%"  stopColor="rgba(190,215,255,0.05)"/>
                  <stop offset="100%" stopColor="rgba(160,190,240,0)"/>
                </linearGradient>

                {/* Left edge chrome specular */}
                <linearGradient id="m-el" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"  stopColor="rgba(215,232,255,0.50)"/>
                  <stop offset="4%"  stopColor="rgba(195,218,255,0.12)"/>
                  <stop offset="100%" stopColor="rgba(160,195,245,0)"/>
                </linearGradient>

                {/* Right edge chrome specular */}
                <linearGradient id="m-er" x1="1" y1="0" x2="0" y2="0">
                  <stop offset="0%"  stopColor="rgba(205,224,255,0.36)"/>
                  <stop offset="4%"  stopColor="rgba(185,212,252,0.09)"/>
                  <stop offset="100%" stopColor="rgba(155,190,240,0)"/>
                </linearGradient>

                {/* Bottom UV emission — light streaming out through plate */}
                <linearGradient id="m-emit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="rgba(110,55,225,0)"/>
                  <stop offset="100%" stopColor="rgba(130,75,255,0.32)"/>
                </linearGradient>

                <clipPath id="m-cp">
                  <rect x={x} y={y} width={w} height={h} rx={r}/>
                </clipPath>
              </defs>

              <g clipPath="url(#m-cp)">
                {/* Quartz glass base */}
                <rect x={x} y={y} width={w} height={h} fill="url(#m-bg)"/>
                <rect x={x} y={y} width={w} height={h} fill="url(#m-grid)"/>

                {/* UV aperture — bloom halo first */}
                <path d={MASK_PATH} fill="url(#m-uv)" filter="url(#m-bloom)" opacity="0.60">
                  <animate attributeName="opacity" values="0.52;0.70;0.52" dur="4.4s" repeatCount="indefinite"/>
                </path>

                {/* UV aperture — crisp fill on top */}
                <path d={MASK_PATH} fill="url(#m-uv)" opacity="0.88">
                  <animate attributeName="opacity" values="0.82;0.96;0.82" dur="4.4s" repeatCount="indefinite"/>
                </path>

                {/* Directional glass sheen (top-left lighting) */}
                <rect x={x} y={y} width={w} height={105} fill="url(#m-sheen)"/>

                {/* UV emission at plate bottom */}
                <rect x={x} y={y + h - 72} width={w} height={72} fill="url(#m-emit)"/>

                {/* Edge speculars */}
                <rect x={x}         y={y} width={11} height={h} fill="url(#m-el)"/>
                <rect x={x + w - 11} y={y} width={11} height={h} fill="url(#m-er)"/>
              </g>

              {/* OPC mask boundary — the "pink solid line" from SVG export */}
              {/* 1. Dark shadow under the line */}
              <path d={MASK_PATH} fill="none"
                stroke="rgba(78,24,66,0.86)" strokeWidth="2.6"
                strokeLinejoin="round" strokeLinecap="round"/>
              {/* 2. Bright white-pink outer line */}
              <path d={MASK_PATH} fill="none"
                stroke="rgba(255,240,252,0.98)" strokeWidth="1.22"
                strokeLinejoin="round" strokeLinecap="round"/>

              {/* Plate border — premium glass edge */}
              <rect x={x} y={y} width={w} height={h} rx={r} fill="none"
                stroke="rgba(190,212,255,0.26)" strokeWidth="1.4"/>
              {/* Inner rim */}
              <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx={r} fill="none"
                stroke="rgba(220,236,255,0.09)" strokeWidth="0.5"/>

              {/* Label */}
              <text x={x + w / 2} y={y + h - 13} textAnchor="middle"
                fill="rgba(167,139,250,0.52)" fontSize="10"
                fontFamily="'SF Mono','Menlo',monospace" letterSpacing="0.30em" fontWeight="600">
                OPC MASK
              </text>
            </svg>
          </div>

          {/* ══ LIGHT BEAM ════════════════════════════════════════════════ */}
          {/* UV photon column traveling from mask aperture to silicon */}
          <div className="lps-pw lps-pw-beam">
            <svg viewBox={VB} xmlns="http://www.w3.org/2000/svg">
              <defs>
                {/* Light column fades as it travels toward silicon */}
                <linearGradient id="b-fade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="rgba(175,115,255,0.52)"/>
                  <stop offset="30%"  stopColor="rgba(145,90,245,0.28)"/>
                  <stop offset="65%"  stopColor="rgba(115,68,230,0.12)"/>
                  <stop offset="100%" stopColor="rgba(85,48,210,0.02)"/>
                </linearGradient>

                {/* Clip beam to mask opening shape */}
                <clipPath id="b-cp">
                  <path d={MASK_PATH}/>
                </clipPath>
              </defs>

              {/* Beam column — clipped to aperture */}
              <g clipPath="url(#b-cp)">
                <rect x={x} y={y} width={w} height={h} fill="url(#b-fade)"/>

                {/* Floating UV photon particles */}
                <circle cx="455" cy="458" r="2.0" fill="rgba(215,195,255,0.85)">
                  <animate attributeName="cy" values="458;414;458" dur="2.9s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.85;0.12;0.85" dur="2.9s" repeatCount="indefinite"/>
                </circle>
                <circle cx="648" cy="598" r="1.6" fill="rgba(200,178,255,0.75)">
                  <animate attributeName="cy" values="598;556;598" dur="3.7s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.75;0.10;0.75" dur="3.7s" repeatCount="indefinite"/>
                </circle>
                <circle cx="355" cy="452" r="1.4" fill="rgba(222,205,255,0.68)">
                  <animate attributeName="cy" values="452;412;452" dur="2.6s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.68;0.08;0.68" dur="2.6s" repeatCount="indefinite"/>
                </circle>
                <circle cx="692" cy="716" r="1.5" fill="rgba(195,172,255,0.64)">
                  <animate attributeName="cy" values="716;676;716" dur="4.1s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.64;0.08;0.64" dur="4.1s" repeatCount="indefinite"/>
                </circle>
                <circle cx="510" cy="432" r="1.2" fill="rgba(205,185,255,0.60)">
                  <animate attributeName="cy" values="432;396;432" dur="3.3s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.60;0.07;0.60" dur="3.3s" repeatCount="indefinite"/>
                </circle>
                <circle cx="580" cy="780" r="1.3" fill="rgba(185,162,255,0.56)">
                  <animate attributeName="cy" values="780;742;780" dur="3.9s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.56;0.06;0.56" dur="3.9s" repeatCount="indefinite"/>
                </circle>
              </g>
            </svg>
          </div>

          {/* ══ SILICON PLATE ═════════════════════════════════════════════ */}
          {/* Silicon substrate — thermal aerial image + simulation contour */}
          <div className="lps-pw lps-pw-aerial">
            <svg viewBox={VB} xmlns="http://www.w3.org/2000/svg">
              <defs>
                {/* Deep silicon substrate */}
                <radialGradient id="s-bg" cx="44%" cy="42%" r="74%">
                  <stop offset="0%"   stopColor="#0d1814"/>
                  <stop offset="100%" stopColor="#050a07"/>
                </radialGradient>

                {/* Micro grid */}
                <pattern id="s-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M20,0 L20,20 L0,20" fill="none"
                    stroke="rgba(72,176,118,0.036)" strokeWidth="0.6"/>
                </pattern>

                {/* UV arrival glow — light entering from mask above */}
                <linearGradient id="s-uv-in" x1="0.3" y1="0" x2="0.7" y2="1">
                  <stop offset="0%"   stopColor="rgba(158,118,255,0.38)"/>
                  <stop offset="6%"   stopColor="rgba(130,98,248,0.13)"/>
                  <stop offset="20%"  stopColor="rgba(100,75,230,0.04)"/>
                  <stop offset="100%" stopColor="rgba(70,50,210,0)"/>
                </linearGradient>

                {/* ── Thermal aerial image gradients (clipped to L-shape) ── */}
                {/* Base exposure: deep violet wash */}
                <radialGradient id="s-hm" gradientUnits="userSpaceOnUse" cx="525" cy="622" r="316">
                  <stop offset="0%"   stopColor="#5500cc" stopOpacity="0.64"/>
                  <stop offset="44%"  stopColor="#3200aa" stopOpacity="0.50"/>
                  <stop offset="100%" stopColor="#120040" stopOpacity="0.78"/>
                </radialGradient>

                {/* Hot spot 1 — inner L-junction corner (most critical, hottest) */}
                <radialGradient id="s-h1" gradientUnits="userSpaceOnUse" cx="610" cy="510" r="138">
                  <stop offset="0%"   stopColor="#ffffcc" stopOpacity="1.00"/>
                  <stop offset="7%"   stopColor="#ffe200" stopOpacity="0.96"/>
                  <stop offset="20%"  stopColor="#ff7a00" stopOpacity="0.90"/>
                  <stop offset="38%"  stopColor="#dd0000" stopOpacity="0.74"/>
                  <stop offset="58%"  stopColor="#880077" stopOpacity="0.48"/>
                  <stop offset="80%"  stopColor="#440044" stopOpacity="0.22"/>
                  <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
                </radialGradient>

                {/* Hot spot 2 — right arm tip */}
                <radialGradient id="s-h2" gradientUnits="userSpaceOnUse" cx="713" cy="453" r="107">
                  <stop offset="0%"   stopColor="#ffeeaa" stopOpacity="0.95"/>
                  <stop offset="13%"  stopColor="#ffaa00" stopOpacity="0.88"/>
                  <stop offset="32%"  stopColor="#cc2200" stopOpacity="0.70"/>
                  <stop offset="58%"  stopColor="#770077" stopOpacity="0.36"/>
                  <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
                </radialGradient>

                {/* Hot spot 3 — bottom arm tip */}
                <radialGradient id="s-h3" gradientUnits="userSpaceOnUse" cx="658" cy="830" r="98">
                  <stop offset="0%"   stopColor="#ffdd88" stopOpacity="0.92"/>
                  <stop offset="13%"  stopColor="#ff8800" stopOpacity="0.82"/>
                  <stop offset="32%"  stopColor="#bb1100" stopOpacity="0.62"/>
                  <stop offset="58%"  stopColor="#660055" stopOpacity="0.32"/>
                  <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
                </radialGradient>

                {/* Contour glow filter */}
                <filter id="s-glow" x="-26%" y="-26%" width="152%" height="152%">
                  <feGaussianBlur stdDeviation="5.8" result="glow"/>
                  <feMerge>
                    <feMergeNode in="glow"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>

                {/* L-shape thermal clip */}
                <clipPath id="s-lclip">
                  <path d={TARGET_PATH}/>
                </clipPath>

                {/* Plate clip */}
                <clipPath id="s-cp">
                  <rect x={x} y={y} width={w} height={h} rx={r}/>
                </clipPath>

                {/* Silicon left edge specular */}
                <linearGradient id="s-el" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%"  stopColor="rgba(72,215,152,0.44)"/>
                  <stop offset="4%"  stopColor="rgba(55,195,135,0.11)"/>
                  <stop offset="100%" stopColor="rgba(35,165,112,0)"/>
                </linearGradient>

                {/* Silicon right edge specular */}
                <linearGradient id="s-er" x1="1" y1="0" x2="0" y2="0">
                  <stop offset="0%"  stopColor="rgba(62,205,142,0.32)"/>
                  <stop offset="4%"  stopColor="rgba(48,188,128,0.08)"/>
                  <stop offset="100%" stopColor="rgba(28,158,105,0)"/>
                </linearGradient>
              </defs>

              <g clipPath="url(#s-cp)">
                {/* Silicon substrate base */}
                <rect x={x} y={y} width={w} height={h} fill="url(#s-bg)"/>
                <rect x={x} y={y} width={w} height={h} fill="url(#s-grid)"/>

                {/* UV light arrival from mask above */}
                <rect x={x} y={y} width={w} height={100} fill="url(#s-uv-in)"/>

                {/* Thermal aerial image — clipped to L-shape target */}
                <g clipPath="url(#s-lclip)">
                  <rect x={x} y={y} width={w} height={h} fill="#18003c"/>
                  <rect x={x} y={y} width={w} height={h} fill="url(#s-hm)"/>
                  <rect x={x} y={y} width={w} height={h} fill="url(#s-h1)"/>
                  <rect x={x} y={y} width={w} height={h} fill="url(#s-h2)"/>
                  <rect x={x} y={y} width={w} height={h} fill="url(#s-h3)"/>
                </g>

                {/* Edge speculars */}
                <rect x={x}          y={y} width={11} height={h} fill="url(#s-el)"/>
                <rect x={x + w - 11} y={y} width={11} height={h} fill="url(#s-er)"/>
              </g>

              {/* Design intent — dashed teal target spec box */}
              <path d={TARGET_PATH} fill="none"
                stroke="rgba(20,222,182,0.54)" strokeWidth="1.5"
                strokeDasharray="5 4" strokeLinejoin="round"/>

              {/* Simulation contour — dark shadow then bright white with glow */}
              <path d={CONTOUR_PATH} fill="none"
                stroke="rgba(12,40,22,0.72)" strokeWidth="4.0"
                strokeLinejoin="round" strokeLinecap="round"/>
              <path d={CONTOUR_PATH} fill="none"
                stroke="rgba(255,255,255,0.97)" strokeWidth="2.2"
                filter="url(#s-glow)"
                strokeLinejoin="round" strokeLinecap="round"/>

              {/* Plate border */}
              <rect x={x} y={y} width={w} height={h} rx={r} fill="none"
                stroke="rgba(48,198,138,0.22)" strokeWidth="1.4"/>
              {/* Inner rim */}
              <rect x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx={r} fill="none"
                stroke="rgba(72,218,158,0.08)" strokeWidth="0.5"/>

              {/* Label */}
              <text x={x + w / 2} y={y + h - 13} textAnchor="middle"
                fill="rgba(52,211,153,0.50)" fontSize="10"
                fontFamily="'SF Mono','Menlo',monospace" letterSpacing="0.30em" fontWeight="600">
                SILICON PRINT
              </text>
            </svg>
          </div>

        </div>
      </div>
    </div>
  );
}
