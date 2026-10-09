import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createRandomConfig as createDoublePendulumRandomConfig } from "../simulations/doublePendulum/randomise";
import { createDoublePendulumUrlCodec } from "../simulations/doublePendulum/url";
import { createRandomConfig as createLorenzRandomConfig } from "../simulations/lorenz/randomise";
import type { LorenzSettings } from "../simulations/lorenz/settings";
import { createLorenzUrlCodec } from "../simulations/lorenz/url";
import { createRandomConfig as createPendulumWaveRandomConfig } from "../simulations/pendulumWave/randomise";
import type { PendulumWaveSettings } from "../simulations/pendulumWave/settings";
import { createPendulumWaveUrlCodec } from "../simulations/pendulumWave/url";

import type { ControlSettings } from "../types/settings";
import {
  getSimulationShareUrl,
  loadSimulationFromUrl,
  setSimulationInUrl,
  type SharedUrlDefaults,
  type SimulationUrlState,
} from "./urlState";

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

const DEFAULT_LORENZ_SETTINGS: LorenzSettings = {
  sigma: 10,
  rho: 28,
  beta: 8 / 3,
  initialX: 0.1,
  initialY: 0,
  initialZ: 0,
  startingHue: 200,
};

const lorenzCodec = createLorenzUrlCodec(
  createLorenzRandomConfig,
  DEFAULT_LORENZ_SETTINGS,
);

function createLorenzState(
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
const DEFAULT_PENDULUM_WAVE_SETTINGS: PendulumWaveSettings = {
  pendulumCount: 30,
  baseOscillations: 24,
  wavePeriod: 90,
  amplitude: 0.35,
  startingHue: 200,
};

const pendulumWaveCodec = createPendulumWaveUrlCodec(
  createPendulumWaveRandomConfig,
  DEFAULT_PENDULUM_WAVE_SETTINGS,
);

function createPendulumWaveState(
  overrides: Partial<SimulationUrlState<PendulumWaveSettings>> = {},
): SimulationUrlState<PendulumWaveSettings> {
  return {
    simulation: "pendulum-wave",
    seed: 0,
    settings: {
      ...DEFAULT_PENDULUM_WAVE_SETTINGS,
    },
    shared: {
      ...DEFAULT_VISUAL_SETTINGS,
      ...DEFAULT_PLAYBACK_SETTINGS,
    },
    ...overrides,
  };
}

function expectPendulumWaveSettingsEqual(
  actual: PendulumWaveSettings,
  expected: PendulumWaveSettings,
): void {
  expect(actual.pendulumCount).toBe(expected.pendulumCount);
  expect(actual.baseOscillations).toBe(expected.baseOscillations);
  expect(actual.wavePeriod).toBeCloseTo(expected.wavePeriod, 12);
  expect(actual.amplitude).toBeCloseTo(expected.amplitude, 12);
  expect(actual.startingHue).toBeCloseTo(expected.startingHue, 12);
}

function setUrl(pathname: string, search = ""): void {
  const suffix = search === "" ? "" : `?${search}`;

  window.history.replaceState({}, "", `${pathname}${suffix}`);
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
    setUrl("/lorenz");
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

    it("uses the codec to identify the simulation", () => {
      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.simulation).toBe("lorenz");
    });

    it("ignores a legacy simulation query parameter", () => {
      setUrl("/lorenz", "simulation=double-pendulum&seed=12345");

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.simulation).toBe("lorenz");
      expect(result.seed).toBe(12345);
    });

    it("uses a deterministic seed to reconstruct Lorenz settings", () => {
      setUrl("/lorenz", "seed=12345");

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      const expected = createLorenzRandomConfig(12345);

      expect(result.seed).toBe(12345);
      expectLorenzSettingsEqual(result.settings, expected);
    });

    it("applies explicit Lorenz overrides on top of the seeded configuration", () => {
      setUrl("/lorenz", "seed=12345&sigma=15&rho=30&initialX=2.5");

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      const generated = createLorenzRandomConfig(12345);

      expect(result.settings.sigma).toBe(15);
      expect(result.settings.rho).toBe(30);
      expect(result.settings.initialX).toBe(2.5);

      expect(result.settings.beta).toBeCloseTo(generated.beta, 12);
      expect(result.settings.initialY).toBeCloseTo(generated.initialY, 12);
      expect(result.settings.initialZ).toBeCloseTo(generated.initialZ, 12);
    });

    it("loads shared visual settings from the URL", () => {
      setUrl(
        "/lorenz",
        "background=%23ffffff&palette=rainbow&glow=175&trailLifetime=25",
      );

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.shared.background).toBe("#ffffff");
      expect(result.shared.palette).toBe("rainbow");
      expect(result.shared.glow).toBe(175);
      expect(result.shared.trailLifetime).toBe(25);
    });

    it("loads shared playback settings from the URL", () => {
      setUrl("/lorenz", "simulationSpeed=1.75&rainbowSpeed=2.2");

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.shared.simulationSpeed).toBe(1.75);
      expect(result.shared.rainbowSpeed).toBe(2.2);
    });

    it("does not restore paused state from the URL", () => {
      setUrl("/lorenz", "paused=true");

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.shared.paused).toBe(false);
    });

    it("ignores an invalid seed", () => {
      setUrl("/lorenz", "seed=not-a-seed");

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.seed).toBe(0);
      expectLorenzSettingsEqual(result.settings, DEFAULT_LORENZ_SETTINGS);
    });

    it("ignores an out-of-range seed", () => {
      setUrl("/lorenz", "seed=4294967296");

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.seed).toBe(0);
    });

    it("ignores invalid Lorenz parameter values", () => {
      setUrl("/lorenz", "sigma=-1&rho=abc&beta=100&initialX=999");

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.settings.sigma).toBe(DEFAULT_LORENZ_SETTINGS.sigma);
      expect(result.settings.rho).toBe(DEFAULT_LORENZ_SETTINGS.rho);
      expect(result.settings.beta).toBe(DEFAULT_LORENZ_SETTINGS.beta);
      expect(result.settings.initialX).toBe(DEFAULT_LORENZ_SETTINGS.initialX);
    });

    it("ignores an invalid palette", () => {
      setUrl("/lorenz", "palette=invalid");

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.shared.palette).toBe(DEFAULT_VISUAL_SETTINGS.palette);
    });

    it("ignores an invalid background colour", () => {
      setUrl("/lorenz", "background=red");

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.shared.background).toBe(DEFAULT_VISUAL_SETTINGS.background);
    });

    it("ignores shared settings outside their valid ranges", () => {
      setUrl("/lorenz", "glow=999&trailLifetime=0&simulationSpeed=9");

      const result = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(result.shared.glow).toBe(DEFAULT_VISUAL_SETTINGS.glow);
      expect(result.shared.trailLifetime).toBe(
        DEFAULT_VISUAL_SETTINGS.trailLifetime,
      );
      expect(result.shared.simulationSpeed).toBe(
        DEFAULT_PLAYBACK_SETTINGS.simulationSpeed,
      );
    });
  });

  describe("setSimulationInUrl", () => {
    it("serializes the seed without serializing simulation identity", () => {
      const state = createLorenzState({
        seed: 12345,
        settings: createLorenzRandomConfig(12345),
      });

      setSimulationInUrl(state, lorenzCodec, DEFAULTS);

      const params = new URLSearchParams(window.location.search);

      expect(params.get("simulation")).toBeNull();
      expect(params.get("seed")).toBe("12345");
    });

    it("preserves the Lorenz pathname when replacing URL state", () => {
      const state = createLorenzState({
        seed: 12345,
        settings: createLorenzRandomConfig(12345),
      });

      setSimulationInUrl(state, lorenzCodec, DEFAULTS);

      expect(window.location.pathname).toBe("/lorenz");
      expect(window.location.search).toContain("seed=12345");
      expect(window.location.search).not.toContain("simulation=");
    });

    it("removes a legacy simulation query parameter when serializing", () => {
      setUrl("/lorenz", "simulation=lorenz&foo=bar");

      const state = createLorenzState({
        seed: 12345,
        settings: createLorenzRandomConfig(12345),
      });

      setSimulationInUrl(state, lorenzCodec, DEFAULTS);

      const params = new URLSearchParams(window.location.search);

      expect(window.location.pathname).toBe("/lorenz");
      expect(params.has("simulation")).toBe(false);
      expect(params.has("foo")).toBe(false);
      expect(params.get("seed")).toBe("12345");
    });

    it("omits seed zero", () => {
      const state = createLorenzState({
        seed: 0,
      });

      setSimulationInUrl(state, lorenzCodec, DEFAULTS);

      const params = new URLSearchParams(window.location.search);

      expect(params.has("seed")).toBe(false);
    });

    it("serializes Lorenz values that differ from the seeded configuration", () => {
      const seed = 12345;
      const generated = createLorenzRandomConfig(seed);

      const state = createLorenzState({
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

      const state = createLorenzState({
        seed,
        settings: createLorenzRandomConfig(seed),
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
      const state = createLorenzState({
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
      const state = createLorenzState({
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
      const state = createLorenzState({
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

      const state = createLorenzState({
        seed: 123,
        settings: createLorenzRandomConfig(123),
      });

      setSimulationInUrl(state, lorenzCodec, DEFAULTS);

      expect(window.history.length).toBe(before);
      expect(window.location.pathname).toBe("/lorenz");
    });

    it("pushes a new history entry when requested and preserves the pathname", () => {
      const before = window.history.length;

      const state = createLorenzState({
        seed: 123,
        settings: createLorenzRandomConfig(123),
      });

      setSimulationInUrl(state, lorenzCodec, DEFAULTS, "push");

      expect(window.history.length).toBe(before + 1);
      expect(window.location.pathname).toBe("/lorenz");
      expect(window.location.search).toContain("seed=123");
    });

    it("rejects state for a different simulation", () => {
      const state = createLorenzState({
        simulation: "double-pendulum",
      });

      expect(() => {
        setSimulationInUrl(state, lorenzCodec, DEFAULTS);
      }).toThrow(/does not match URL codec/i);
    });
  });

  describe("getSimulationShareUrl", () => {
    it("generates a URL without changing browser history", () => {
      window.history.replaceState({}, "", "/lorenz?foo=bar");

      const beforeUrl = window.location.href;
      const beforeHistoryLength = window.history.length;

      const state = createLorenzState({
        seed: 12345,
        settings: createLorenzRandomConfig(12345),
      });

      const shareUrl = getSimulationShareUrl(state, lorenzCodec, DEFAULTS);

      expect(shareUrl).toContain("seed=12345");
      expect(shareUrl).not.toContain("foo=bar");

      expect(window.location.href).toBe(beforeUrl);
      expect(window.history.length).toBe(beforeHistoryLength);
    });

    it("preserves the Lorenz pathname in a share URL", () => {
      setUrl("/lorenz");

      const state = createLorenzState({
        seed: 12345,
        settings: createLorenzRandomConfig(12345),
      });

      const url = new URL(getSimulationShareUrl(state, lorenzCodec, DEFAULTS));

      expect(url.pathname).toBe("/lorenz");
      expect(url.searchParams.get("seed")).toBe("12345");
      expect(url.searchParams.get("simulation")).toBeNull();
    });

    it("includes explicit Lorenz overrides", () => {
      const seed = 12345;
      const generated = createLorenzRandomConfig(seed);

      const state = createLorenzState({
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
      const state = createLorenzState({
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

    it("rejects state for a different simulation", () => {
      const state = createLorenzState({
        simulation: "double-pendulum",
      });

      expect(() => {
        getSimulationShareUrl(state, lorenzCodec, DEFAULTS);
      }).toThrow(/does not match URL codec/i);
    });
  });

  describe("round trips", () => {
    it("round-trips a seeded Lorenz configuration", () => {
      const seed = 987654321;
      const generated = createLorenzRandomConfig(seed);

      const state = createLorenzState({
        seed,
        settings: generated,
      });

      setSimulationInUrl(state, lorenzCodec, DEFAULTS);

      const loaded = loadSimulationFromUrl(lorenzCodec, DEFAULTS);

      expect(window.location.pathname).toBe("/lorenz");
      expect(loaded.simulation).toBe("lorenz");
      expect(loaded.seed).toBe(seed);

      expectLorenzSettingsEqual(loaded.settings, generated);
    });

    it("round-trips seeded settings with explicit overrides", () => {
      const seed = 987654321;
      const generated = createLorenzRandomConfig(seed);

      const settings: LorenzSettings = {
        ...generated,
        sigma: 12,
        initialX: 1.5,
        startingHue: 72,
      };

      const state = createLorenzState({
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

      expect(window.location.pathname).toBe("/lorenz");
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

// DOUBLE PENDULUM TESTS

const DEFAULT_DOUBLE_PENDULUM_SETTINGS: ControlSettings = {
  seed: 42,
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

const doublePendulumCodec = createDoublePendulumUrlCodec(
  createDoublePendulumRandomConfig,
  DEFAULT_DOUBLE_PENDULUM_SETTINGS,
);

function createDoublePendulumState(
  overrides: Partial<SimulationUrlState<ControlSettings>> = {},
): SimulationUrlState<ControlSettings> {
  return {
    simulation: "double-pendulum",
    seed: 0,
    settings: {
      ...DEFAULT_DOUBLE_PENDULUM_SETTINGS,
    },
    shared: {
      ...DEFAULT_VISUAL_SETTINGS,
      ...DEFAULT_PLAYBACK_SETTINGS,
    },
    ...overrides,
  };
}

describe("Double Pendulum URL state", () => {
  beforeEach(() => {
    setUrl("/double-pendulum");
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  describe("loadSimulationFromUrl", () => {
    it("loads the default configuration with no URL parameters", () => {
      const result = loadSimulationFromUrl(doublePendulumCodec, DEFAULTS);

      expect(result.simulation).toBe("double-pendulum");
      expect(result.seed).toBe(0);

      expect(result.settings.m1).toBe(DEFAULT_DOUBLE_PENDULUM_SETTINGS.m1);
      expect(result.settings.m2).toBe(DEFAULT_DOUBLE_PENDULUM_SETTINGS.m2);

      expect(result.settings.initialAngle1).toBe(
        DEFAULT_DOUBLE_PENDULUM_SETTINGS.initialAngle1,
      );

      expect(result.settings.initialOmega1).toBe(
        DEFAULT_DOUBLE_PENDULUM_SETTINGS.initialOmega1,
      );
    });

    it("ignores a legacy simulation query parameter", () => {
      setUrl("/double-pendulum", "simulation=lorenz&seed=12345");

      const result = loadSimulationFromUrl(doublePendulumCodec, DEFAULTS);

      expect(result.simulation).toBe("double-pendulum");
      expect(result.seed).toBe(12345);
    });

    it("reconstructs a deterministic configuration from a seed", () => {
      const seed = 12345;

      setUrl("/double-pendulum", `seed=${seed}`);

      const result = loadSimulationFromUrl(doublePendulumCodec, DEFAULTS);

      const expected = createDoublePendulumRandomConfig(
        seed,
        DEFAULT_DOUBLE_PENDULUM_SETTINGS,
      );

      expect(result.seed).toBe(seed);
      expect(result.settings.m1).toBe(expected.m1);
      expect(result.settings.m2).toBe(expected.m2);
      expect(result.settings.l1).toBe(expected.l1);
      expect(result.settings.l2).toBe(expected.l2);
      expect(result.settings.gravity).toBe(expected.gravity);
      expect(result.settings.initialAngle1).toBe(expected.initialAngle1);
      expect(result.settings.initialAngle2).toBe(expected.initialAngle2);
      expect(result.settings.initialOmega1).toBe(expected.initialOmega1);
      expect(result.settings.initialOmega2).toBe(expected.initialOmega2);
      expect(result.settings.startingHue).toBe(expected.startingHue);
    });

    it("applies explicit physical overrides", () => {
      setUrl("/double-pendulum", "m1=1.8&m2=2.1&l1=1.5&l2=0.8&gravity=12");

      const result = loadSimulationFromUrl(doublePendulumCodec, DEFAULTS);

      expect(result.settings.m1).toBe(1.8);
      expect(result.settings.m2).toBe(2.1);
      expect(result.settings.l1).toBe(1.5);
      expect(result.settings.l2).toBe(0.8);
      expect(result.settings.gravity).toBe(12);
    });

    it("applies explicit initial-condition overrides", () => {
      setUrl(
        "/double-pendulum",
        "initialAngle1=1.25" +
          "&initialAngle2=-2" +
          "&initialOmega1=3" +
          "&initialOmega2=-4",
      );

      const result = loadSimulationFromUrl(doublePendulumCodec, DEFAULTS);

      expect(result.settings.initialAngle1).toBe(1.25);
      expect(result.settings.initialAngle2).toBe(-2);
      expect(result.settings.initialOmega1).toBe(3);
      expect(result.settings.initialOmega2).toBe(-4);
    });

    it("applies an explicit starting hue override", () => {
      setUrl("/double-pendulum", "startingHue=275");

      const result = loadSimulationFromUrl(doublePendulumCodec, DEFAULTS);

      expect(result.settings.startingHue).toBe(275);
    });

    it("ignores invalid physical parameter values", () => {
      setUrl("/double-pendulum", "m1=0&m2=99&l1=-1&l2=999&gravity=abc");

      const result = loadSimulationFromUrl(doublePendulumCodec, DEFAULTS);

      expect(result.settings.m1).toBe(DEFAULT_DOUBLE_PENDULUM_SETTINGS.m1);
      expect(result.settings.m2).toBe(DEFAULT_DOUBLE_PENDULUM_SETTINGS.m2);
      expect(result.settings.l1).toBe(DEFAULT_DOUBLE_PENDULUM_SETTINGS.l1);
      expect(result.settings.l2).toBe(DEFAULT_DOUBLE_PENDULUM_SETTINGS.l2);
      expect(result.settings.gravity).toBe(
        DEFAULT_DOUBLE_PENDULUM_SETTINGS.gravity,
      );
    });

    it("ignores invalid initial conditions", () => {
      setUrl(
        "/double-pendulum",
        "initialAngle1=10" +
          "&initialAngle2=-10" +
          "&initialOmega1=999" +
          "&initialOmega2=abc" +
          "&startingHue=360",
      );

      const result = loadSimulationFromUrl(doublePendulumCodec, DEFAULTS);

      expect(result.settings.initialAngle1).toBe(
        DEFAULT_DOUBLE_PENDULUM_SETTINGS.initialAngle1,
      );

      expect(result.settings.initialAngle2).toBe(
        DEFAULT_DOUBLE_PENDULUM_SETTINGS.initialAngle2,
      );

      expect(result.settings.initialOmega1).toBe(
        DEFAULT_DOUBLE_PENDULUM_SETTINGS.initialOmega1,
      );

      expect(result.settings.initialOmega2).toBe(
        DEFAULT_DOUBLE_PENDULUM_SETTINGS.initialOmega2,
      );

      expect(result.settings.startingHue).toBe(
        DEFAULT_DOUBLE_PENDULUM_SETTINGS.startingHue,
      );
    });
  });

  describe("setSimulationInUrl", () => {
    it("serializes physical overrides without serializing simulation identity", () => {
      const state = createDoublePendulumState({
        settings: {
          ...DEFAULT_DOUBLE_PENDULUM_SETTINGS,
          m1: 1.75,
          gravity: 14,
        },
      });

      setSimulationInUrl(state, doublePendulumCodec, DEFAULTS);

      const params = new URLSearchParams(window.location.search);

      expect(window.location.pathname).toBe("/double-pendulum");
      expect(params.get("simulation")).toBeNull();
      expect(params.get("m1")).toBe("1.75");
      expect(params.get("gravity")).toBe("14");
    });

    it("serializes initial-condition overrides", () => {
      const state = createDoublePendulumState({
        settings: {
          ...DEFAULT_DOUBLE_PENDULUM_SETTINGS,
          initialAngle1: 1.2,
          initialAngle2: -1.7,
          initialOmega1: 2.5,
          initialOmega2: -3.5,
          startingHue: 90,
        },
      });

      setSimulationInUrl(state, doublePendulumCodec, DEFAULTS);

      const params = new URLSearchParams(window.location.search);

      expect(params.get("initialAngle1")).toBe("1.2");
      expect(params.get("initialAngle2")).toBe("-1.7");
      expect(params.get("initialOmega1")).toBe("2.5");
      expect(params.get("initialOmega2")).toBe("-3.5");
      expect(params.get("startingHue")).toBe("90");
    });

    it("preserves the Double Pendulum pathname when replacing URL state", () => {
      const seed = 12345;

      const state = createDoublePendulumState({
        seed,
        settings: createDoublePendulumRandomConfig(
          seed,
          DEFAULT_DOUBLE_PENDULUM_SETTINGS,
        ),
      });

      setSimulationInUrl(state, doublePendulumCodec, DEFAULTS);

      expect(window.location.pathname).toBe("/double-pendulum");
      expect(window.location.search).toContain("seed=12345");
      expect(window.location.search).not.toContain("simulation=");
    });

    it("preserves the Double Pendulum pathname when pushing URL state", () => {
      const before = window.history.length;
      const seed = 12345;

      const state = createDoublePendulumState({
        seed,
        settings: createDoublePendulumRandomConfig(
          seed,
          DEFAULT_DOUBLE_PENDULUM_SETTINGS,
        ),
      });

      setSimulationInUrl(state, doublePendulumCodec, DEFAULTS, "push");

      expect(window.history.length).toBe(before + 1);
      expect(window.location.pathname).toBe("/double-pendulum");
      expect(window.location.search).toContain("seed=12345");
    });

    it("rejects state for a different simulation", () => {
      const state = createDoublePendulumState({
        simulation: "lorenz",
      });

      expect(() => {
        setSimulationInUrl(state, doublePendulumCodec, DEFAULTS);
      }).toThrow(/does not match URL codec/i);
    });
  });

  describe("getSimulationShareUrl", () => {
    it("preserves the Double Pendulum pathname in a share URL", () => {
      const seed = 12345;

      const state = createDoublePendulumState({
        seed,
        settings: createDoublePendulumRandomConfig(
          seed,
          DEFAULT_DOUBLE_PENDULUM_SETTINGS,
        ),
      });

      const url = new URL(
        getSimulationShareUrl(state, doublePendulumCodec, DEFAULTS),
      );

      expect(url.pathname).toBe("/double-pendulum");
      expect(url.searchParams.get("seed")).toBe("12345");
      expect(url.searchParams.get("simulation")).toBeNull();
    });
  });

  describe("round trips", () => {
    it("round-trips a seeded Double Pendulum configuration", () => {
      const seed = 987654321;

      const generated = createDoublePendulumRandomConfig(
        seed,
        DEFAULT_DOUBLE_PENDULUM_SETTINGS,
      );

      const state = createDoublePendulumState({
        seed,
        settings: generated,
      });

      setSimulationInUrl(state, doublePendulumCodec, DEFAULTS);

      const loaded = loadSimulationFromUrl(doublePendulumCodec, DEFAULTS);

      expect(window.location.pathname).toBe("/double-pendulum");
      expect(loaded.simulation).toBe("double-pendulum");
      expect(loaded.seed).toBe(seed);

      expect(loaded.settings.m1).toBe(generated.m1);
      expect(loaded.settings.m2).toBe(generated.m2);
      expect(loaded.settings.l1).toBe(generated.l1);
      expect(loaded.settings.l2).toBe(generated.l2);
      expect(loaded.settings.gravity).toBe(generated.gravity);
      expect(loaded.settings.initialAngle1).toBe(generated.initialAngle1);
      expect(loaded.settings.initialAngle2).toBe(generated.initialAngle2);
      expect(loaded.settings.initialOmega1).toBe(generated.initialOmega1);
      expect(loaded.settings.initialOmega2).toBe(generated.initialOmega2);
      expect(loaded.settings.startingHue).toBe(generated.startingHue);
    });
  });
});

describe("Pendulum Wave URL state", () => {
  beforeEach(() => {
    setUrl("/pendulum-wave");
  });

  afterEach(() => {
    window.history.replaceState({}, "", "/");
  });

  describe("loadSimulationFromUrl", () => {
    it("loads the default configuration with no URL parameters", () => {
      const result = loadSimulationFromUrl(pendulumWaveCodec, DEFAULTS);

      expect(result.simulation).toBe("pendulum-wave");
      expect(result.seed).toBe(0);

      expectPendulumWaveSettingsEqual(
        result.settings,
        DEFAULT_PENDULUM_WAVE_SETTINGS,
      );

      expect(result.shared).toEqual({
        ...DEFAULT_VISUAL_SETTINGS,
        ...DEFAULT_PLAYBACK_SETTINGS,
      });
    });

    it("uses the codec to identify the simulation", () => {
      const result = loadSimulationFromUrl(pendulumWaveCodec, DEFAULTS);

      expect(result.simulation).toBe("pendulum-wave");
    });

    it("ignores a legacy simulation query parameter", () => {
      setUrl("/pendulum-wave", "simulation=lorenz&seed=12345");

      const result = loadSimulationFromUrl(pendulumWaveCodec, DEFAULTS);

      expect(result.simulation).toBe("pendulum-wave");
      expect(result.seed).toBe(12345);
    });

    it("reconstructs a deterministic configuration from a seed", () => {
      const seed = 12345;

      setUrl("/pendulum-wave", `seed=${seed}`);

      const result = loadSimulationFromUrl(pendulumWaveCodec, DEFAULTS);

      const expected = createPendulumWaveRandomConfig(seed);

      expect(result.seed).toBe(seed);

      expectPendulumWaveSettingsEqual(result.settings, expected);
    });

    it("applies explicit overrides on top of a seeded configuration", () => {
      const seed = 12345;

      setUrl(
        "/pendulum-wave",
        `seed=${seed}` +
          "&pendulumCount=36" +
          "&baseOscillations=28" +
          "&wavePeriod=105" +
          "&amplitude=0.42" +
          "&startingHue=120",
      );

      const result = loadSimulationFromUrl(pendulumWaveCodec, DEFAULTS);

      expect(result.settings.pendulumCount).toBe(36);
      expect(result.settings.baseOscillations).toBe(28);
      expect(result.settings.wavePeriod).toBe(105);
      expect(result.settings.amplitude).toBeCloseTo(0.42, 12);
      expect(result.settings.startingHue).toBe(120);
    });

    it("preserves seeded values that are not explicitly overridden", () => {
      const seed = 12345;

      setUrl("/pendulum-wave", `seed=${seed}&amplitude=0.42`);

      const generated = createPendulumWaveRandomConfig(seed);

      const result = loadSimulationFromUrl(pendulumWaveCodec, DEFAULTS);

      expect(result.settings.amplitude).toBeCloseTo(0.42, 12);

      expect(result.settings.pendulumCount).toBe(generated.pendulumCount);

      expect(result.settings.baseOscillations).toBe(generated.baseOscillations);

      expect(result.settings.wavePeriod).toBeCloseTo(generated.wavePeriod, 12);

      expect(result.settings.startingHue).toBe(generated.startingHue);
    });

    it("loads shared visual settings", () => {
      setUrl(
        "/pendulum-wave",
        "background=%23ffffff" +
          "&palette=rainbow" +
          "&glow=175" +
          "&trailLifetime=25",
      );

      const result = loadSimulationFromUrl(pendulumWaveCodec, DEFAULTS);

      expect(result.shared.background).toBe("#ffffff");
      expect(result.shared.palette).toBe("rainbow");
      expect(result.shared.glow).toBe(175);
      expect(result.shared.trailLifetime).toBe(25);
    });

    it("loads shared playback settings", () => {
      setUrl("/pendulum-wave", "simulationSpeed=0.75&rainbowSpeed=1.4");

      const result = loadSimulationFromUrl(pendulumWaveCodec, DEFAULTS);

      expect(result.shared.simulationSpeed).toBe(0.75);
      expect(result.shared.rainbowSpeed).toBe(1.4);
    });

    it("does not restore paused state", () => {
      setUrl("/pendulum-wave", "paused=true");

      const result = loadSimulationFromUrl(pendulumWaveCodec, DEFAULTS);

      expect(result.shared.paused).toBe(false);
    });

    it("ignores an invalid seed", () => {
      setUrl("/pendulum-wave", "seed=not-a-seed");

      const result = loadSimulationFromUrl(pendulumWaveCodec, DEFAULTS);

      expect(result.seed).toBe(0);

      expectPendulumWaveSettingsEqual(
        result.settings,
        DEFAULT_PENDULUM_WAVE_SETTINGS,
      );
    });

    it("ignores invalid Pendulum Wave parameter values", () => {
      setUrl(
        "/pendulum-wave",
        "pendulumCount=5" +
          "&baseOscillations=9" +
          "&wavePeriod=10" +
          "&amplitude=2" +
          "&startingHue=360",
      );

      const result = loadSimulationFromUrl(pendulumWaveCodec, DEFAULTS);

      expectPendulumWaveSettingsEqual(
        result.settings,
        DEFAULT_PENDULUM_WAVE_SETTINGS,
      );
    });

    it("ignores non-integer values for integer parameters", () => {
      setUrl("/pendulum-wave", "pendulumCount=20.5&baseOscillations=24.5");

      const result = loadSimulationFromUrl(pendulumWaveCodec, DEFAULTS);

      expect(result.settings.pendulumCount).toBe(
        DEFAULT_PENDULUM_WAVE_SETTINGS.pendulumCount,
      );

      expect(result.settings.baseOscillations).toBe(
        DEFAULT_PENDULUM_WAVE_SETTINGS.baseOscillations,
      );
    });
  });

  describe("setSimulationInUrl", () => {
    it("serializes a seed without serializing simulation identity", () => {
      const seed = 12345;

      const state = createPendulumWaveState({
        seed,
        settings: createPendulumWaveRandomConfig(seed),
      });

      setSimulationInUrl(state, pendulumWaveCodec, DEFAULTS);

      const params = new URLSearchParams(window.location.search);

      expect(window.location.pathname).toBe("/pendulum-wave");

      expect(params.get("seed")).toBe("12345");
      expect(params.get("simulation")).toBeNull();
    });

    it("serializes values that differ from the seeded configuration", () => {
      const seed = 12345;

      const generated = createPendulumWaveRandomConfig(seed);

      const state = createPendulumWaveState({
        seed,
        settings: {
          ...generated,
          pendulumCount: 36,
          amplitude: 0.42,
        },
      });

      setSimulationInUrl(state, pendulumWaveCodec, DEFAULTS);

      const params = new URLSearchParams(window.location.search);

      expect(params.get("seed")).toBe(String(seed));

      expect(params.get("pendulumCount")).toBe("36");
      expect(params.get("amplitude")).toBe("0.42");
    });

    it("omits values that match the seeded configuration", () => {
      const seed = 12345;

      const state = createPendulumWaveState({
        seed,
        settings: createPendulumWaveRandomConfig(seed),
      });

      setSimulationInUrl(state, pendulumWaveCodec, DEFAULTS);

      const params = new URLSearchParams(window.location.search);

      expect(params.has("pendulumCount")).toBe(false);
      expect(params.has("baseOscillations")).toBe(false);
      expect(params.has("wavePeriod")).toBe(false);
      expect(params.has("amplitude")).toBe(false);
      expect(params.has("startingHue")).toBe(false);
    });

    it("serializes explicit overrides from the default configuration", () => {
      const state = createPendulumWaveState({
        settings: {
          ...DEFAULT_PENDULUM_WAVE_SETTINGS,
          pendulumCount: 36,
          baseOscillations: 30,
          wavePeriod: 110,
          amplitude: 0.45,
          startingHue: 90,
        },
      });

      setSimulationInUrl(state, pendulumWaveCodec, DEFAULTS);

      const params = new URLSearchParams(window.location.search);

      expect(params.get("pendulumCount")).toBe("36");
      expect(params.get("baseOscillations")).toBe("30");
      expect(params.get("wavePeriod")).toBe("110");
      expect(params.get("amplitude")).toBe("0.45");
      expect(params.get("startingHue")).toBe("90");
    });

    it("preserves the Pendulum Wave pathname when replacing URL state", () => {
      const seed = 12345;

      const state = createPendulumWaveState({
        seed,
        settings: createPendulumWaveRandomConfig(seed),
      });

      setSimulationInUrl(state, pendulumWaveCodec, DEFAULTS);

      expect(window.location.pathname).toBe("/pendulum-wave");

      expect(window.location.search).toContain("seed=12345");

      expect(window.location.search).not.toContain("simulation=");
    });

    it("preserves the pathname when pushing URL state", () => {
      const before = window.history.length;
      const seed = 12345;

      const state = createPendulumWaveState({
        seed,
        settings: createPendulumWaveRandomConfig(seed),
      });

      setSimulationInUrl(state, pendulumWaveCodec, DEFAULTS, "push");

      expect(window.history.length).toBe(before + 1);

      expect(window.location.pathname).toBe("/pendulum-wave");
    });

    it("rejects state for a different simulation", () => {
      const state = createPendulumWaveState({
        simulation: "lorenz",
      });

      expect(() => {
        setSimulationInUrl(state, pendulumWaveCodec, DEFAULTS);
      }).toThrow(/does not match URL codec/i);
    });
  });

  describe("getSimulationShareUrl", () => {
    it("preserves the Pendulum Wave pathname", () => {
      const seed = 12345;

      const state = createPendulumWaveState({
        seed,
        settings: createPendulumWaveRandomConfig(seed),
      });

      const url = new URL(
        getSimulationShareUrl(state, pendulumWaveCodec, DEFAULTS),
      );

      expect(url.pathname).toBe("/pendulum-wave");
      expect(url.searchParams.get("seed")).toBe("12345");

      expect(url.searchParams.get("simulation")).toBeNull();
    });

    it("includes Pendulum Wave overrides", () => {
      const seed = 12345;

      const generated = createPendulumWaveRandomConfig(seed);

      const state = createPendulumWaveState({
        seed,
        settings: {
          ...generated,
          wavePeriod: 100,
          amplitude: 0.4,
        },
      });

      const url = new URL(
        getSimulationShareUrl(state, pendulumWaveCodec, DEFAULTS),
      );

      expect(url.searchParams.get("wavePeriod")).toBe("100");

      expect(url.searchParams.get("amplitude")).toBe("0.4");
    });

    it("does not modify the current browser URL", () => {
      setUrl("/pendulum-wave", "foo=bar");

      const beforeUrl = window.location.href;
      const beforeHistoryLength = window.history.length;

      const state = createPendulumWaveState({
        seed: 12345,
        settings: createPendulumWaveRandomConfig(12345),
      });

      getSimulationShareUrl(state, pendulumWaveCodec, DEFAULTS);

      expect(window.location.href).toBe(beforeUrl);

      expect(window.history.length).toBe(beforeHistoryLength);
    });

    it("rejects state for a different simulation", () => {
      const state = createPendulumWaveState({
        simulation: "double-pendulum",
      });

      expect(() => {
        getSimulationShareUrl(state, pendulumWaveCodec, DEFAULTS);
      }).toThrow(/does not match URL codec/i);
    });
  });

  describe("round trips", () => {
    it("round-trips a seeded Pendulum Wave configuration", () => {
      const seed = 987654321;

      const generated = createPendulumWaveRandomConfig(seed);

      const state = createPendulumWaveState({
        seed,
        settings: generated,
      });

      setSimulationInUrl(state, pendulumWaveCodec, DEFAULTS);

      const loaded = loadSimulationFromUrl(pendulumWaveCodec, DEFAULTS);

      expect(window.location.pathname).toBe("/pendulum-wave");

      expect(loaded.simulation).toBe("pendulum-wave");

      expect(loaded.seed).toBe(seed);

      expectPendulumWaveSettingsEqual(loaded.settings, generated);
    });

    it("round-trips seeded settings with explicit overrides", () => {
      const seed = 987654321;

      const generated = createPendulumWaveRandomConfig(seed);

      const settings: PendulumWaveSettings = {
        ...generated,
        pendulumCount: 36,
        wavePeriod: 105,
        amplitude: 0.42,
        startingHue: 72,
      };

      const state = createPendulumWaveState({
        seed,
        settings,
        shared: {
          ...DEFAULT_VISUAL_SETTINGS,
          ...DEFAULT_PLAYBACK_SETTINGS,
          glow: 175,
          palette: "rainbow",
          simulationSpeed: 0.75,
        },
      });

      setSimulationInUrl(state, pendulumWaveCodec, DEFAULTS);

      const loaded = loadSimulationFromUrl(pendulumWaveCodec, DEFAULTS);

      expect(loaded.seed).toBe(seed);

      expectPendulumWaveSettingsEqual(loaded.settings, settings);

      expect(loaded.shared.glow).toBe(175);
      expect(loaded.shared.palette).toBe("rainbow");
      expect(loaded.shared.simulationSpeed).toBe(0.75);

      expect(loaded.shared.paused).toBe(false);
    });
  });
});
