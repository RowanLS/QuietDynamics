import { describe, expect, it } from "vitest";

import { createRandomConfig } from "./randomise";

describe("Pendulum Wave randomisation", () => {
  it("is deterministic for the same seed", () => {
    expect(createRandomConfig(12345)).toEqual(createRandomConfig(12345));
  });

  it("produces different configurations for different seeds", () => {
    expect(createRandomConfig(12345)).not.toEqual(createRandomConfig(54321));
  });

  it("keeps generated values inside curated ranges", () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const settings = createRandomConfig(seed);

      expect(settings.pendulumCount).toBeGreaterThanOrEqual(24);
      expect(settings.pendulumCount).toBeLessThanOrEqual(40);

      expect(settings.baseOscillations).toBeGreaterThanOrEqual(18);
      expect(settings.baseOscillations).toBeLessThanOrEqual(32);

      expect(settings.wavePeriod).toBeGreaterThanOrEqual(75);
      expect(settings.wavePeriod).toBeLessThan(120);

      expect(settings.amplitude).toBeGreaterThanOrEqual(0.25);
      expect(settings.amplitude).toBeLessThan(0.5);

      expect(settings.startingHue).toBeGreaterThanOrEqual(0);
      expect(settings.startingHue).toBeLessThanOrEqual(359);
    }
  });

  it("rejects an invalid seed", () => {
    expect(() => createRandomConfig(-1)).toThrow(RangeError);
    expect(() => createRandomConfig(0x1_0000_0000)).toThrow(RangeError);
    expect(() => createRandomConfig(1.5)).toThrow(RangeError);
  });
});
