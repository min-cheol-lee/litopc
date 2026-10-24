/** Public routes of the site. The guides keep their original /litopc/* addresses, which the simulator links to. */
export const ROUTES = {
  home: "/",
  basics: "/basics",
  modelSimulation: "/litopc/model-summary",
  maskCorrection: "/litopc/opc-guide",
  pricing: "/#access",
  about: "/about",
  contact: "/about#contact",
  privacy: "/privacy",
  terms: "/terms",
  billingPolicy: "/billing-policy",
} as const;

export type RouteKey = keyof typeof ROUTES;
