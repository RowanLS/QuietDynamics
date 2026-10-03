/**
 * Randomisation utilities for the double pendulum.
 *
 * The ranges here are deliberately curated for aesthetically useful
 * motion rather than attempting to sample the full mathematical space.
 */

import type { ControlSettings } from "../../types/settings";

/**
 * Deterministic pseudo-random number generator.
 *
 * The same seed always produces the same sequence.
 */
export function mulberry32(seed: number): () => number {
  let value = seed >>> 0;

  return () => {
    let t = (value += 0x6d2b79f5);

    t = Math.imul(t ^ (t >>> 15), t | 1);

    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a non-zero unsigned 32-bit seed.
 *
 * Zero is reserved for the application's default configuration.
 */
export function createSeed(): number {
  return 1 + Math.floor(Math.random() * 0xffffffff);
}
/**
 * Generate a floating-point value in [min, max).
 */
function randomInRange(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}

/**
 * Choose one item from a non-empty array.
 */
function randomChoice<T>(random: () => number, values: readonly T[]): T {
  if (values.length === 0) {
    throw new Error("Cannot choose from an empty array.");
  }

  const index = Math.floor(random() * values.length);

  return values[index];
}

/**
 * Generate a complete randomised double-pendulum configuration.
 *
 * `baseSettings` supplies the visual settings we generally want to
 * preserve between randomisations. Physics and initial conditions are
 * regenerated, while palette and starting hue are allowed to change.
 */
export function createRandomConfig(
  seed: number,
  baseSettings: ControlSettings,
): ControlSettings {
  const random = mulberry32(seed);

  const palettes = ["neon-rainbow", "rainbow", "gradient"] as const;

  return {
    /*
     * Preserve the user's existing visual preferences.
     *
     * We deliberately do not randomise trail lifetime, glow, or
     * simulation speed because those describe the user's preferred
     * viewing experience rather than the mathematical configuration.
     */
    seed: seed,

    background: baseSettings.background,

    trailLifetime: baseSettings.trailLifetime,

    glow: baseSettings.glow,

    rainbowSpeed: baseSettings.rainbowSpeed,

    simulationSpeed: baseSettings.simulationSpeed,

    /*
     * Randomise palette and starting hue.
     */
    palette: randomChoice(random, palettes),

    startingHue: randomInRange(random, 0, 360),

    /*
     * A modest range of masses produces different dynamics without
     * making the two bobs visually or numerically extreme.
     */
    m1: randomInRange(random, 0.5, 2.0),

    m2: randomInRange(random, 0.5, 2.0),

    /*
     * Keep arm lengths reasonably similar so the pendulum remains
     * visually balanced.
     */
    l1: randomInRange(random, 0.7, 1.3),

    l2: randomInRange(random, 0.7, 1.3),

    /*
     * Keep gravity close to Earth gravity.
     *
     * The point is to vary the motion slightly, not turn the system
     * into an obviously different physical universe.
     */
    gravity: randomInRange(random, 8.5, 11.5),

    /*
     * Initial angles cover the full circle.
     */
    initialAngle1: randomInRange(random, -Math.PI, Math.PI),

    initialAngle2: randomInRange(random, -Math.PI, Math.PI),

    /*
     * Small initial angular velocities help avoid overly sedate
     * configurations while remaining physically plausible.
     */
    initialOmega1: randomInRange(random, -0.6, 0.6),

    initialOmega2: randomInRange(random, -0.6, 0.6),

    /*
     * A newly-generated configuration should begin unpaused.
     */
    paused: false,
  };
}
