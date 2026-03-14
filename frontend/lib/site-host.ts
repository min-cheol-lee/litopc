function normalizeRequestHost(value: string | null): string {
  return (value ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase();
}

export function getSiteHostInfo() {
  // Static export (GitHub Pages): host is always litopc.com.
  // Do NOT import next/headers at the module level — Next.js statically marks
  // any module importing it as server-only, which breaks output:export.
  if (process.env.GITHUB_PAGES === "true") {
    return {
      requestHost: "litopc.com",
      isAppHost: false,
      isMarketingHost: true,
      simulatorHref: "https://app.litopc.com",
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { headers } = require("next/headers") as typeof import("next/headers");
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
