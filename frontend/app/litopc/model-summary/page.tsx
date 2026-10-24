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
import {
  ImagingSequence,
  PupilDiagram,
  ThresholdExplorer,
} from "../../../components/site/FiguresDocsA";
import { ROUTES } from "../../../components/site/routes";
import { Wordmark } from "../../../components/site/ShellA";

export const metadata = docMetadataA(
  "Model simulation",
  "How litopc turns a mask into an aerial image and contour: the actual equations, physical interpretation, and limitations.",
  "/litopc/model-summary",
);
const contents = [
  { id: "overview", label: "From geometry to light" },
  { id: "optics", label: "Optical imaging" },
  { id: "focus", label: "Focus parameter" },
  { id: "resist", label: "Resist & threshold" },
  { id: "sampling", label: "Presets & sampling" },
  { id: "variation", label: "Parameter sweeps" },
  { id: "scope", label: "Scope & limits" },
];

export default function Page() {
  return (
    <TechnicalArticleA
      title="Model simulation"
      introduction="How a mask becomes a printed contour."
      contents={contents}
      next={{ href: ROUTES.maskCorrection, label: "How OPC corrects the mask" }}
    >
      <Section id="overview" title="A mask is the starting point.">
        <p className="pa-doc-aside">
          New to lithography? Start with the{" "}
          <Link href={ROUTES.basics}>plain-language guide</Link>.
        </p>
        <p className="pa-doc-lead">
          A photomask describes the pattern we want light to carry.
        </p>
        <p>
          In <Wordmark />, its geometry becomes a binary grid, M(x, y): transmitting
          regions have value 1 and blocked regions have value 0. The optics
          filter this input into a continuous light field. A threshold then
          turns that field into a simulated printed boundary.
        </p>
        <ImagingSequence />
        <p>
          The aerial image shows light intensity in the image plane. The 3D view
          lifts that same intensity into a surface so its shape is easier to
          see. Its height does not represent resist thickness or etched silicon.
        </p>
      </Section>
      <Section id="optics" title="The optics remove fine detail.">
        <p className="pa-doc-lead">
          Sharp corners contain high spatial frequencies: rapid changes in the
          pattern.
        </p>
        <p>
          A finite numerical aperture passes only part of that frequency
          content. This is why the image of a crisp mask can have rounded
          corners and shortened line ends.
        </p>
        <p>
          The current engine uses a scalar coherent imaging proxy. It
          Fourier-transforms the mask, multiplies by three filters, transforms
          back to a complex field E, and takes its squared magnitude:
        </p>
        <Equation
          number="1"
          label="E equals inverse Fourier transform of Fourier transform of M times P times G times B"
          math='<mi>E</mi><mo>=</mo><msup><mi>ℱ</mi><mrow><mo>−</mo><mn>1</mn></mrow></msup><mrow><mo stretchy="false">{</mo><mi>ℱ</mi><mrow><mo stretchy="false">{</mo><mi>M</mi><mo stretchy="false">}</mo></mrow><mo>·</mo><mi>P</mi><mo>·</mo><mi>G</mi><mo>·</mo><mi>B</mi><mo stretchy="false">}</mo></mrow>'
        />
        <Equation
          number="2"
          label="I equals clip of the squared magnitude of E, between zero and one"
          math='<mi>I</mi><mrow><mo stretchy="false">(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo stretchy="false">)</mo></mrow><mo>=</mo><mi mathvariant="normal">clip</mi><mrow><mo stretchy="false">(</mo><msup><mrow><mo stretchy="false">|</mo><mi>E</mi><mo stretchy="false">|</mo></mrow><mn>2</mn></msup><mo>,</mo><mn>0</mn><mo>,</mo><mn>1</mn><mo stretchy="false">)</mo></mrow>'
        />
        <p>
          ℱ denotes the two-dimensional FFT. P is a circular pupil, G adds
          Gaussian smoothing linked to wavelength and NA, and B is the optional
          numerical focus filter. Intensities keep their absolute scale: a fully
          open field is approximately 1, and patterns are not rescaled to their
          own peak.
        </p>
        <PupilDiagram />
        <p>
          For an N × N grid spanning L nanometers, the sample pitch is p = L/N
          nm per pixel. The FFT coordinates u and v use cycles per pixel, with
          radial frequency ρ = √(u² + v²). The implemented pupil is:
        </p>
        <Equation
          number="3"
          label="P is one when rho is at most rho c, zero otherwise; rho c equals clip of NA p over lambda, between 0.003 and 0.49"
          math='<mi>P</mi><mrow><mo stretchy="false">(</mo><mi>ρ</mi><mo stretchy="false">)</mo></mrow><mo>=</mo><msub><mn>𝟙</mn><mrow><mi>ρ</mi><mo>≤</mo><msub><mi>ρ</mi><mi>c</mi></msub></mrow></msub><mo>,</mo><mspace width="1em"/><msub><mi>ρ</mi><mi>c</mi></msub><mo>=</mo><mi mathvariant="normal">clip</mi><mrow><mo>(</mo><mfrac><mrow><mi mathvariant="normal">NA</mi><mo>·</mo><mi>p</mi></mrow><mi>λ</mi></mfrac><mo>,</mo><mn>0.003</mn><mo>,</mo><mn>0.49</mn><mo>)</mo></mrow>'
        />
        <p>
          Here 𝟙 is an indicator: 1 inside the pupil and 0 outside. Shorter
          wavelength λ or larger NA admits more spatial detail before the
          numerical clamps apply. The extra Gaussian factor is:
        </p>
        <Equation
          number="4"
          label="G equals exp of minus two pi squared sigma pixel squared rho squared; sigma pixel equals 0.10 lambda over NA p"
          math='<mi>G</mi><mrow><mo stretchy="false">(</mo><mi>ρ</mi><mo stretchy="false">)</mo></mrow><mo>=</mo><msup><mi>e</mi><mrow><mo>−</mo><mn>2</mn><msup><mi>π</mi><mn>2</mn></msup><msubsup><mi>σ</mi><mi>px</mi><mn>2</mn></msubsup><msup><mi>ρ</mi><mn>2</mn></msup></mrow></msup><mo>,</mo><mspace width="1em"/><msub><mi>σ</mi><mi>px</mi></msub><mo>=</mo><mfrac><mrow><mn>0.10</mn><mi>λ</mi></mrow><mrow><mi mathvariant="normal">NA</mi><mo>·</mo><mi>p</mi></mrow></mfrac>'
        />
        <p>
          This smoothing is an empirical addition to the coherent pupil
          calculation, and the 0.10 coefficient is a model choice.{" "}
          σ<sub>px</sub> is a blur width in pixels. It is not an illumination
          sigma: the engine does not integrate over a source shape, so partial
          coherence is not modeled.
        </p>
      </Section>
      <Section id="focus" title="What the focus control does.">
        <p className="pa-doc-lead">
          The UI’s focus value f ranges from 0 to 1.
        </p>
        <p>
          It controls an attenuation filter rather than a physical defocus
          phase. At f = 0, B = 1 and this extra filter is bypassed. For f &gt;
          0, the implementation is:
        </p>
        <Equation
          number="5"
          label="For positive f, B equals exp of minus rho squared over one millionth plus 0.08 s f to the power 1.5"
          math='<msub><mi>B</mi><mi>f</mi></msub><mrow><mo stretchy="false">(</mo><mi>ρ</mi><mo stretchy="false">)</mo></mrow><mo>=</mo><mi mathvariant="normal">exp</mi><mrow><mo>(</mo><mfrac><mrow><mo>−</mo><msup><mi>ρ</mi><mn>2</mn></msup></mrow><mrow><msup><mn>10</mn><mrow><mo>−</mo><mn>6</mn></mrow></msup><mo>+</mo><mn>0.08</mn><mi>s</mi><msup><mi>f</mi><mn>1.5</mn></msup></mrow></mfrac><mo>)</mo></mrow><mo>,</mo><mspace width=".7em"/><mi>f</mi><mo>&gt;</mo><mn>0</mn>'
        />
        <p>
          s is the preset’s blur-sensitivity coefficient: 1.0 for DUV dry and
          1.2 for EUV Low-NA. Increasing f narrows the filter, which blurs the
          image more. This is not a calibrated defocus: it is not expressed in
          nanometers and cannot establish a physical depth of focus.
        </p>
      </Section>
      <Section id="resist" title="A threshold turns light into a boundary.">
        <p className="pa-doc-lead">
          Real photoresist responds through exposure chemistry and development.
          <Wordmark /> currently uses a much simpler threshold approximation: select
          every grid location where intensity reaches τ.
        </p>
        <p>The contour is the interpolated iso-intensity line I = τ.</p>
        <Equation
          number="6"
          label="R sub tau equals one if I is at least tau, and zero otherwise; C sub tau is the set of points where I equals tau"
          math='<msub><mi>R</mi><mi>τ</mi></msub><mo>=</mo><msub><mn>𝟙</mn><mrow><mi>I</mi><mo>≥</mo><mi>τ</mi></mrow></msub><mo>,</mo><mspace width="1em"/><msub><mi>C</mi><mi>τ</mi></msub><mo>=</mo><mrow><mo stretchy="false">{</mo><mrow><mo stretchy="false">(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo stretchy="false">)</mo></mrow><mo>:</mo><mi>I</mi><mrow><mo stretchy="false">(</mo><mi>x</mi><mo>,</mo><mi>y</mi><mo stretchy="false">)</mo></mrow><mo>=</mo><mi>τ</mi><mo stretchy="false">}</mo></mrow>'
        />
        <ThresholdExplorer />
        <p>
          R<sub>τ</sub> is the binary selected region, not a developed material
          profile. Contours are extracted with subpixel marching squares on the
          intensity field. Raising τ selects less area and usually pulls the
          contour inward.
        </p>
        <p>
          The control named <strong>dose</strong> directly sets τ between 0 and
          1. It is not exposure energy in mJ/cm². In a physical exposure model,
          increasing energy can lower the effective normalized intensity
          threshold; that conversion is not implemented here. There is no Dill
          exposure model, post-exposure bake, dissolution-rate model, or
          resist-thickness calculation.
        </p>
      </Section>
      <Section id="sampling" title="Presets, resolution and sampling.">
        <p className="pa-doc-lead">
          The enabled presets are DUV dry (193 nm, NA 0.93) and EUV Low-NA (13.5
          nm, NA 0.33).
        </p>
        <p>
          Immersion DUV and High-NA EUV are not enabled in this release. When
          comparing DUV and EUV, use patterns scaled to the selected wavelength
          and NA; changing the preset alone does not make two patterns a
          like-for-like comparison.
        </p>
        <p>
          A printability guard suppresses the contour and the CD result when the
          feature size falls below a Rayleigh-style floor:
        </p>
        <Equation
          number="7"
          label="CD guard equals k one times wavelength over numerical aperture"
          math='<msub><mi mathvariant="normal">CD</mi><mi>guard</mi></msub><mo>=</mo><msub><mi>k</mi><mn>1</mn></msub><mfrac><mi>λ</mi><mi mathvariant="normal">NA</mi></mfrac>'
        />
        <p>
          The coefficients are 0.28 for DUV dry (about 58 nm) and 0.30 for EUV
          Low-NA (about 12 nm). They are chosen guardrails, not a calibration,
          and they do not guarantee printability. In custom layouts the guard
          uses the largest local feature size, so thin OPC strips do not
          suppress an otherwise printable pattern.
        </p>
        <p>
          At a 1100 nm field and a 512² grid, p ≈ 2.15 nm. Rasterization,
          contour interpolation, field size and FFT sampling all affect measured
          edges, and the FFT implies periodic boundaries, so keep patterns clear
          of the field edge. CD is a single center-line estimate, not a linewidth
          map. Compare correction runs using the same field, grid and settings.
        </p>
      </Section>
      <Section id="variation" title="Parameter sweeps.">
        <p className="pa-doc-lead">
          A good result at one setting does not tell you how the pattern
          responds when conditions change.
        </p>
        <p>
          A process window is the range of conditions under which a pattern
          meets chosen tolerances. A Focus-Exposure Matrix samples focus and
          exposure together; a Bossung plot shows critical dimension versus
          focus at selected doses. These are broader studies than a single
          nominal correction.
        </p>
        <p>
          <Wordmark /> runs one-parameter sweeps: 5 points on Free and up to 120
          points on Pro. Focus and dose remain normalized model controls, so a
          sweep compares simplified trends; it does not establish a calibrated
          process window. Two-dimensional FEM, calibrated Bossung analysis and
          manufacturing qualification are outside the current release.
        </p>
      </Section>
      <Section id="scope" title="Scope and limits.">
        <p className="pa-doc-lead">
          This engine is useful for visual intuition, controlled comparisons
          within a simplified model, and explaining correction.
        </p>
        <p>
          It is not calibrated to a manufacturing process. It does not implement
          partially coherent Hopkins TCC imaging, source-shape integration,
          vector polarization, EUV mask-stack effects, thin-film standing waves,
          resist chemistry, stochastic defects, or etch.
        </p>
        <p>
          The equations above describe the current implementation. For how
          those results drive mask changes, continue to the{" "}
          <Link href={ROUTES.maskCorrection}>mask correction guide</Link>.
        </p>
        <div className="pa-doc-references">
          <p>Further reading</p>
          <a
            href="https://www.asml.com/en/technology/lithography-principles/rayleigh-criterion"
            target="_blank"
            rel="noreferrer"
          >
            ASML · Wavelength, NA and the Rayleigh criterion
          </a>
          <a
            href="https://www.lithoguru.com/scientist/tutor.html"
            target="_blank"
            rel="noreferrer"
          >
            Chris Mack · Aerial-image formation and photoresist tutorials
          </a>
          <a
            href="https://numpy.org/doc/stable/reference/routines.fft.html"
            target="_blank"
            rel="noreferrer"
          >
            NumPy · Discrete Fourier transform conventions
          </a>
          <span>
            These references explain the underlying concepts. They are not
            claims that <Wordmark /> implements every model they describe.
          </span>
        </div>
      </Section>
    </TechnicalArticleA>
  );
}
