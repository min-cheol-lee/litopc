import "../simulator-theme.css";
import "../simulator-learn.css";
import "../site.css";
import "../site-mono.css";
import "../site-docs.css";
import Link from "next/link";
import geometry from "../../lib/marketing-simulation.json";
import type { ComponentProps } from "react";
import {
  TechnicalArticleA,
  TechnicalSectionA,
  docMetadataA,
} from "../../components/site/DocsA";
import { CustomFigure, RecordedPrint, SimulationFigure } from "../../components/site/Figures";
import customRun from "../../lib/marketing-custom-run.json";
import { ChevronIcon } from "../../components/site/Icons";
import { SIMULATOR_URL } from "../../lib/marketing";
import { BasicsTour } from "../../components/site/BasicsTour";
import { ITERATIONS, MEAN_AFTER, MEAN_BEFORE, POINT_COUNT, fmt } from "../../components/learn/learn-data";
import {
  Existing3dPair,
  ThresholdExplorer,
} from "../../components/site/FiguresDocsA";
import { ROUTES } from "../../components/site/routes";
import { Wordmark } from "../../components/site/ShellA";
import { Opc, OpcName } from "../../components/site/Opc";

export const metadata = docMetadataA(
  "Plain-language guide",
  "What litopc does, in pictures: how a chip pattern is printed with light, why it blurs, and how the mask is corrected.",
  "/basics",
);

const contents = [
  { id: "stencil", label: "A stencil and a lamp" },
  { id: "print", label: "Drawn vs printed" },
  { id: "miss", label: "Where the print misses" },
  { id: "fix", label: "The fix" },
  { id: "tour", label: "Watch it" },
  { id: "three-d", label: "In 3D" },
  { id: "lines", label: "Lines close together" },
  { id: "knob", label: "The brightness knob" },
  { id: "yours", label: "Draw your own" },
  { id: "glossary", label: "Glossary" },
];

/** [term, plain meaning, where you see it] */
const glossary: Array<[string, string, string]> = [
  ["Lithography", "Printing a chip's pattern onto silicon with light.", "Everything on this site."],
  ["Wafer, chip", "The round silicon plate chips are made on; a chip is one small square of it.", "The dark square in the 3D view."],
  ["Mask", "The stencil: a glass plate with the pattern on it.", "The pale plate on top."],
  ["Target", "The shape you want to end up with.", "The dashed outline."],
  ["Aerial image", "The light pattern that lands on the wafer after the lens blurs it.", "The glowing heat map."],
  ["Printed contour", "The outline that would really appear on the wafer.", "The solid outline."],
  ["Wavelength", "The size of one ripple of the light; smaller draws finer detail.", "193 nm (DUV) or 13.5 nm (EUV)."],
  ["Nanometer (nm)", "A billionth of a meter. A hair is about 80,000 nm wide.", "Every size here."],
  ["DUV", "Deep ultraviolet, the light most chip factories use.", "One of the two optics."],
  ["EUV", "Extreme ultraviolet, much shorter light for the finest chips.", "The other optics."],
  ["NA", "How wide a cone of light the lens collects; bigger sees finer detail.", "0.93 for DUV, 0.33 for EUV."],
  ["Resist", "The light-sensitive coating on the wafer.", "Simplified to one brightness cutoff."],
  ["Threshold, dose", "The brightness that counts as exposed.", "The slider from 0 to 1."],
  ["OPC (optical proximity correction)", "Reshaping the stencil so the blurred print comes out right.", "The Corrected button."],
  ["Iteration", "One round of simulate, measure, nudge.", "5 on the home page, 10 in the guide."],
  ["EPE", "How far the print sits from the target, in nanometers.", "The number after correction."],
  ["CD", "The width of the narrowest line.", "One number per simulation."],
  ["Focus", "How sharply the lens is focused.", "A 0 to 1 blur control."],
  ["Sweep", "Repeating a run while one setting changes.", "5 points Free, 120 Pro."],
];

/** Sections on this page show their titles: a centered title, a one-line lead, then the picture. */
function Section(props: Omit<ComponentProps<typeof TechnicalSectionA>, "showTitle">) {
  return <TechnicalSectionA {...props} showTitle />;
}

function DenseLines() {
  const d = geometry.dense;
  return (
    <svg
      viewBox={d.viewBox.join(" ")}
      role="img"
      aria-label="Four parallel mask lines with their printed contours"
    >
      <path className="pa-ln-mask" d={d.mask} />
      <path className="pa-ln-target" d={d.target} />
      <path className="pa-ln-print" d={d.contour} />
    </svg>
  );
}

export default function Page() {
  return (
    <TechnicalArticleA
      title="Plain-language guide"
      introduction={
        <>
          <Wordmark />, in pictures.
        </>
      }
      contents={contents}
      next={{ href: ROUTES.modelSimulation, label: "How the print is simulated" }}
      centered
      beforeContents={
        <p className="pa-doc-opening">
          A chip is printed with light. Here is how, one picture at a time.
        </p>
      }
    >
      <Section id="stencil" title="A stencil and a lamp" eyebrow="Step 1 · The mask">
        <p className="pa-doc-lead">
          A chip is printed with light. A stencil on top, a lamp above it, and
          the wafer below.
        </p>
        <figure className="pa-basics-figure pa-basics-narrow pa-panel pa-panel-lit">
          <img
            className="pa-still"
            src="/marketing/review/l-corner-before.webp"
            alt="litopc 3D view: a mask plate with an L-shaped opening floating above a wafer, with the light pattern glowing on the wafer"
            width="1600"
            height="1600"
          />
          <span className="pa-basics-label" style={{ left: "6%", top: "14%" }}>
            Mask: the stencil
          </span>
          <span className="pa-basics-label" style={{ left: "6%", top: "48%" }}>
            Light passes through the L
          </span>
          <span className="pa-basics-label" style={{ left: "6%", top: "80%" }}>
            Wafer: what gets built
          </span>
          <figcaption>
            Real <Wordmark /> output. The glow on the wafer is where the light
            lands.
          </figcaption>
        </figure>
      </Section>

      <Section id="print" title="What you draw vs what prints" eyebrow="Step 2 · The print">
        <p className="pa-doc-lead">
          The shapes are so small that the light blurs on the way down. The
          print is not the stencil.
        </p>
        <SimulationFigure />
        <p className="pa-basics-caption">
          Left: the L you drew. Middle: the light that actually arrives. Right:
          the shape that prints (solid line) against what you wanted (dashed).
        </p>
      </Section>

      <Section id="miss" title="Where the print misses" eyebrow="Step 3 · The miss">
        <p className="pa-doc-lead">
          Corners round off. Line ends pull back. The middle gets thin.
        </p>
        <figure className="pa-basics-figure pa-basics-narrow pa-panel">
          <RecordedPrint
            iteration={0}
            showMisses
            label="Uncorrected L over its light: the printed outline falls inside the dashed target, and short black ticks show how far it misses at measured points"
          />
          <figcaption>
            How far the print lands from the target is called edge placement
            error, or EPE. Each black tick is one measurement of it, from the
            dashed target to the printed line. <Wordmark /> takes {POINT_COUNT}{" "}
            of them around this shape; one per edge is drawn here.
          </figcaption>
        </figure>
      </Section>

      <Section id="fix" title="The fix" eyebrow="Step 4 · The fix">
        <p className="pa-doc-lead">
          Where the print came out too small, make the stencil bigger. Where it
          came out too big, make it smaller. Then check again.
        </p>
        <div className="pa-basics-pair">
          <figure className="pa-panel">
            <RecordedPrint
              iteration={0}
              label="Mask as drawn: a plain L over its light; the print misses the dashed target"
            />
            <figcaption>Mask as drawn</figcaption>
          </figure>
          <figure className="pa-panel pa-panel-lit">
            <RecordedPrint
              iteration={5}
              label="Mask after correction: the L with small ears and notches added; the print now follows the dashed target"
            />
            <figcaption>Mask after correction</figcaption>
          </figure>
        </div>
        <p className="pa-basics-caption">
          This is <OpcName />, or <Opc />. The little ears and notches are the
          nudges. The target never moved; only the stencil did, and now the
          print lands on it. {ITERATIONS} rounds took the average miss from{" "}
          {fmt(MEAN_BEFORE)}&nbsp;nm to {fmt(MEAN_AFTER)}&nbsp;nm.
        </p>
      </Section>

      <Section id="tour" title="All four steps, in half a minute" eyebrow="Recap">
        <p className="pa-doc-lead">
          The same run, played through. It starts on its own; click a step to
          jump, or switch to 3D at the end.
        </p>
        <BasicsTour />
      </Section>

      <Section id="three-d" title="In 3D" eyebrow="Step 4, in 3D">
        <p className="pa-doc-lead">
          The same correction in the 3D view: the stencil above, the light on
          the wafer below.
        </p>
        <Existing3dPair />
      </Section>

      <Section id="lines" title="Lines close together" eyebrow="Going further">
        <p className="pa-doc-lead">
          Neighbors matter. Lines drawn side by side print thinner, and their
          ends fall short.
        </p>
        <div className="pa-basics-pair">
          <figure className="pa-panel">
            <DenseLines />
            <figcaption>Four lines: drawn (blue), wanted (dashed), printed (solid)</figcaption>
          </figure>
          <figure className="pa-panel pa-panel-lit">
            <img
              className="pa-still"
              src="/marketing/review/line-space-before.webp"
              alt="litopc 3D view of four parallel mask lines above their light pattern on the wafer"
              width="1600"
              height="1600"
            />
            <figcaption>The same kind of pattern in 3D</figcaption>
          </figure>
        </div>
      </Section>

      <Section id="knob" title="The brightness knob" eyebrow="Going further">
        <p className="pa-doc-lead">
          The wafer coating only reacts where the light is bright enough. Move
          the cutoff and watch the printed width change.
        </p>
        <ThresholdExplorer />
      </Section>

      <Section id="yours" title="Draw your own" eyebrow="Your turn">
        <p className="pa-doc-lead">
          The built-in patterns are a start. Draw any mask from rectangles, set
          the target, and run the same simulation and correction on it.
        </p>
        <CustomFigure />
        <p className="pa-basics-caption">
          This one is three rectangles: a pad with a notch and a line running
          up to its side. Simulated and corrected with the same code the
          simulator runs: the average miss went from{" "}
          {customRun.frames[0].epeMeanNm.toFixed(1)}&nbsp;nm to{" "}
          {customRun.frames[1].epeMeanNm.toFixed(1)}&nbsp;nm in{" "}
          {customRun.frames[1].iteration} rounds. Free accounts draw up to 5
          rectangles; Pro, up to 48.
        </p>
        <p className="pa-centered pa-basics-more">
          <a className="pa-link" href={SIMULATOR_URL}>
            <span>Draw one in the simulator</span>
            <ChevronIcon />
          </a>
        </p>
      </Section>

      <Section id="glossary" title="Glossary">
        <p className="pa-doc-lead">The words used on this site.</p>
        <div className="pa-doc-table pa-doc-glossary" tabIndex={0} aria-label="Glossary of lithography terms">
          <table>
            <thead>
              <tr>
                <th scope="col">Term</th>
                <th scope="col">Plain meaning</th>
                <th scope="col">Where you see it</th>
              </tr>
            </thead>
            <tbody>
              {glossary.map(([term, meaning, here]) => (
                <tr key={term}>
                  <th scope="row">{term}</th>
                  <td>{meaning}</td>
                  <td>{here}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pa-basics-caption">
          <Wordmark /> is for learning and exploring. The pictures are real
          simulation results, but the model is simplified and not calibrated to
          any factory. The actual equations are in{" "}
          <Link href={ROUTES.modelSimulation}>the model guide</Link>.
        </p>
      </Section>
    </TechnicalArticleA>
  );
}
