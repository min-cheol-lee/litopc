import type { Metadata } from "next";
import LitopcPage from "./litopc/page";
import { MarketingShell } from "../components/MarketingShell";
import { getSiteHostInfo } from "../lib/site-host";

export const metadata: Metadata = {
  title: "litopc | mask-to-silicon OPC simulator",
  description:
    "Interactive photolithography and OPC simulator for seeing how masks print nanometer-scale patterns on silicon.",
};

const featureRail = [
  {
    title: "Easy to approach",
    body: "Start from representative masks instead of a full process stack or research codebase.",
  },
  {
    title: "Easy to visualize",
    body: "Read mask, aerial image, contour, and silicon-side behavior in one workspace.",
  },
  {
    title: "Easy to test",
    body: "Edit the mask, compare runs, and see what the correction actually changes.",
  },
];

const builtIns = [
  "Representative OPC templates",
  "Manual mask edit",
  "2D mask / aerial / contour view",
  "3D silicon-style view",
  "A/B compare and sweep",
  "Preset optics and source settings",
];

export default function Home() {
  const { isAppHost, simulatorHref } = getSiteHostInfo();

  if (isAppHost) {
    return <LitopcPage />;
  }

  return (
    <MarketingShell>
      <section className="landing-hero landing-hero-stack landing-anchor">
        <div className="landing-hero-copy">
          <h1 className="landing-hero-title">We need OPC to print nanometer-scale patterns correctly on silicon.</h1>
          <p className="landing-lead landing-lead-strong">
            <span className="landing-logo-word">litopc</span> = lithography + OPC.
          </p>
          <p className="landing-body-copy">
            Lithography is to shine light through a mask to print patterns on silicon. OPC means optical proximity correction:
            intentionally changing the mask so the printed semiconductor pattern comes out closer to the target.
          </p>
        </div>
        <div className="landing-hero-shot-wrap">
          <div className="landing-hero-shot" aria-label="litopc simulator screenshot">
            <img
              src="/marketing/hero-shot-dense-ls.png"
              alt="litopc simulator screenshot with dense line-space mask, contour, aerial image, and 3D preview"
            />
          </div>
          <div className="landing-hero-shot-note">Actual output from the litopc simulator.</div>
        </div>
      </section>

      <section id="why-opc" className="landing-opc-section landing-anchor">
        <div className="landing-section-head landing-section-head-tight">
          <div className="landing-eyebrow">Why OPC</div>
          <h2>The silicon print is not the mask.</h2>
          <p>
            A clean L-shape on the mask can miss the target after lithography. OPC changes the mask first so the contour on
            silicon lands closer to the shape you actually want.
          </p>
        </div>
        <div className="landing-compare-grid landing-compare-grid-clean">
          <article className="landing-visual-block landing-visual-block-plain">
            <div className="landing-visual-label">
              <span className="landing-visual-kicker">Without correction</span>
              <h3>Non-OPC</h3>
            </div>
            <img
              className="landing-example-image landing-example-image-non-opc"
              src="/marketing/non-opc.svg?v=20260311d"
              alt="Non-OPC L-shape print example"
            />
          </article>
          <article className="landing-visual-block landing-visual-block-plain">
            <div className="landing-visual-label">
              <span className="landing-visual-kicker">Mask tuned for print</span>
              <h3>OPC</h3>
            </div>
            <img
              className="landing-example-image landing-example-image-opc"
              src="/marketing/opc.svg?v=20260311d"
              alt="OPC corrected L-shape print example"
            />
          </article>
        </div>
      </section>

      <section id="why-litopc" className="landing-why-section landing-anchor">
        <div className="landing-section-head landing-section-head-tight">
          <div className="landing-eyebrow">Why litopc</div>
          <h2>
            Why <span className="landing-logo-word">litopc</span>
          </h2>
          <p>
            <span className="landing-logo-word">litopc</span> is built for educational use. It keeps OPC easy to approach,
            easy to visualize, and easy to test before you move on to heavier tools.
          </p>
        </div>

        <div className="landing-feature-rail">
          {featureRail.map((item, index) => (
            <article key={item.title} className="landing-feature-line">
              <div className="landing-feature-index">0{index + 1}</div>
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="landing-builtins">
          {builtIns.map((item) => (
            <div key={item} className="landing-builtins-item">
              <span className="landing-builtins-index" aria-hidden="true">&bull;</span>
              <span className="landing-builtins-copy">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-cta-strip">
        <div>
          <div className="landing-eyebrow">Start here</div>
          <h2>Open litopc and test an OPC example in seconds.</h2>
        </div>
        <a href={simulatorHref} className="landing-nav-link landing-open-link">
          <span>Open</span>
          <span className="landing-logo-word">litopc</span>
        </a>
      </section>
    </MarketingShell>
  );
}
