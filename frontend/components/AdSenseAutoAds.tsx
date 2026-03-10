import Script from "next/script";
import { ADSENSE_ACCOUNT_ID } from "../lib/adsense";

export function AdSenseAutoAds() {
  return (
    <Script
      id="adsense-auto-ads"
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ACCOUNT_ID}`}
      crossOrigin="anonymous"
    />
  );
}
