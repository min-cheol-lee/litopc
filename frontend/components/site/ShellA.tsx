import Link from "next/link";
import React from "react";
import {
  CREATOR_LINKEDIN_URL,
  CREATOR_WEBSITE_URL,
  SIMULATOR_URL,
  SUPPORT_EMAIL,
} from "../../lib/marketing";
import { RevealA } from "./RevealA";
import { ROUTES } from "./routes";

/** The wordmark as it appears in the brand and inside simulator buttons. */
export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`pa-wordmark ${className}`.trim()}>litopc</span>;
}

export function ShellA({ children }: { children: React.ReactNode }) {
  return (
    <div className="pa-mono">
    <div className="pa">
      <RevealA>
        <a className="pa-skip" href="#pa-main">
          Skip to content
        </a>
        <header className="pa-header">
          <div className="pa-container pa-header-inner">
            <Link className="pa-brand" href={ROUTES.home} aria-label="litopc home">
              <Wordmark className="pa-brand-mark" />
              <span className="pa-brand-sep" aria-hidden="true" />
              <span className="pa-brand-tag">Lithography &amp; OPC simulator</span>
            </Link>
            <nav className="pa-nav" aria-label="Main navigation">
              <Link href={ROUTES.modelSimulation}>Model simulation</Link>
              <Link href={ROUTES.maskCorrection}>Mask correction</Link>
              <Link href={ROUTES.pricing}>Pricing</Link>
              <Link href={ROUTES.about}>About</Link>
            </nav>
            <a className="pa-open" href={SIMULATOR_URL}>
              Open <Wordmark />
            </a>
            <details className="pa-menu">
              <summary aria-label="Navigation menu">
                <span />
                <span />
              </summary>
              <nav aria-label="Mobile navigation">
                <Link href={ROUTES.modelSimulation}>Model simulation</Link>
                <Link href={ROUTES.maskCorrection}>Mask correction</Link>
                <Link href={ROUTES.pricing}>Pricing</Link>
                <Link href={ROUTES.about}>About</Link>
              </nav>
            </details>
          </div>
        </header>
        <main id="pa-main">{children}</main>
        <footer className="pa-footer">
          <div className="pa-container pa-footer-top">
            <div className="pa-footer-brand">
              <Link className="pa-brand" href={ROUTES.home} aria-label="litopc home">
                <Wordmark className="pa-brand-mark" />
              </Link>
              <p>Lithography and OPC simulator for DUV and EUV. No EDA license. No installation.</p>
            </div>
            <nav aria-label="Product">
              <span className="pa-footer-head">Product</span>
              <a href={SIMULATOR_URL}>Simulator</a>
              <Link href={ROUTES.basics}>Plain-language guide</Link>
              <Link href={ROUTES.modelSimulation}>Model simulation</Link>
              <Link href={ROUTES.maskCorrection}>Mask correction</Link>
              <Link href={ROUTES.pricing}>Pricing</Link>
            </nav>
            <nav aria-label="Policies">
              <span className="pa-footer-head">Policy</span>
              <Link href={ROUTES.privacy}>Privacy</Link>
              <Link href={ROUTES.terms}>Terms</Link>
              <Link href={ROUTES.billingPolicy}>Billing</Link>
            </nav>
            <nav aria-label="Support and creator">
              <span className="pa-footer-head">Support</span>
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              <Link href={ROUTES.about}>About</Link>
              <a href={CREATOR_WEBSITE_URL} target="_blank" rel="noreferrer">
                mincheollee.com
              </a>
              <a href={CREATOR_LINKEDIN_URL} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            </nav>
          </div>
          <div className="pa-container pa-footer-bottom">
            <span>© 2026 <Wordmark /></span>
            <span>For learning and exploration. Not manufacturing sign-off.</span>
          </div>
        </footer>
      </RevealA>
    </div>
    </div>
  );
}
