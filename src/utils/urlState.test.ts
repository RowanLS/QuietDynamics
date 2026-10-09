import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createLorenzUrlCodec } from "../simulations/lorenz/url";
import { createRandomConfig } from "../simulations/lorenz/randomise";
import type { LorenzSettings } from "../simulations/lorenz/settings";
import {
  getSimulationShareUrl,
  loadSimulationFromUrl,
  setSimulationInUrl,
  type SharedUrlDefaults,
  type SimulationUrlState,
} from "./urlState";

const DEFAULT_LORENZ_SETTINGS: LorenzSettings = {
  sigma: 10,
  rho: 28,
  beta: 8 / 3,
  initialX: 0.1,
  initialY: 0,
  initialZ: 0,
  startingHue: 200,
};

const DEFAULT_VISUAL_SETTINGS = {
  background: "#071018",
  palette: "neon-rainbow" as const,
  trailLifetime: 18,
  glow: 100,
  rainbowSpeed: 0.8,
};

const DEFAULT_PLAYBACK_SETTINGS = {
  simulationSpeed: 1,
  paused: false,
};

const DEFAULTS: SharedUrlDefaults = {
  visual: DEFAULT_VISUAL_SETTINGS,
  playback: DEFAULT_PLAYBACK_SETTINGS,
};

const lorenzCodec = createLorenzUrlCodec(
  createRandomConfig,
  DEFAULT_LORENZ_SETTINGS,
);

function createState(
  overrides: Partial<SimulationUrlState<LorenzSettings>> = {},
): SimulationUrlState<LorenzSettings> {
  return {
    simulation: "lorenz",
    seed: 0,
    settings: {
      ...DEFAULT_LORENZ_SETTINGS,
    },
    shared: {
      ...DEFAULT_VISUAL_SETTINGS,
      ...DEFAULT_PLAYBACK_SETTINGS,
    },
    ...overrides,
  };
}

function setUrlSearch(search: string): void {
  window.history.replaceState({}, "", `/?${search}`);
}

function expectLorenzSettingsEqual(
  actual: LorenzSettings,
  expected: LorenzSettings,
): void {
  expect(actual.sigma).toBeCloseTo(expected.sigma, 12);
  expect(actual.rho).toBeCloseTo(expected.rho, 12);
  expect(actual.beta).toBeCloseTo(expected.beta, 12);

  expect(actual.initialX).toBeCloseTo(expected.initialX, 12);
  expect(actual.initialY).toBeCloseTo(expected.initialY, 12);
  expect(actual.initialZ).toBeCloseTo(expected.initialZ, 12);

  expect(actual.startingHue).toBeCloseTo(expected.startingHue, 12);
}

describe("Lorenz URL state", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  describe("loadSimulationFromUrl", () => {
    it("uses defaults when the URL contains no configuration", () => {
      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.simulation).toBe("lorenz");
      expect(result.seed).toBe(0);

      expectLorenzSettingsEqual(result.settings, DEFAULT_LORENZ_SETTINGS);

      expect(result.shared).toEqual({
        ...DEFAULT_VISUAL_SETTINGS,
        ...DEFAULT_PLAYBACK_SETTINGS,
      });
    });

    it("loads the Lorenz simulation from the URL", () => {
      setUrlSearch("simulation=lorenz");

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.simulation).toBe("lorenz");
    });

    it("uses a deterministic seed to reconstruct Lorenz settings", () => {
      setUrlSearch("simulation=lorenz&seed=12345");

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      const expected = createRandomConfig(12345);

      expect(result.seed).toBe(12345);
      expectLorenzSettingsEqual(result.settings, expected);
    });

    it("applies explicit Lorenz overrides on top of the seeded configuration", () => {
      setUrlSearch("simulation=lorenz&seed=12345&sigma=15&rho=30&initialX=2.5");

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      const generated = createRandomConfig(12345);

      expect(result.settings.sigma).toBe(15);
      expect(result.settings.rho).toBe(30);
      expect(result.settings.initialX).toBe(2.5);

      expect(result.settings.beta).toBeCloseTo(generated.beta, 12);
      expect(result.settings.initialY).toBeCloseTo(generated.initialY, 12);
      expect(result.settings.initialZ).toBeCloseTo(generated.initialZ, 12);
    });

    it("loads shared visual settings from the URL", () => {
      setUrlSearch(
        "simulation=lorenz&background=%23ffffff&palette=rainbow&glow=175&trailLifetime=25",
      );

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.shared.background).toBe("#ffffff");
      expect(result.shared.palette).toBe("rainbow");
      expect(result.shared.glow).toBe(175);
      expect(result.shared.trailLifetime).toBe(25);
    });

    it("loads shared playback settings from the URL", () => {
      setUrlSearch("simulation=lorenz&simulationSpeed=1.75&rainbowSpeed=2.2");

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.shared.simulationSpeed).toBe(1.75);
      expect(result.shared.rainbowSpeed).toBe(2.2);
    });

    it("does not restore paused state from the URL", () => {
      setUrlSearch("simulation=lorenz&paused=true");

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.shared.paused).toBe(false);
    });

    it("ignores an invalid seed", () => {
      setUrlSearch("simulation=lorenz&seed=not-a-seed");

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.seed).toBe(0);

      expectLorenzSettingsEqual(result.settings, DEFAULT_LORENZ_SETTINGS);
    });

    it("ignores an out-of-range seed", () => {
      setUrlSearch("simulation=lorenz&seed=4294967296");

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.seed).toBe(0);
    });

    it("ignores invalid Lorenz parameter values", () => {
      setUrlSearch("simulation=lorenz&sigma=-1&rho=abc&beta=100&initialX=999");

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.settings.sigma).toBe(DEFAULT_LORENZ_SETTINGS.sigma);
      expect(result.settings.rho).toBe(DEFAULT_LORENZ_SETTINGS.rho);
      expect(result.settings.beta).toBe(DEFAULT_LORENZ_SETTINGS.beta);
      expect(result.settings.initialX).toBe(DEFAULT_LORENZ_SETTINGS.initialX);
    });

    it("ignores an invalid palette", () => {
      setUrlSearch("simulation=lorenz&palette=invalid");

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.shared.palette).toBe(DEFAULT_VISUAL_SETTINGS.palette);
    });

    it("ignores an invalid background colour", () => {
      setUrlSearch("simulation=lorenz&background=red");

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.shared.background).toBe(DEFAULT_VISUAL_SETTINGS.background);
    });

    it("ignores shared settings outside their valid ranges", () => {
      setUrlSearch(
        "simulation=lorenz&glow=999&trailLifetime=0&simulationSpeed=9",
      );

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.shared.glow).toBe(DEFAULT_VISUAL_SETTINGS.glow);
      expect(result.shared.trailLifetime).toBe(
        DEFAULT_VISUAL_SETTINGS.trailLifetime,
      );
      expect(result.shared.simulationSpeed).toBe(
        DEFAULT_PLAYBACK_SETTINGS.simulationSpeed,
      );
    });

    it("falls back to the codec simulation for an invalid simulation name", () => {
      setUrlSearch("simulation=unknown");

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.simulation).toBe("lorenz");
    });
  });

  describe("setSimulationInUrl", () => {
    it("serializes the Lorenz simulation and seed", () => {
      const state = createState({
        simulation: "lorenz",
        seed: 12345,
        settings: createRandomConfig(12345),
      });

      setSimulationInUrl(state, lorenzCodec, DEFAULTS);

      const params = new URLSearchParams(window.location.search);

      expect(params.get("simulation")).toBe(null);
      expect(params.get("seed")).toBe("12345");
    });

    it("omits simulation when using the codec's default simulation", () => {
      const state = createState({
        simulation: "lorenz",
      });

      setSimulationInUrl(state, lorenzCodec, DEFAULTS);

      const params = new URLSearchParams(window.location.search);

      expect(params.has("simulation")).toBe(false);
    });

    it("omits seed zero", () => {
      const state = createState({
        seed: 0,
      });

      setSimulationInUrl(state, lorenzCodec, DEFAULTS);

      const params = new URLSearchParams(window.location.search);

      expect(params.has("seed")).toBe(false);
    });

    it("serializes Lorenz values that differ from the seeded configuration", () => {
      const seed = 12345;
      const generated = createRandomConfig(seed);

      const state = createState({
        seed,
        settings: {
          ...generated,
          sigma: 15,
        },
      });

      setSimulationInUrl(state, lorenzCodec, DEFAULTS);

      const params = new URLSearchParams(window.location.search);

      expect(params.get("seed")).toBe(String(seed));
      expect(params.get("sigma")).toBe("15");
    });

    it("omits Lorenz values that match the seeded configuration", () => {
      const seed = 12345;

      const state = createState({
        seed,
        settings: createRandomConfig(seed),
      });

      setSimulationInUrl(state, lorenzCodec, DEFAULTS);

      const params = new URLSearchParams(window.location.search);

      expect(params.has("sigma")).toBe(false);
      expect(params.has("rho")).toBe(false);
      expect(params.has("beta")).toBe(false);
      expect(params.has("initialX")).toBe(false);
      expect(params.has("initialY")).toBe(false);
      expect(params.has("initialZ")).toBe(false);
      expect(params.has("startingHue")).toBe(false);
    });

    it("serializes shared visual overrides", () => {
      const state = createState({
        shared: {
          ...DEFAULT_VISUAL_SETTINGS,
          ...DEFAULT_PLAYBACK_SETTINGS,
          background: "#ffffff",
          glow: 175,
          trailLifetime: 25,
          palette: "rainbow",
        },
      });

      setSimulationInUrl(state, lorenzCodec, DEFAULTS);

      const params = new URLSearchParams(window.location.search);

      expect(params.get("background")).toBe("#ffffff");
      expect(params.get("glow")).toBe("175");
      expect(params.get("trailLifetime")).toBe("25");
      expect(params.get("palette")).toBe("rainbow");
    });

    it("serializes shared playback overrides", () => {
      const state = createState({
        shared: {
          ...DEFAULT_VISUAL_SETTINGS,
          ...DEFAULT_PLAYBACK_SETTINGS,
          simulationSpeed: 1.5,
          rainbowSpeed: 2.1,
        },
      });

      setSimulationInUrl(state, lorenzCodec, DEFAULTS);

      const params = new URLSearchParams(window.location.search);

      expect(params.get("simulationSpeed")).toBe("1.5");
      expect(params.get("rainbowSpeed")).toBe("2.1");
    });

    it("does not serialize paused state", () => {
      const state = createState({
        shared: {
          ...DEFAULT_VISUAL_SETTINGS,
          ...DEFAULT_PLAYBACK_SETTINGS,
          paused: true,
        },
      });

      setSimulationInUrl(state, lorenzCodec, DEFAULTS);

      const params = new URLSearchParams(window.location.search);

      expect(params.has("paused")).toBe(false);
    });

    it("replaces browser history by default", () => {
      const before = window.history.length;

      const state = createState({
        seed: 123,
        settings: createRandomConfig(123),
      });

      setSimulationInUrl(state, lorenzCodec, DEFAULTS);

      expect(window.history.length).toBe(before);
    });

    it("pushes a new history entry when requested", () => {
      const before = window.history.length;

      const state = createState({
        seed: 123,
        settings: createRandomConfig(123),
      });

      setSimulationInUrl(state, lorenzCodec, DEFAULTS, "push");

      expect(window.history.length).toBe(before + 1);
    });
  });

  describe("getSimulationShareUrl", () => {
    it("generates a URL without changing browser history", () => {
      window.history.replaceState({}, "", "/existing?foo=bar");

      const beforeUrl = window.location.href;
      const beforeHistoryLength = window.history.length;

      const state = createState({
        seed: 12345,
        settings: createRandomConfig(12345),
      });

      const shareUrl = getSimulationShareUrl(state, lorenzCodec, DEFAULTS);

      expect(shareUrl).toContain("seed=12345");
      expect(shareUrl).not.toContain("foo=bar");

      expect(window.location.href).toBe(beforeUrl);
      expect(window.history.length).toBe(beforeHistoryLength);
    });

    it("includes explicit Lorenz overrides", () => {
      const seed = 12345;
      const generated = createRandomConfig(seed);

      const state = createState({
        seed,
        settings: {
          ...generated,
          rho: 30,
          initialZ: 25,
        },
      });

      const shareUrl = getSimulationShareUrl(state, lorenzCodec, DEFAULTS);

      const url = new URL(shareUrl);

      expect(url.searchParams.get("seed")).toBe("12345");
      expect(url.searchParams.get("rho")).toBe("30");
      expect(url.searchParams.get("initialZ")).toBe("25");
    });

    it("includes shared visual overrides", () => {
      const state = createState({
        shared: {
          ...DEFAULT_VISUAL_SETTINGS,
          ...DEFAULT_PLAYBACK_SETTINGS,
          background: "#112233",
          glow: 150,
        },
      });

      const shareUrl = getSimulationShareUrl(state, lorenzCodec, DEFAULTS);

      const url = new URL(shareUrl);

      expect(url.searchParams.get("background")).toBe("#112233");
      expect(url.searchParams.get("glow")).toBe("150");
    });
  });

  describe("round trips", () => {
    it("round-trips a seeded Lorenz configuration", () => {
      const seed = 987654321;
      const generated = createRandomConfig(seed);

      const state = createState({
        seed,
        settings: generated,
      });

      setSimulationInUrl(state, lorenzCodec, DEFAULTS);

      const loaded = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(loaded.simulation).toBe("lorenz");
      expect(loaded.seed).toBe(seed);

      expectLorenzSettingsEqual(loaded.settings, generated);
    });

    it("round-trips seeded settings with explicit overrides", () => {
      const seed = 987654321;
      const generated = createRandomConfig(seed);

      const settings: LorenzSettings = {
        ...generated,
        sigma: 12,
        initialX: 1.5,
        startingHue: 72,
      };

      const state = createState({
        seed,
        settings,
        shared: {
          ...DEFAULT_VISUAL_SETTINGS,
          ...DEFAULT_PLAYBACK_SETTINGS,
          glow: 175,
          palette: "rainbow",
          simulationSpeed: 1.5,
        },
      });

      setSimulationInUrl(state, lorenzCodec, DEFAULTS);

      const loaded = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(loaded.seed).toBe(seed);

      expectLorenzSettingsEqual(loaded.settings, settings);

      expect(loaded.shared.background).toBe(DEFAULT_VISUAL_SETTINGS.background);
      expect(loaded.shared.glow).toBe(175);
      expect(loaded.shared.palette).toBe("rainbow");
      expect(loaded.shared.simulationSpeed).toBe(1.5);
      expect(loaded.shared.paused).toBe(false);
    });
  });
});
