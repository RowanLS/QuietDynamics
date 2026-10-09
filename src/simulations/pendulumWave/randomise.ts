import type { PendulumWaveSettings } from "./settings";

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;

  return (): number => {
    value += 0x6d2b79f5;

    let result = value;

    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);

    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInRange(
  rng: () => number,
  minimum: number,
  maximum: number,
): number {
  return minimum + rng() * (maximum - minimum);
}

function randomInt(
  rng: () => number,
  minimum: number,
  maximum: number,
): number {
  return Math.floor(randomInRange(rng, minimum, maximum + 1));
}

/**
 * Produce a deterministic, visually curated Pendulum Wave configuration.
 */
export function createRandomConfig(seed: number): PendulumWaveSettings {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError(
      "Pendulum Wave seed must be an unsigned 32-bit integer.",
    );
  }

  const rng = mulberry32(seed);

  return {
    pendulumCount: randomInt(rng, 24, 40),
    baseOscillations: randomInt(rng, 18, 32),
    wavePeriod: randomInRange(rng, 75, 120),
    amplitude: randomInRange(rng, 0.25, 0.5),
    startingHue: randomInt(rng, 0, 359),
  };
}
