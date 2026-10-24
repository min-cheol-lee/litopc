import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ShellA, Wordmark } from "../components/site/ShellA";
import { Opc, OpcName } from "../components/site/Opc";
import { HeroStageA } from "../components/site/HeroA";
import { ReplayA } from "../components/site/ReplayA";
import { SimulationFigure } from "../components/site/Figures";
import { ChevronIcon, GlobeIcon, LinkedInIcon } from "../components/site/Icons";
import { ROUTES } from "../components/site/routes";
import {
  PLAN_ROWS,
  PRO_FOUNDING_MONTHLY_USD,
  PRO_FOUNDING_MONTHS,
  PRO_FOUNDING_SEATS,
  PRO_TRIAL_DAYS,
} from "../components/site/pricing";
import {
  BETA_CONTACT_URL,
  CREATOR_LINKEDIN_URL,
  CREATOR_WEBSITE_URL,
  PRO_ANNUAL_USD,
  PRO_MONTHLY_USD,
  SIMULATOR_URL,
  SUPPORT_EMAIL,
} from "../lib/marketing";
import { getSiteHostInfo } from "../lib/site-host";
import "./site.css";
import "./site-mono.css";

export const metadata: Metadata = {
  title: "litopc | Lithography & OPC simulator",
  description:
    "Light the mask, see the silicon, correct the difference. litopc simulates semiconductor lithography and optical proximity correction (OPC) in your browser. No EDA license. No installation. Free to start.",
  alternates: { canonical: "/" },
};

const MODEL_GUIDE = ROUTES.modelSimulation;
const CORRECTION_GUIDE = ROUTES.maskCorrection;
const BILLING_POLICY = ROUTES.billingPolicy;
const CLASSES_CONTACT_URL = `mailto:${SUPPORT_EMAIL}?subject=litopc%20Pro%20for%20classes`;

/** app.litopc.com serves the simulator itself at its root; litopc.com serves this page. */
const LitopcPage = dynamic(() => import("./litopc/page"), { ssr: false });

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "litopc",
  applicationCategory: "SimulationApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function Home() {
  const { isAppHost } = getSiteHostInfo();
  if (isAppHost) {
    return <LitopcPage />;
  }
  return (
    <ShellA>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <section className="pa-hero" aria-label="Introduction">
        <div className="pa-container pa-hero-grid">
          <div className="pa-hero-copy">
            <h1>
              Light the mask.
              <br />
              See the silicon.
              <br />
              Correct the difference.
            </h1>
            <p className="pa-hero-lead">
              Lithography prints chip patterns onto silicon with light, and at this scale the print
              blurs. Reshaping the mask to compensate is called <OpcName />, or <Opc />.{" "}
              <Wordmark /> simulates both in your browser.
            </p>
            <div className="pa-hero-actions">
              <a className="pa-button" href={SIMULATOR_URL}>
                Open <Wordmark /> simulator
              </a>
              <a className="pa-button pa-button-outline" href="#access">
                See pricing
              </a>
            </div>
            <p className="pa-hero-sub">Free to start. No sign-up. No EDA license.</p>
          </div>
          <HeroStageA />
        </div>
      </section>

      <section className="pa-section pa-model" aria-label="Model simulation">
        <div className="pa-container pa-centered">
          <div className="pa-section-head" data-reveal>
            <span className="pa-eyebrow">Model simulation</span>
            <h2>Light doesn&rsquo;t copy a mask perfectly.</h2>
            <p>
              A coherent-imaging model for DUV 193 nm and EUV 13.5 nm turns your mask into an aerial
              image, a printed contour and a 3D surface. See where a pattern rounds, narrows or
              shortens before anything is built.
            </p>
          </div>
          <div data-reveal>
            <SimulationFigure />
          </div>
          <Link className="pa-link" href={MODEL_GUIDE} data-reveal>
            How the model works
            <ChevronIcon />
          </Link>
        </div>
      </section>

      <section className="pa-section pa-correct" aria-label="Mask correction">
        <div className="pa-container pa-centered">
          <div className="pa-section-head" data-reveal>
            <span className="pa-eyebrow">Mask correction</span>
            <h2>Keep the design. Let the mask change.</h2>
            <p>
              <OpcName capital />, or <Opc />, moves mask edges segment by segment until the printed
              contour lands on your target. The run below is the same one the 3D view at the top
              plays: five recorded <Opc /> iterations, mean edge placement error from 25.3&nbsp;nm
              to 4.1&nbsp;nm.
            </p>
          </div>
          <div data-reveal>
            <ReplayA />
          </div>
          <Link className="pa-link" href={CORRECTION_GUIDE} data-reveal>
            How OPC works
            <ChevronIcon />
          </Link>
        </div>
      </section>

      <section id="access" className="pa-section pa-access" aria-label="Free and Pro pricing">
        <div className="pa-container pa-centered">
          <div className="pa-section-head" data-reveal>
            <span className="pa-eyebrow">Pricing</span>
            <h2>Start free. Pro when your work grows.</h2>
            <p>
              Planned launch prices in USD. Pro is in private beta; checkout is not open yet.{" "}
              <Link href={BILLING_POLICY}>Access details</Link> · <a href={CLASSES_CONTACT_URL}>Pro for classes</a>
            </p>
          </div>
          <div className="pa-plans" data-reveal>
            <article className="pa-plan">
              <span className="pa-eyebrow">Free</span>
              <p className="pa-plan-price">$0</p>
              <p className="pa-plan-terms">No subscription. No credit card.</p>
              <dl>
                {PLAN_ROWS.map(([label, free]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{free}</dd>
                  </div>
                ))}
              </dl>
              <a className="pa-button pa-button-small" href={SIMULATOR_URL}>
                Start for free
              </a>
            </article>
            <article className="pa-plan pa-plan-pro">
              <span className="pa-eyebrow">Pro · private beta</span>
              <p className="pa-plan-price">
                ${PRO_MONTHLY_USD}
                <small>/ month</small>
              </p>
              <p className="pa-plan-terms">or ${PRO_ANNUAL_USD} per year</p>
              <p className="pa-plan-founding">
                <strong>Founding price</strong> ${PRO_FOUNDING_MONTHLY_USD}/month for your first{" "}
                {PRO_FOUNDING_MONTHS} months, first {PRO_FOUNDING_SEATS} accounts. {PRO_TRIAL_DAYS}-day free trial when
                checkout opens.
              </p>
              <dl>
                {PLAN_ROWS.map(([label, , pro]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{pro}</dd>
                  </div>
                ))}
              </dl>
              <a className="pa-button pa-button-small pa-button-outline" href={BETA_CONTACT_URL}>
                Request Pro access
              </a>
            </article>
          </div>
        </div>
      </section>

      <section className="pa-section pa-close" aria-label="Get started">
        <div className="pa-container pa-close-grid" data-reveal>
          <div className="pa-close-cta">
            <h2>Ready to simulate?</h2>
            <p>Free to use. No sign-up required to start.</p>
            <a className="pa-button" href={SIMULATOR_URL}>
              Open <Wordmark /> simulator
            </a>
          </div>
          <div className="pa-creator">
            <span className="pa-eyebrow">About</span>
            <p>
              Built by{" "}
              <a href={CREATOR_WEBSITE_URL} target="_blank" rel="noreferrer">
                Min-Cheol Lee
              </a>
              , an OPC engineer with a Ph.D. in Physics.
            </p>
            <div className="pa-creator-links">
              <a href={CREATOR_WEBSITE_URL} target="_blank" rel="noreferrer">
                <GlobeIcon />
                mincheollee.com
              </a>
              <a href={CREATOR_LINKEDIN_URL} target="_blank" rel="noreferrer">
                <LinkedInIcon />
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </section>
    </ShellA>
  );
}
