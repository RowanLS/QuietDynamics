import type { ThreeBodySettings } from "./settings";
import { mulberry32 } from "../doublePendulum/randomise";
import type { Family } from "./physics";
const FAMILIES: readonly Family[] = ["figure-eight", "hierarchical", "chaotic"];
/** Reconstruct the same curated configuration from the same unsigned seed. */
export function createRandomConfig(seed: number): ThreeBodySettings {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError("Seed must be a uint32");
  }
  const random = mulberry32(seed);
  return {
    family: FAMILIES[Math.floor(random() * FAMILIES.length)],
    scale: +(0.8 + 0.4 * random()).toFixed(3),
    velocityFactor: +(0.97 + 0.06 * random()).toFixed(3),
    startingHue: Math.floor(360 * random()),
  };
}
