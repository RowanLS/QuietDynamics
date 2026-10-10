import type { UrlCodec } from "../../utils/urlState";
import type { ThreeBodySettings } from "./settings";
import { createRandomConfig } from "./randomise";
const FAMILIES = ["figure-eight", "hierarchical", "chaotic"] as const;
export function createThreeBodyUrlCodec(
  defaults: ThreeBodySettings,
): UrlCodec<ThreeBodySettings> {
  return {
    simulation: "three-body",
    defaults,
    createRandomConfig,
    applyOverrides(base, params) {
      const next = { ...base };
      const family = params.get("family");
      if (FAMILIES.some((candidate) => candidate === family))
        next.family = family as ThreeBodySettings["family"];
      for (const [key, min, max] of [
        ["scale", 0.6, 1.5],
        ["velocityFactor", 0.85, 1.15],
        ["startingHue", 0, 359],
      ] as const) {
        const raw = params.get(key);
        if (raw === null || raw.trim() === "") continue;
        const value = Number(raw);
        if (
          Number.isFinite(value) &&
          value >= min &&
          value <= max &&
          (key !== "startingHue" || Number.isInteger(value))
        ) {
          next[key] = value;
        }
      }
      return next;
    },
    serializeOverrides(settings, base, params) {
      for (const key of [
        "family",
        "scale",
        "velocityFactor",
        "startingHue",
      ] as const) {
        if (settings[key] !== base[key]) params.set(key, String(settings[key]));
      }
    },
  };
}
