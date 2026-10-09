import { describe, expect, it } from "vitest";

import {
  createRandomConfig,
  mulberry32,
  randomInRange,
  randomInt,
} from "./randomise";
import { createSeed } from "../../utils/seed";
import type { LorenzSettings } from "./settings";

const RANGES = {
  sigma: {
    minimum: 8,
    maximum: 14,
  },
  rho: {
    minimum: 24,
    maximum: 32,
  },
  beta: {
    minimum: 2.2,
    maximum: 3.2,
  },
  initialX: {
    minimum: -2,
    maximum: 2,
  },
  initialY: {
    minimum: -2,
    maximum: 2,
  },
  initialZ: {
    minimum: 18,
    maximum: 30,
  },
  startingHue: {
    minimum: 0,
    maximum: 359,
  },
} as const;

function expectInRange(value: number, minimum: number, maximum: number): void {
  expect(value).toBeGreaterThanOrEqual(minimum);
  expect(value).toBeLessThanOrEqual(maximum);
}

function expectValidConfig(config: LorenzSettings): void {
  expect(Number.isFinite(config.sigma)).toBe(true);
  expect(Number.isFinite(config.rho)).toBe(true);
  expect(Number.isFinite(config.beta)).toBe(true);

  expect(Number.isFinite(config.initialX)).toBe(true);
  expect(Number.isFinite(config.initialY)).toBe(true);
  expect(Number.isFinite(config.initialZ)).toBe(true);

  expect(Number.isFinite(config.startingHue)).toBe(true);

  expectInRange(config.sigma, RANGES.sigma.minimum, RANGES.sigma.maximum);

  expectInRange(config.rho, RANGES.rho.minimum, RANGES.rho.maximum);

  expectInRange(config.beta, RANGES.beta.minimum, RANGES.beta.maximum);

  expectInRange(
    config.initialX,
    RANGES.initialX.minimum,
    RANGES.initialX.maximum,
  );

  expectInRange(
    config.initialY,
    RANGES.initialY.minimum,
    RANGES.initialY.maximum,
  );

  expectInRange(
    config.initialZ,
    RANGES.initialZ.minimum,
    RANGES.initialZ.maximum,
  );

  expectInRange(
    config.startingHue,
    RANGES.startingHue.minimum,
    RANGES.startingHue.maximum,
  );
}

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const first = mulberry32(12345);
    const second = mulberry32(12345);

    expect([first(), first(), first(), first()]).toEqual([
      second(),
      second(),
      second(),
      second(),
    ]);
  });

  it("produces values in the expected range", () => {
    const rng = mulberry32(12345);

    for (let i = 0; i < 1000; i += 1) {
      const value = rng();

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("produces different sequences for different seeds", () => {
    const first = mulberry32(12345);
    const second = mulberry32(54321);

    expect(first()).not.toBe(second());
  });
});

describe("randomInRange", () => {
  it("returns values inside the requested range", () => {
    const rng = mulberry32(12345);

    for (let i = 0; i < 1000; i += 1) {
      const value = randomInRange(rng, -5, 10);

      expect(value).toBeGreaterThanOrEqual(-5);
      expect(value).toBeLessThan(10);
    }
  });

  it("returns the bound for an equal range", () => {
    const rng = mulberry32(12345);

    expect(randomInRange(rng, 4, 4)).toBe(4);
  });

  it("rejects non-finite bounds", () => {
    const rng = mulberry32(12345);

    expect(() => randomInRange(rng, Number.NaN, 1)).toThrow(RangeError);
    expect(() => randomInRange(rng, 0, Number.POSITIVE_INFINITY)).toThrow(
      RangeError,
    );
  });

  it("rejects a reversed range", () => {
    const rng = mulberry32(12345);

    expect(() => randomInRange(rng, 10, -5)).toThrow(RangeError);
  });
});

describe("randomInt", () => {
  it("returns integers within the requested inclusive range", () => {
    const rng = mulberry32(12345);

    for (let i = 0; i < 1000; i += 1) {
      const value = randomInt(rng, 2, 7);

      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(2);
      expect(value).toBeLessThanOrEqual(7);
    }
  });

  it("returns the bound for an equal range", () => {
    const rng = mulberry32(12345);

    expect(randomInt(rng, 4, 4)).toBe(4);
  });

  it("rejects non-integer bounds", () => {
    const rng = mulberry32(12345);

    expect(() => randomInt(rng, 1.5, 4)).toThrow(RangeError);
    expect(() => randomInt(rng, 1, 4.5)).toThrow(RangeError);
  });

  it("rejects a reversed range", () => {
    const rng = mulberry32(12345);

    expect(() => randomInt(rng, 10, 5)).toThrow(RangeError);
  });
});

describe("createRandomConfig", () => {
  it("is deterministic for a given seed", () => {
    const first = createRandomConfig(12345);
    const second = createRandomConfig(12345);

    expect(second).toEqual(first);
  });

  it("produces different configurations for different seeds", () => {
    const first = createRandomConfig(12345);
    const second = createRandomConfig(54321);

    expect(second).not.toEqual(first);
  });

  it("keeps generated parameters within curated ranges", () => {
    for (const seed of [0, 1, 12345, 987654321, 0xffffffff]) {
      const config = createRandomConfig(seed);

      expectValidConfig(config);
    }
  });

  it("produces configurations suitable for the Lorenz physics", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const config = createRandomConfig(seed);

      expect(config.sigma).toBeGreaterThan(0);
      expect(config.rho).toBeGreaterThan(0);
      expect(config.beta).toBeGreaterThan(0);
    }
  });

  it("rejects a non-finite seed", () => {
    expect(() => createRandomConfig(Number.NaN)).toThrow(RangeError);
    expect(() => createRandomConfig(Number.POSITIVE_INFINITY)).toThrow(
      RangeError,
    );
  });
});

describe("createSeed", () => {
  it("returns a finite unsigned 32-bit integer", () => {
    const seed = createSeed();

    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xffffffff);
  });
});
