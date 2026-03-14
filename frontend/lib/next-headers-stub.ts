// Stub for next/headers used during static export (GITHUB_PAGES=true).
// Replaced via webpack alias in next.config.mjs so the real next/headers
// (which is server-only and incompatible with output:export) is never bundled.

export function headers() {
  return {
    get: (_key: string) => null,
    getAll: () => [],
    has: (_key: string) => false,
    entries: () => [][Symbol.iterator](),
    keys: () => [][Symbol.iterator](),
    values: () => [][Symbol.iterator](),
    forEach: () => {},
  };
}

export function cookies() {
  return {
    get: (_key: string) => undefined,
    getAll: () => [],
    has: (_key: string) => false,
  };
}
