"use client";

import Script from "next/script";
import React, { useEffect, useRef, useState } from "react";
import { ADSENSE_ACCOUNT_ID } from "../lib/adsense";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const SIMULATOR_AD_SLOT = (process.env.NEXT_PUBLIC_ADSENSE_SIM_FREE_SLOT ?? "").trim();

export function FreeSimulatorAd() {
  const adRef = useRef<HTMLElement | null>(null);
  const pushedRef = useRef(false);
  const [isAppHost, setIsAppHost] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hostname = window.location.hostname.toLowerCase();
    setIsAppHost(hostname === "app.litopc.com");
  }, []);

  useEffect(() => {
    if (!isAppHost || !SIMULATOR_AD_SLOT || pushedRef.current || !adRef.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedRef.current = true;
    } catch {
      // Ignore repeated push and delayed script-load failures.
    }
  }, [isAppHost]);

  if (!isAppHost || !SIMULATOR_AD_SLOT) {
    return null;
  }

  return (
    <div className="group-card compact simulator-ad-card" aria-label="Sponsored">
      <div className="simulator-ad-label">Sponsored</div>
      <div className="simulator-ad-slot-shell">
        <Script
          id="adsense-simulator-free-slot"
          async
          strategy="afterInteractive"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ACCOUNT_ID}`}
          crossOrigin="anonymous"
        />
        <ins
          ref={(node) => {
            adRef.current = node;
          }}
          className="adsbygoogle simulator-adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={ADSENSE_ACCOUNT_ID}
          data-ad-slot={SIMULATOR_AD_SLOT}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}
