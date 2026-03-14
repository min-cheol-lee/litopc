// Stub for @clerk/nextjs server-actions used during static export (GITHUB_PAGES=true).
// Clerk's ClerkProvider imports invalidateCacheAction which has "use server",
// triggering Next.js's "Server Actions not supported with static export" error.
// Replaced via webpack NormalModuleReplacementPlugin in next.config.mjs.

export async function invalidateCacheAction() {}
