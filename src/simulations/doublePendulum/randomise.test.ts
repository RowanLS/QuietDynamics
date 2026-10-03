import { describe, expect, it } from "vitest";

import { createRandomConfig, mulberry32 } from "./randomise";

import type { ControlSettings } from "../../types/settings";

const BASE_SETTINGS: ControlSettings = {
  seed: 1,

  background: "#071018",
  palette: "neon-rainbow",
  startingHue: 200,

  trailLifetime: 18,
  glow: 100,
  rainbowSpeed: 0.8,
  simulationSpeed: 1,

  m1: 1,
  m2: 1.37,
  l1: 1,
  l2: 1,
  gravity: 9.81,

  initialAngle1: 2.6,
  initialAngle2: -0.9,
  initialOmega1: 0,
  initialOmega2: 0,

  paused: false,
};

describe("mulberry32", () => {
  it("produces values in the range [0, 1)", () => {
    const random = mulberry32(12345);

    for (let i = 0; i < 1000; i += 1) {
      const value = random();

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it("is deterministic for the same seed", () => {
    const first = mulberry32(12345);
    const second = mulberry32(12345);

    for (let i = 0; i < 100; i += 1) {
      expect(first()).toBe(second());
    }
  });

  it("produces different sequences for different seeds", () => {
    const first = mulberry32(12345);
    const second = mulberry32(54321);

    const firstValues = Array.from({ length: 20 }, () => first());

    const secondValues = Array.from({ length: 20 }, () => second());

    expect(firstValues).not.toEqual(secondValues);
  });
});

describe("createRandomConfig", () => {
  it("produces identical configurations from the same seed", () => {
    const first = createRandomConfig(12345, BASE_SETTINGS);

    const second = createRandomConfig(12345, BASE_SETTINGS);

    expect(first).toEqual(second);
  });

  it("produces different configurations from different seeds", () => {
    const first = createRandomConfig(12345, BASE_SETTINGS);

    const second = createRandomConfig(54321, BASE_SETTINGS);

    expect(first).not.toEqual(second);
  });

  it("stores the supplied seed in the configuration", () => {
    const seed = 12345;

    const config = createRandomConfig(seed, BASE_SETTINGS);

    expect(config.seed).toBe(seed);
  });

  it("keeps preserved visual settings unchanged", () => {
    const baseSettings: ControlSettings = {
      ...BASE_SETTINGS,

      background: "#123456",
      trailLifetime: 27,
      glow: 157,
      rainbowSpeed: 1.4,
      simulationSpeed: 1.7,
    };

    const config = createRandomConfig(12345, baseSettings);

    expect(config.background).toBe(baseSettings.background);

    expect(config.trailLifetime).toBe(baseSettings.trailLifetime);

    expect(config.glow).toBe(baseSettings.glow);

    expect(config.rainbowSpeed).toBe(baseSettings.rainbowSpeed);

    expect(config.simulationSpeed).toBe(baseSettings.simulationSpeed);
  });

  it("generates physics values inside the curated ranges", () => {
    const seeds = [0, 1, 42, 12345, 0xffffffff];

    for (const seed of seeds) {
      const config = createRandomConfig(seed, BASE_SETTINGS);

      expect(config.m1).toBeGreaterThanOrEqual(0.5);
      expect(config.m1).toBeLessThan(2.0);

      expect(config.m2).toBeGreaterThanOrEqual(0.5);
      expect(config.m2).toBeLessThan(2.0);

      expect(config.l1).toBeGreaterThanOrEqual(0.7);
      expect(config.l1).toBeLessThan(1.3);

      expect(config.l2).toBeGreaterThanOrEqual(0.7);
      expect(config.l2).toBeLessThan(1.3);

      expect(config.gravity).toBeGreaterThanOrEqual(8.5);
      expect(config.gravity).toBeLessThan(11.5);

      expect(config.initialAngle1).toBeGreaterThanOrEqual(-Math.PI);
      expect(config.initialAngle1).toBeLessThan(Math.PI);

      expect(config.initialAngle2).toBeGreaterThanOrEqual(-Math.PI);
      expect(config.initialAngle2).toBeLessThan(Math.PI);

      expect(config.initialOmega1).toBeGreaterThanOrEqual(-0.6);
      expect(config.initialOmega1).toBeLessThan(0.6);

      expect(config.initialOmega2).toBeGreaterThanOrEqual(-0.6);
      expect(config.initialOmega2).toBeLessThan(0.6);

      expect(config.startingHue).toBeGreaterThanOrEqual(0);
      expect(config.startingHue).toBeLessThan(360);
    }
  });

  it("always starts unpaused", () => {
    const config = createRandomConfig(12345, {
      ...BASE_SETTINGS,
      paused: true,
    });

    expect(config.paused).toBe(false);
  });
});
