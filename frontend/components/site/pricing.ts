/**
 * Pricing policy adopted 2026-10-23. The simulator enforces the Free and Pro
 * limits below (backend/app/main.py entitlements). Planned, not live:
 * Pro stays in private beta and checkout is not open, so the founding
 * price and the trial start when checkout opens.
 */
export const PRO_FOUNDING_MONTHLY_USD = 9;
export const PRO_FOUNDING_MONTHS = 3;
export const PRO_FOUNDING_SEATS = 100;
export const PRO_TRIAL_DAYS = 14;
export const FREE_SWEEP_POINTS = 5;
export const PRO_SWEEP_POINTS = 120;

/** [row label, Free, Pro] */
export const PLAN_ROWS: Array<[string, string, string]> = [
  ["Simulation", "DUV & EUV, OPC mask correction, 3D view", "Everything in Free, ad-free"],
  ["Sweeps", `Parameter sweeps, ${FREE_SWEEP_POINTS} points`, `Up to ${PRO_SWEEP_POINTS} points per sweep`],
  ["Custom masks", "Up to 5 rectangles", "Up to 48 rectangles, mask library"],
  ["Export", "2D PNG & SVG, up to 1800 px", "CSV data, 2D & 3D PNG up to 4200 px"],
  ["Daily use", "80 simulations, 30 exports", "2,000 simulations, 600 exports"],
  ["Saved work", "8 scenarios in your browser", "200 scenarios"],
];
