import { beforeEach, describe, expect, it } from "vitest";

import { getShareUrl, loadSettingsFromUrl, setSettingsInUrl } from "./urlState";

import { createRandomConfig } from "../simulations/doublePendulum/randomise";

import type { ControlSettings } from "../types/settings";

const DEFAULT_SETTINGS: ControlSettings = {
  seed: 0,

  background: "#071018",

  palette: "neon-rainbow",

  startingHue: 200,

  trailLifetime: 18,

  glow: 100,

  rainbowSpeed: 0.8,

  simulationSpeed: 1,

  paused: false,

  m1: 1,

  m2: 1.37,

  l1: 1,

  l2: 1,

  gravity: 9.81,

  initialAngle1: 2.6,

  initialAngle2: -0.9,

  initialOmega1: 0,

  initialOmega2: 0,
};

describe("loadSettingsFromUrl", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("returns defaults when the URL has no configuration", () => {
    const result = loadSettingsFromUrl(DEFAULT_SETTINGS);

    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it("loads a deterministic configuration from a seed", () => {
    const seed = 123456;

    window.history.replaceState({}, "", `/?seed=${seed}`);

    const expected = createRandomConfig(seed, DEFAULT_SETTINGS);

    const result = loadSettingsFromUrl(DEFAULT_SETTINGS);

    expect(result).toEqual(expected);
  });

  it("applies explicit overrides on top of the seed", () => {
    const seed = 123456;

    window.history.replaceState(
      {},
      "",
      [
        `/?seed=${seed}`,
        "m1=1.8",
        "gravity=12",
        "glow=175",
        "palette=solid",
      ].join("&"),
    );

    const generated = createRandomConfig(seed, DEFAULT_SETTINGS);

    const result = loadSettingsFromUrl(DEFAULT_SETTINGS);

    expect(result.seed).toBe(seed);

    expect(result.m1).toBe(1.8);

    expect(result.gravity).toBe(12);

    expect(result.glow).toBe(175);

    expect(result.palette).toBe("solid");

    expect(result.l1).toBe(generated.l1);
  });

  it("ignores invalid numeric overrides", () => {
    window.history.replaceState({}, "", "/?m1=banana&gravity=9999&glow=-20");

    const result = loadSettingsFromUrl(DEFAULT_SETTINGS);

    expect(result.m1).toBe(DEFAULT_SETTINGS.m1);

    expect(result.gravity).toBe(DEFAULT_SETTINGS.gravity);

    expect(result.glow).toBe(DEFAULT_SETTINGS.glow);
  });

  it("ignores invalid palette and background values", () => {
    window.history.replaceState(
      {},
      "",
      "/?palette=not-a-palette&background=red",
    );

    const result = loadSettingsFromUrl(DEFAULT_SETTINGS);

    expect(result.palette).toBe(DEFAULT_SETTINGS.palette);

    expect(result.background).toBe(DEFAULT_SETTINGS.background);
  });

  it("never restores paused state from the URL", () => {
    const result = loadSettingsFromUrl({
      ...DEFAULT_SETTINGS,
      paused: true,
    });

    expect(result.paused).toBe(false);
  });
});

describe("setSettingsInUrl", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("serialises explicit overrides", () => {
    const settings = {
      ...DEFAULT_SETTINGS,

      seed: 123456,

      m1: 1.8,

      gravity: 12,

      glow: 175,

      palette: "solid" as const,
    };

    setSettingsInUrl(settings, DEFAULT_SETTINGS);

    const params = new URLSearchParams(window.location.search);

    expect(params.get("seed")).toBe("123456");

    expect(params.get("m1")).toBe("1.8");

    expect(params.get("gravity")).toBe("12");

    expect(params.get("glow")).toBe("175");

    expect(params.get("palette")).toBe("solid");
  });

  it("omits values that match the generated configuration", () => {
    const seed = 123456;

    const settings = createRandomConfig(seed, DEFAULT_SETTINGS);

    setSettingsInUrl(settings, DEFAULT_SETTINGS);

    const params = new URLSearchParams(window.location.search);

    expect(params.get("seed")).toBe(String(seed));

    expect(params.has("m1")).toBe(false);

    expect(params.has("m2")).toBe(false);

    expect(params.has("gravity")).toBe(false);
  });

  it("replaces the current URL by default", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      background: "#123456",
    };

    setSettingsInUrl(settings, DEFAULT_SETTINGS);

    expect(window.location.search).toBe("?background=%23123456");
  });
});

describe("URL round trips", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("reconstructs the same configuration after serialisation", () => {
    const seed = 987654321;

    const generated = createRandomConfig(seed, DEFAULT_SETTINGS);

    const settings: ControlSettings = {
      ...generated,

      m1: 1.73,

      gravity: 10.7,

      glow: 181,

      initialAngle1: 1.234,

      background: "#112233",

      palette: "gradient",

      paused: true,
    };

    setSettingsInUrl(settings, DEFAULT_SETTINGS);

    const restored = loadSettingsFromUrl(DEFAULT_SETTINGS);

    expect(restored.seed).toBe(settings.seed);

    expect(restored.m1).toBe(settings.m1);

    expect(restored.gravity).toBe(settings.gravity);

    expect(restored.glow).toBe(settings.glow);

    expect(restored.initialAngle1).toBe(settings.initialAngle1);

    expect(restored.background).toBe(settings.background);

    expect(restored.palette).toBe(settings.palette);

    expect(restored.paused).toBe(false);
  });

  it("produces a shareable URL without changing the current URL", () => {
    const settings: ControlSettings = {
      ...DEFAULT_SETTINGS,
      seed: 123456,
      m1: 1.8,
    };

    const before = window.location.href;

    const shareUrl = getShareUrl(settings, DEFAULT_SETTINGS);

    expect(shareUrl).toContain("seed=123456");

    expect(shareUrl).toContain("m1=1.8");

    expect(window.location.href).toBe(before);
  });
});
