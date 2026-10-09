import type { LorenzSettings } from "./settings";

/**
 * A small deterministic pseudo-random number generator.
 *
 * mulberry32 is used here for reproducible, seed-based configuration
 * generation. It is not intended for cryptographic purposes.
 */
export function mulberry32(seed: number): () => number {
  let value = seed >>> 0;

  return (): number => {
    value += 0x6d2b79f5;

    let result = value;

    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);

    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Return a random floating-point value in the inclusive/exclusive range
 * [minimum, maximum).
 */
export function randomInRange(
  rng: () => number,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) {
    throw new RangeError("Random range bounds must be finite.");
  }

  if (maximum < minimum) {
    throw new RangeError("Random range maximum must not be below minimum.");
  }

  return minimum + rng() * (maximum - minimum);
}

/**
 * Return a random integer in the inclusive range [minimum, maximum].
 */
export function randomInt(
  rng: () => number,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isInteger(minimum) || !Number.isInteger(maximum)) {
    throw new RangeError("Random integer bounds must be integers.");
  }

  if (maximum < minimum) {
    throw new RangeError("Random integer maximum must not be below minimum.");
  }

  return Math.floor(randomInRange(rng, minimum, maximum + 1));
}

/**
 * Create a deterministic Lorenz configuration from a seed.
 *
 * The ranges are intentionally curated for the screensaver rather than
 * exposing arbitrary values from the full Lorenz parameter space.
 */
export function createRandomConfig(seed: number): LorenzSettings {
  if (!Number.isFinite(seed)) {
    throw new RangeError("Lorenz randomisation seed must be finite.");
  }

  const rng = mulberry32(seed);

  return {
    sigma: randomInRange(rng, 8, 14),
    rho: randomInRange(rng, 24, 32),
    beta: randomInRange(rng, 2.2, 3.2),

    initialX: randomInRange(rng, -2, 2),
    initialY: randomInRange(rng, -2, 2),
    initialZ: randomInRange(rng, 18, 30),

    startingHue: randomInt(rng, 0, 359),
  };
}
