import { headers } from "next/headers";

function normalizeRequestHost(value: string | null): string {
  return (value ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase();
}

export function getSiteHostInfo() {
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
