"use client";

/**
 * The technical figures of the model and correction guides: recorded data and
 * SVG, styled by site-docs.css.
 * Colors follow the light theme: lines in ink and greys, and color only where
 * it stands for light intensity, in the 3D view's colormap.
 */
import { useId, useState } from "react";
import profile from "../../lib/marketing-optical-profile.json";
import { RecordedDrawing } from "../MarketingVisuals";
import { Wordmark } from "./ShellA";

/** The 3D view's "apple" colormap (marketing3d/components/Surface3DCanvas.tsx), by intensity 0..1. */
const LIGHT_STOPS: Array<[number, string]> = [
  [0, "#0e141e"],
  [0.22, "#27436c"],
  [0.45, "#5e5ce6"],
  [0.68, "#bf5af2"],
  [0.86, "#ff453a"],
  [1, "#ffd60a"],
];

export function ImagingSequence() {
  return (
    <figure className="pa-fig-sequence">
      <div className="pa-panel">
        <span>01 / Mask</span>
        <svg
          viewBox="0 0 1100 1100"
          role="img"
          aria-label="Binary L-shaped mask input"
        >
          <image
            href="/marketing/review/binary-mask.png"
            width="1100"
            height="1100"
          />
        </svg>
        <p>The input geometry.</p>
      </div>
      <div className="pa-panel pa-panel-lit">
        <span>02 / Aerial image</span>
        <svg
          viewBox="0 0 1100 1100"
          role="img"
          aria-label="Actual calculated aerial intensity, with a horizontal cross-section marked"
        >
          <image
            href="/marketing/review/aerial-field.webp"
            width="1100"
            height="1100"
          />
          <path
            d={`M100 ${1100 - profile.yNm} H1000`}
            stroke="#fff"
            strokeWidth="3"
            strokeDasharray="12 10"
          />
        </svg>
        <p>Light after optical filtering.</p>
      </div>
      <div className="pa-panel">
        <span>03 / Contour</span>
        <RecordedDrawing
          fullField
          label="Threshold contour with the original mask and target, over the same 1100 nanometer field"
        />
        <p>The boundary at I = 0.5.</p>
      </div>
      <figcaption>
        One mask, one optical calculation. All three panels show the same 1100
        nm field. The cross-section below follows the dashed line in the aerial
        image.
      </figcaption>
    </figure>
  );
}

export function ThresholdExplorer() {
  const [threshold, setThreshold] = useState(0.5);
  const id = useId();
  const x = (value: number) => 52 + (value / 1100) * 636;
  const y = (value: number) => 206 - value * 164;
  const curve = profile.intensity
    .map((value, i) => `${x(profile.x[i]).toFixed(2)},${y(value).toFixed(2)}`)
    .join(" ");
  const area = `M${x(profile.x[0]).toFixed(2)},${y(0)} L${curve.replace(/ /g, " L")} L${x(profile.x[profile.x.length - 1]).toFixed(2)},${y(0)} Z`;
  const light = `${id.replace(/:/g, "")}-light`;
  const crossings: number[] = [];
  for (let i = 1; i < profile.intensity.length; i++) {
    const a = profile.intensity[i - 1],
      b = profile.intensity[i];
    if ((a < threshold && b >= threshold) || (a >= threshold && b < threshold))
      crossings.push(
        profile.x[i - 1] +
          ((threshold - a) / (b - a)) * (profile.x[i] - profile.x[i - 1]),
      );
  }
  return (
    <figure className="pa-fig pa-fig-threshold">
      <div className="pa-fig-threshold-control">
        <label htmlFor={`${id}-threshold`}>
          Intensity threshold <strong>τ = {threshold.toFixed(2)}</strong>
        </label>
        <input
          id={`${id}-threshold`}
          className="pa-fig-range"
          aria-label="Intensity threshold"
          type="range"
          min="0.2"
          max="0.8"
          step="0.01"
          value={threshold}
          style={{ "--pa-fill": `${((threshold - 0.2) / 0.6) * 100}%` } as React.CSSProperties}
          onChange={(event) => setThreshold(Number(event.target.value))}
        />
      </div>
      <div
        className="pa-fig-scroll"
        tabIndex={0}
        role="group"
        aria-label="Aerial intensity cross-section. Scroll horizontally if needed."
      >
        <svg
          viewBox="0 0 730 300"
          role="img"
          aria-label={`Actual aerial-image cross-section at y=${profile.yNm} nm. Threshold ${threshold.toFixed(2)} defines the highlighted printed interval.`}
        >
          <defs>
            {/* The curve is colored like the light it measures: same intensity, same color as the 3D view */}
            <linearGradient id={light} gradientUnits="userSpaceOnUse" x1="0" y1={y(0)} x2="0" y2={y(1)}>
              {LIGHT_STOPS.map(([offset, color]) => (
                <stop key={offset} offset={offset} stopColor={color} />
              ))}
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((value) => (
            <g key={value}>
              <path
                d={`M52 ${y(value)} H688`}
                stroke="#e3e3e3"
                strokeWidth="1"
              />
              <text x="36" y={y(value) + 4} textAnchor="end">
                {value.toFixed(1)}
              </text>
            </g>
          ))}
          <text x="52" y="22">
            Aerial intensity I
          </text>
          <path d={area} fill={`url(#${light})`} fillOpacity=".12" />
          <polyline
            points={curve}
            fill="none"
            stroke={`url(#${light})`}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path
            d={`M52 ${y(threshold)} H688`}
            stroke="#111"
            strokeWidth="1.3"
            strokeDasharray="6 5"
          />
          <text x="699" y={y(threshold) + 4}>
            τ
          </text>
          <path d="M52 242 H688" stroke="#e6e6e6" strokeWidth="12" />
          {crossings.map((value, i) => (
            <g key={i}>
              <path
                d={`M${x(value)} ${y(threshold)} V252`}
                stroke="#9a9a9a"
                strokeDasharray="3 5"
              />
              {i % 2 === 0 && crossings[i + 1] !== undefined && (
                <path
                  d={`M${x(value)} 242 H${x(crossings[i + 1])}`}
                  stroke="#111"
                  strokeWidth="12"
                />
              )}
            </g>
          ))}
          <text x="52" y="274">
            Above threshold
          </text>
          <text x="688" y="274" textAnchor="end">
            Position x / nm
          </text>
          {[0, 550, 1100].map((value) => (
            <text key={value} x={x(value)} y="228" textAnchor="middle">
              {value}
            </text>
          ))}
        </svg>
      </div>
      <p className="pa-fig-scroll-hint">Scroll the diagram to see its full width.</p>
      <figcaption>
        Move the threshold. The light field stays fixed; the selected region
        changes. In <Wordmark />, the control named “dose” sets this threshold
        directly.
      </figcaption>
    </figure>
  );
}

export function PupilDiagram() {
  return (
    <figure className="pa-fig pa-fig-pupil">
      <div
        className="pa-fig-scroll"
        tabIndex={0}
        role="group"
        aria-label="Optical pupil diagram. Scroll horizontally if needed."
      >
        <svg
          viewBox="0 0 720 230"
          role="img"
          aria-label="Schematic circular pupil passes low spatial frequencies and rejects frequencies outside its cutoff"
        >
          <circle
            cx="145"
            cy="112"
            r="82"
            fill="#000"
            fillOpacity=".04"
            stroke="#111"
            strokeWidth="1.4"
          />
          <path d="M35 112H255M145 12V214" stroke="#c4c4c4" strokeWidth="1" />
          <path d="M145 112L207 58" stroke="#555" />
          <text x="180" y="69">
            ρc
          </text>
          <text x="263" y="118">
            u
          </text>
          <text x="152" y="23">
            v
          </text>
          <text x="99" y="145">
            P = 1
          </text>
          <path d="M360 179H675M360 179V31" stroke="#c4c4c4" />
          <path
            d="M360 62H495V179H675"
            fill="none"
            stroke="#111"
            strokeWidth="2.3"
          />
          <path
            d="M360 62C412 63 457 86 495 128C544 175 605 179 675 179"
            fill="none"
            stroke="#8a8a8a"
            strokeWidth="2"
          />
          <text x="361" y="22">
            Transfer amplitude / schematic
          </text>
          <text x="481" y="201">
            ρc
          </text>
          <text x="650" y="201">
            ρ
          </text>
          <text x="550" y="62" style={{ fill: "#111" }}>
            Pupil P
          </text>
          <text x="550" y="85" style={{ fill: "#777" }}>
            Gaussian G
          </text>
        </svg>
      </div>
      <p className="pa-fig-scroll-hint">Scroll the diagram to see its full width.</p>
      <figcaption>
        Schematic: the pupil cuts off fine detail; an additional Gaussian factor
        softens the transmitted field. Plot spacing is illustrative.
      </figcaption>
    </figure>
  );
}

export function EpeDiagram() {
  return (
    <figure className="pa-fig pa-fig-epe">
      <div
        className="pa-fig-scroll"
        tabIndex={0}
        role="group"
        aria-label="Edge placement error diagram. Scroll horizontally if needed."
      >
        <svg
          viewBox="0 0 720 220"
          role="img"
          aria-label="Schematic EPE measurement: target sample p, outward normal n, and nearest contour point q inside the target"
        >
          {/* Same line language as the drawings: target dashed grey, print solid ink */}
          <path
            d="M45 190V40H330V190Z"
            fill="#000"
            fillOpacity=".03"
            stroke="#8f8f8f"
            strokeWidth="2.2"
            strokeDasharray="6 4.5"
            strokeLinecap="round"
          />
          <path
            d="M87 190V98Q87 73 116 73H259Q290 73 290 101V190"
            fill="#000"
            fillOpacity=".05"
            stroke="#111"
            strokeWidth="2.5"
          />
          <path d="M336 130H407" stroke="#555" strokeWidth="1.4" />
          <path d="M415 130L405 125V135Z" fill="#555" />
          <path
            d="M294 125V135M294 130H325M325 125V135"
            stroke="#111"
            strokeWidth="1.4"
            fill="none"
          />
          <circle cx="330" cy="130" r="5" fill="#fff" stroke="#555" strokeWidth="1.6" />
          <circle cx="290" cy="130" r="4.5" fill="#111" />
          <text x="309.5" y="118" textAnchor="middle">
            e
          </text>
          <text x="338" y="153">
            p
          </text>
          <text x="274" y="153">
            q
          </text>
          <text x="382" y="114">
            n
          </text>
          <text x="465" y="68">
            Contour inside target
          </text>
          <text x="465" y="100">
            e &lt; 0: grow the mask
          </text>
          <text x="465" y="149">
            Contour outside target
          </text>
          <text x="465" y="181">
            e &gt; 0: shrink the mask
          </text>
        </svg>
      </div>
      <p className="pa-fig-scroll-hint">Scroll the diagram to see its full width.</p>
      <figcaption>
        Schematic, not to scale. The target stays fixed. Signed error tells each
        exposed mask edge which way to move.
      </figcaption>
    </figure>
  );
}

export function Existing3dPair() {
  return (
    <figure className="pa-fig-pair">
      <div>
        {[
          ["before-3d.webp", "Before correction"],
          ["after-3d.webp", "After correction"],
        ].map(([file, label]) => (
          <div key={file} className="pa-panel">
            <img
              src={`/marketing/review/${file}`}
              alt={`litopc 3D view: ${label.toLowerCase()}`}
              width="1000"
              height="1000"
            />
            <span>{label}</span>
          </div>
        ))}
      </div>
      <figcaption>
        <Wordmark /> 3D views of a separate example, before and after correction.
        Surface height represents aerial intensity, not resist.
      </figcaption>
    </figure>
  );
}
