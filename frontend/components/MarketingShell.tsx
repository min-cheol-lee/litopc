import Link from "next/link";
import React from "react";
import { Manrope } from "next/font/google";
import { getSiteHostInfo } from "../lib/site-host";
import { AdSenseAutoAds } from "./AdSenseAutoAds";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

type NavItem = {
  label: React.ReactNode;
  href: string;
};

export function MarketingShell({
  children,
  navItems = [],
}: {
  children: React.ReactNode;
  navItems?: NavItem[];
}) {
  const year = new Date().getFullYear();
  const { simulatorHref, isMarketingHost } = getSiteHostInfo();

  return (
    <div className={`${manrope.className} landing-shell`}>
      {isMarketingHost && <AdSenseAutoAds />}
      <div className="landing-bg-grid" aria-hidden="true" />
      <div className="landing-bg-orb landing-bg-orb-a" aria-hidden="true" />
      <div className="landing-bg-orb landing-bg-orb-b" aria-hidden="true" />
      <header className="landing-topbar">
        <div className="landing-brand-lockup">
          <Link href="/" className="landing-brand" aria-label="litopc home">
            <span className="landing-brand-lit">lit</span>
            <span className="landing-brand-opc">opc</span>
          </Link>
          <div className="landing-brand-tagline">OPC &amp; lithography simulator</div>
        </div>
        {navItems.length > 0 && (
          <nav className="landing-nav" aria-label="Primary">
            {navItems.map((item) => {
              if (item.href === "/litopc") {
                return (
                  <a key={item.href} href={simulatorHref} className="landing-nav-link">
                    {item.label}
                  </a>
                );
              }

              const internal = item.href.startsWith("/");
              return internal ? (
                <Link key={item.href} href={item.href} className="landing-nav-link">
                  {item.label}
                </Link>
              ) : (
                <a key={item.href} href={item.href} className="landing-nav-link">
                  {item.label}
                </a>
              );
            })}
          </nav>
        )}
        <a href={simulatorHref} className="landing-nav-link landing-open-link">
          <span>Open</span>
          <span className="landing-logo-word">litopc</span>
        </a>
      </header>

      <main className="landing-main">{children}</main>

      <footer className="landing-footer">
        <div className="landing-footer-grid">
          <div className="landing-footer-block">
            <div className="landing-footer-title">litopc</div>
            <p className="landing-footer-copy">
              Browser-based OPC education and visual debugging. Built for learning, exploration, and early process discussion.
            </p>
          </div>
          <div className="landing-footer-block">
            <div className="landing-footer-title">Product</div>
            <div className="landing-footer-links">
              <a href={simulatorHref}>Simulator</a>
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
            </div>
          </div>
          <div className="landing-footer-block">
            <div className="landing-footer-title">Policy</div>
            <div className="landing-footer-links">
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/billing-policy">Billing</Link>
            </div>
          </div>
          <div className="landing-footer-block">
            <div className="landing-footer-title">Support</div>
            <div className="landing-footer-links">
              <a href="mailto:mincheol.chris.lee@gmail.com">mincheol.chris.lee@gmail.com</a>
              <a href="https://mincheollee.com" target="_blank" rel="noreferrer">
                mincheollee.com
              </a>
            </div>
          </div>
        </div>
        <div className="landing-footer-meta">
          <span>Educational simulator. Not a sign-off tool.</span>
          <span>{year} litopc</span>
        </div>
      </footer>
    </div>
  );
}
