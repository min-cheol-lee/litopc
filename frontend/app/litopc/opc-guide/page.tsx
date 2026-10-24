import "../../site.css";
import "../../site-mono.css";
import "../../site-docs.css";
import Link from "next/link";
import {
  EquationA as Equation,
  TechnicalArticleA,
  TechnicalSectionA as Section,
  docMetadataA,
} from "../../../components/site/DocsA";
import { OpcReplay } from "../../../components/MarketingVisuals";
import {
  EpeDiagram,
  Existing3dPair,
} from "../../../components/site/FiguresDocsA";
import { ROUTES } from "../../../components/site/routes";
import { Wordmark } from "../../../components/site/ShellA";
import { Opc, OpcName } from "../../../components/site/Opc";

export const metadata = docMetadataA(
  "Mask correction",
  "How litopc runs optical proximity correction (OPC): target sampling, signed edge placement error, constrained mask updates, and verified iterations.",
  "/litopc/opc-guide",
);
const contents = [
  { id: "idea", label: "Why the mask changes" },
  { id: "replay", label: "Watch a real run" },
  { id: "epe", label: "Edge placement error" },
  { id: "update", label: "Moving mask edges" },
  { id: "constraints", label: "Geometry constraints" },
  { id: "workflow", label: "Try & interpret" },
];

export default function Page() {
  return (
    <TechnicalArticleA
      title="Mask correction"
      introduction={<>How <Wordmark /> corrects the mask.</>}
      contents={contents}
      next={{
        href: ROUTES.modelSimulation,
        label: "How the print is simulated",
      }}
    >
      <Section id="idea" title="The target is not the mask.">
        <p className="pa-doc-aside">
          New to lithography? Start with the{" "}
          <Link href={ROUTES.basics}>plain-language guide</Link>.
        </p>
        <p className="pa-doc-lead">
          The target is your intended printed shape.
        </p>
        <p>
          The mask is the geometry that produces it through the optical model.
          Drawing those two shapes identically does not generally give an
          identical contour: neighboring features interact, line ends shorten,
          and corners round.
        </p>
        <p>
          <OpcName capital />, or <Opc />, deliberately biases the mask so the resulting
          contour follows the target more closely. <Wordmark /> runs model-based{" "}
          <Opc />, an edge-driven loop: it simulates the image, measures the
          error, moves the mask edges, then simulates again. The target stays
          fixed throughout. This is a local feedback method, not a neural
          network or a globally optimized inverse-lithography solver.
        </p>
      </Section>
      <Section id="replay" title="One L-corner, ten corrections.">
        <p className="pa-doc-lead">
          This replay uses the current correction code and optical engine.
        </p>
        <p>
          Each displayed mask has been re-simulated, and the contour and error
          belong to that exact mask. Scrub the steps to see where the contour
          improves and where it still differs.
        </p>
        <OpcReplay />
        <p>
          The recorded run starts at 25.30 nm mean absolute EPE and reaches 3.95
          nm after ten iterations. These values describe this example, not a
          general accuracy claim. Iteration 8 is slightly worse than iteration
          7: correction is not guaranteed to improve at every step.
        </p>
        <p>
          Settings: DUV dry, λ = 193 nm, NA = 0.93, threshold 0.5, focus 0, 1100
          nm field, 512² grid. This example uses 100 nm segmentation, gain 0.5,
          and seven samples per exposed edge; the simulator’s default segment
          size is 20 nm.
        </p>
      </Section>
      <Section id="epe" title="Edge placement error.">
        <p className="pa-doc-lead">
          <Wordmark /> first resolves overlapping rectangles and splits long edges
          into segments.
        </p>
        <p>
          Mask and target segments stay paired. Interior edges created by the
          split are excluded, so only the exposed boundary is measured.
        </p>
        <p>
          For each sampled target point p<sub>i</sub>, <Wordmark /> finds the nearest
          point q<sub>i</sub> on the simulated contour within a bounded search
          region. The displacement projected onto the target’s outward normal
          n<sub>i</sub> is the signed edge placement error:
        </p>
        <Equation
          number="1"
          label="Signed edge placement error e i equals q i minus p i dotted with the outward normal n i"
          math='<msub><mi>e</mi><mi>i</mi></msub><mo>=</mo><mrow><mo stretchy="false">(</mo><msub><mi>𝒒</mi><mi>i</mi></msub><mo>−</mo><msub><mi>𝒑</mi><mi>i</mi></msub><mo stretchy="false">)</mo></mrow><mo>·</mo><msub><mi>𝒏</mi><mi>i</mi></msub>'
        />
        <EpeDiagram />
        <p>
          Negative error means the contour is inside the target along that
          normal; positive error means it is outside. A bounded search helps
          avoid measuring an unrelated neighboring line. Missing contours or
          unmeasurable target edges stop correction; they are not counted as
          zero error.
        </p>
        <p>
          Each iteration reports the mean and the largest absolute sample
          error. Mean EPE summarizes the boundary; maximum EPE marks the worst
          sampled location:
        </p>
        <Equation
          number="2"
          label="Mean EPE equals the average absolute e i; maximum EPE equals the largest absolute e i"
          math='<msub><mi mathvariant="normal">EPE</mi><mi>mean</mi></msub><mo>=</mo><mfrac><mn>1</mn><mi>K</mi></mfrac><munderover><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mi>K</mi></munderover><mrow><mo stretchy="false">|</mo><msub><mi>e</mi><mi>i</mi></msub><mo stretchy="false">|</mo></mrow><mo>,</mo><mspace width="1em"/><msub><mi mathvariant="normal">EPE</mi><mi>max</mi></msub><mo>=</mo><munder><mi mathvariant="normal">max</mi><mi>i</mi></munder><mspace width="0.1667em"/><mrow><mo stretchy="false">|</mo><msub><mi>e</mi><mi>i</mi></msub><mo stretchy="false">|</mo></mrow>'
        />
        <p>
          K is the number of valid exposed-edge samples. These are sampled
          statistics, not a continuous worst-case bound over every point of the
          shape.
        </p>
        <p>
          CD measures feature width, not placement: the width can look
          reasonable while both edges are shifted. Check the spatial EPE overlay
          as well as the average, especially at corners and line ends.
        </p>
      </Section>
      <Section id="update" title="Moving mask edges.">
        <p className="pa-doc-lead">
          Each exposed mask edge receives a proposed outward displacement Δb
          based on its mean signed error.
        </p>
        <p>The gain g controls how much of that error to correct at once:</p>
        <Equation
          number="3"
          label="Proposed outward mask-edge displacement delta b j equals minus gain g times the mean signed error on edge j"
          math='<mi mathvariant="normal">Δ</mi><msub><mi>b</mi><mi>j</mi></msub><mo>=</mo><mrow><mo>−</mo><mi>g</mi><msub><mover accent="true"><mi>e</mi><mo>¯</mo></mover><mi>j</mi></msub></mrow>'
        />
        <p>
          If an edge’s mean error is −10 nm and g = 0.5, its proposed mask
          growth is +5 nm before constraints. This does not predict a 5 nm
          contour movement: neighboring edges, diffraction, thresholding, and
          grid sampling couple the response. That is why the next optical
          simulation is essential.
        </p>
        <p>
          The default is g = 0.5. Once two results are available, a rise of
          more than 2% in mean EPE reduces the gain for the next iteration by
          25%, down to a floor of one quarter of the starting gain. A worse
          iteration stays in the history; it is not replaced by a
          better-looking result.
        </p>
        <p>
          Every corrected mask is simulated and measured before it is shown, so
          N correction steps take N + 1 optical simulations including the
          baseline. Every frame in the replay follows that rule.
        </p>
      </Section>
      <Section id="constraints" title="Geometry constraints.">
        <p className="pa-doc-lead">
          Proposed movements are constrained by minimum width, minimum space
          between distinct shapes, maximum edge bias, and grid snapping.
        </p>
        <p>
          Interior edges stay fixed. These checks constrain the local updates;
          they are not a full mask rule check.
        </p>
        <div
          className="pa-doc-table"
          tabIndex={0}
          aria-label="Current OPC geometry constraints"
        >
          <table>
            <thead>
              <tr>
                <th scope="col">Enabled preset</th>
                <th scope="col">Min. width / space</th>
                <th scope="col">Max. bias</th>
                <th scope="col">Grid</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>DUV dry</td>
                <td>50 / 50 nm</td>
                <td>80 nm</td>
                <td>1 nm</td>
              </tr>
              <tr>
                <td>EUV Low-NA</td>
                <td>12 / 12 nm</td>
                <td>20 nm</td>
                <td>0.5 nm</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Maximum bias is measured from each edge’s starting position for the
          current correction batch. Continuing in a new batch resets that
          reference; it is not a lifetime limit measured from the original
          design.
        </p>
        <p>
          Correction requires a target built from rectangles. Fine segmentation
          reveals local error but can leave short edges unmeasurable; if a
          feature does not print at all, change the geometry or settings rather
          than trusting a low score.
        </p>
      </Section>
      <Section id="workflow" title="Read the shape, not just the score.">
        <p className="pa-doc-lead">
          Start with a built-in pattern such as an L-corner.
        </p>
        <p>
          Simulate it and compare the target and contour. Run Correct, then
          inspect the verified history and EPE overlay. Look for missing
          features, narrowed connections, overshoot, or improvement concentrated
          on only one part of the boundary.
        </p>
        <Existing3dPair />
        <p>
          Keep the optical preset, field, grid, threshold, and focus fixed when
          comparing correction steps. If you change those settings, evaluate the
          corrected mask again. A low error at one setting does not establish a
          process window or manufacturing robustness.
        </p>
        <p>
          Use Apply to Mask to keep editing a result you have inspected, and
          export a 2D or 3D figure or the correction GIF to share the
          progression. For the assumptions behind the simulated contour, read
          the <Link href={ROUTES.modelSimulation}>model simulation guide</Link>.
        </p>
      </Section>
    </TechnicalArticleA>
  );
}
