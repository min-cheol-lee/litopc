// During static export (GITHUB_PAGES=true), next/headers is replaced with a
// no-op stub via webpack alias in next.config.mjs.  The early-return below
// ensures we still return the correct host info for that build.
import { headers } from "next/headers";

function normalizeRequestHost(value: string | null): string {
  return (value ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase();
}

export function getSiteHostInfo() {
  if (process.env.GITHUB_PAGES === "true") {
    return {
      requestHost: "litopc.com",
      isAppHost: false,
      isMarketingHost: true,
      simulatorHref: "https://app.litopc.com",
    };
  }

  const requestHost = normalizeRequestHost(headers().get("x-forwarded-host") ?? headers().get("host"));
  const isAppHost = requestHost === "app.litopc.com" || requestHost.startsWith("app.litopc.com:");
  const isMarketingHost =
    requestHost === "litopc.com" ||
    requestHost.startsWith("litopc.com:") ||
    requestHost === "www.litopc.com" ||
    requestHost.startsWith("www.litopc.com:");

  return {
    requestHost,
    isAppHost,
    isMarketingHost,
    simulatorHref: isMarketingHost ? "https://app.litopc.com" : "/litopc",
  };
}
