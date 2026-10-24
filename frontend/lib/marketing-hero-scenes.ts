import type { HeroScene, HeroSceneMeta, HeroSequence } from "../components/MarketingHero3D";
import lCorner from "./marketing-scenes/l-corner.json";
import lineSpace from "./marketing-scenes/line-space.json";
import lCornerSequence from "./marketing-scenes/l-corner-sequence.json";
import lineSpaceSequence from "./marketing-scenes/line-space-sequence.json";

type SequenceFile = Omit<HeroSequence, "file"> & { intensityFile: string };

function sequence(file: SequenceFile): HeroSequence {
  const { intensityFile, ...rest } = file;
  return { ...rest, file: intensityFile };
}

/** The two approved patterns, with the recorded data behind each still (single state). */
export const heroScenes: HeroScene[] = [
  {
    meta: lCorner as unknown as HeroSceneMeta,
    alt: "Actual litopc 3D render of a corrected L-shaped mask and its aerial-intensity surface",
    tilt: [-40, 32],
  },
  {
    meta: lineSpace as unknown as HeroSceneMeta,
    alt: "Actual litopc render of four parallel mask lines and their aerial-intensity surfaces",
    tilt: [-30, 40],
  },
];

/**
 * Light theme (2026-10-23): the wafer is a slate plate (0x6f7f92) so the pattern and colormap read on a
 * bright pane, and the dashed target is grey (0x8f8f8f) like the 2D figures.
 * The same two patterns as recorded correction sequences: iteration 0 is the
 * uncorrected target mask, iterations 1 to 5 are real OPC steps from the
 * simulator's own correction routine (segment 100 nm, gain 0.5, 7 samples).
 */
export const heroCorrectionScenes: HeroScene[] = [
  {
    // Default view chosen 2026-10-23: the stack seen a little lower and squarer so the mask plate
    // catches the light and the L reads at a glance (composeView of the approved pose with spin 5, tilt -8; then spin -1, tilt +7 fitted to the user's dragged view on 2026-10-23).
    meta: { ...(lCorner as unknown as HeroSceneMeta), azimuthDeg: 115.5, elevationDeg: -39.6, rollDeg: 50.2, zoomScale: 1.62, offsetY: 0.04, waferColor: 0x6f7f92, targetColor: 0x8f8f8f },
    sequence: sequence(lCornerSequence as unknown as SequenceFile),
    image: "/marketing/review/l-corner-before.webp",
    alt: "Actual litopc 3D render of an L-shaped mask over its simulated aerial image, before and after mask correction",
    tilt: [-40, 32],
  },
  {
    meta: { ...(lineSpace as unknown as HeroSceneMeta), zoomScale: 1.4, colormapOpacity: 0.8, waferColor: 0x6f7f92, targetColor: 0x8f8f8f },
    sequence: sequence(lineSpaceSequence as unknown as SequenceFile),
    image: "/marketing/review/line-space-before.webp",
    alt: "Actual litopc 3D render of four mask lines over their simulated aerial image, before and after mask correction",
    tilt: [-30, 40],
  },
];
