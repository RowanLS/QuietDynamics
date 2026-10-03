/**
 * URL serialisation for screensaver configuration.
 *
 * The seed defines the generated configuration. User-adjustable values
 * that differ from that generated configuration are stored explicitly
 * as query parameters.
 */

import { createRandomConfig } from "../simulations/doublePendulum/randomise";

import type { ControlSettings, PaletteName } from "../types/settings";

const MAX_UINT32 = 0xffffffff;

/**
 * Parameters that are meaningful as persistent configuration.
 *
 * Transient state such as `paused` is deliberately excluded.
 */
const CONFIG_KEYS = [
  "background",
  "palette",
  "trailLifetime",
  "glow",
  "rainbowSpeed",
  "simulationSpeed",
  "m1",
  "m2",
  "l1",
  "l2",
  "gravity",
  "initialAngle1",
  "initialAngle2",
] as const;

type ConfigKey = (typeof CONFIG_KEYS)[number];

/**
 * Parse a valid unsigned 32-bit integer.
 */
function parseSeed(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const seed = Number(value);

  if (!Number.isInteger(seed) || seed < 0 || seed > MAX_UINT32) {
    return null;
  }

  return seed;
}

/**
 * Parse a bounded finite number.
 */
function parseNumber(
  value: string | null,
  minimum: number,
  maximum: number,
): number | null {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    return null;
  }

  return parsed;
}

/**
 * Parse a six-digit hexadecimal background colour.
 */
function parseBackground(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    return null;
  }

  return value.toLowerCase();
}

/**
 * Parse a supported palette.
 */
function parsePalette(value: string | null): PaletteName | null {
  switch (value) {
    case "neon-rainbow":
    case "rainbow":
    case "gradient":
    case "solid":
      return value;

    default:
      return null;
  }
}

/**
 * Build the generated base configuration represented by a seed.
 *
 * Seed zero is reserved for the application's default configuration.
 */
function getBaseSettings(
  seed: number,
  defaults: ControlSettings,
): ControlSettings {
  if (seed === 0) {
    return {
      ...defaults,
    };
  }

  return createRandomConfig(seed, defaults);
}

/**
 * Apply valid URL overrides to a base configuration.
 *
 * Invalid parameters are ignored rather than allowing NaN or out-of-range
 * values to enter the simulation.
 */
function applyOverrides(
  base: ControlSettings,
  params: URLSearchParams,
): ControlSettings {
  const result = {
    ...base,
  };

  const background = parseBackground(params.get("background"));

  if (background !== null) {
    result.background = background;
  }

  const palette = parsePalette(params.get("palette"));

  if (palette !== null) {
    result.palette = palette;
  }

  const trailLifetime = parseNumber(params.get("trailLifetime"), 2, 40);

  if (trailLifetime !== null) {
    result.trailLifetime = trailLifetime;
  }

  const glow = parseNumber(params.get("glow"), 0, 200);

  if (glow !== null) {
    result.glow = glow;
  }

  const rainbowSpeed = parseNumber(params.get("rainbowSpeed"), 0, 3);

  if (rainbowSpeed !== null) {
    result.rainbowSpeed = rainbowSpeed;
  }

  const simulationSpeed = parseNumber(params.get("simulationSpeed"), 0.1, 2.5);

  if (simulationSpeed !== null) {
    result.simulationSpeed = simulationSpeed;
  }

  const m1 = parseNumber(params.get("m1"), 0.2, 3);

  if (m1 !== null) {
    result.m1 = m1;
  }

  const m2 = parseNumber(params.get("m2"), 0.2, 3);

  if (m2 !== null) {
    result.m2 = m2;
  }

  const l1 = parseNumber(params.get("l1"), 0.4, 2.2);

  if (l1 !== null) {
    result.l1 = l1;
  }

  const l2 = parseNumber(params.get("l2"), 0.4, 2.2);

  if (l2 !== null) {
    result.l2 = l2;
  }

  const gravity = parseNumber(params.get("gravity"), 1, 20);

  if (gravity !== null) {
    result.gravity = gravity;
  }

  const initialAngle1 = parseNumber(
    params.get("initialAngle1"),
    -Math.PI,
    Math.PI,
  );

  if (initialAngle1 !== null) {
    result.initialAngle1 = initialAngle1;
  }

  const initialAngle2 = parseNumber(
    params.get("initialAngle2"),
    -Math.PI,
    Math.PI,
  );

  if (initialAngle2 !== null) {
    result.initialAngle2 = initialAngle2;
  }

  /*
   * Pause is intentionally not restored from the URL.
   */
  result.paused = false;

  return result;
}

/**
 * Load the application's configuration from the current URL.
 *
 * No seed means "use application defaults", optionally with explicit
 * overrides.
 */
export function loadSettingsFromUrl(
  defaults: ControlSettings,
): ControlSettings {
  const params = new URLSearchParams(window.location.search);

  const parsedSeed = parseSeed(params.get("seed"));

  const seed = parsedSeed ?? 0;

  const base = getBaseSettings(seed, defaults);

  const result = applyOverrides(base, params);

  result.seed = seed;

  return result;
}

/**
 * Serialise the current configuration into the URL.
 *
 * Only values that differ from the generated seed configuration are
 * written as explicit overrides.
 */
export function setSettingsInUrl(
  settings: ControlSettings,
  defaults: ControlSettings,
  mode: "replace" | "push" = "replace",
): void {
  const url = new URL(window.location.href);

  /*
   * Remove existing configuration parameters before rebuilding them.
   */
  url.searchParams.delete("seed");

  for (const key of CONFIG_KEYS) {
    url.searchParams.delete(key);
  }

  /*
   * Seed zero represents the ordinary application defaults.
   */
  if (settings.seed !== 0) {
    url.searchParams.set("seed", String(settings.seed));
  }

  const base = getBaseSettings(settings.seed, defaults);

  /*
   * Only serialize actual overrides.
   */
  const values: Record<ConfigKey, string> = {
    background: settings.background,

    palette: settings.palette,

    trailLifetime: String(settings.trailLifetime),

    glow: String(settings.glow),

    rainbowSpeed: String(settings.rainbowSpeed),

    simulationSpeed: String(settings.simulationSpeed),

    m1: String(settings.m1),

    m2: String(settings.m2),

    l1: String(settings.l1),

    l2: String(settings.l2),

    gravity: String(settings.gravity),

    initialAngle1: String(settings.initialAngle1),

    initialAngle2: String(settings.initialAngle2),
  };

  /*
   * Compare each current value against the configuration generated by
   * the seed. Different values become explicit URL overrides.
   */
  if (settings.background !== base.background) {
    url.searchParams.set("background", values.background);
  }

  if (settings.palette !== base.palette) {
    url.searchParams.set("palette", values.palette);
  }

  if (settings.trailLifetime !== base.trailLifetime) {
    url.searchParams.set("trailLifetime", values.trailLifetime);
  }

  if (settings.glow !== base.glow) {
    url.searchParams.set("glow", values.glow);
  }

  if (settings.rainbowSpeed !== base.rainbowSpeed) {
    url.searchParams.set("rainbowSpeed", values.rainbowSpeed);
  }

  if (settings.simulationSpeed !== base.simulationSpeed) {
    url.searchParams.set("simulationSpeed", values.simulationSpeed);
  }

  if (settings.m1 !== base.m1) {
    url.searchParams.set("m1", values.m1);
  }

  if (settings.m2 !== base.m2) {
    url.searchParams.set("m2", values.m2);
  }

  if (settings.l1 !== base.l1) {
    url.searchParams.set("l1", values.l1);
  }

  if (settings.l2 !== base.l2) {
    url.searchParams.set("l2", values.l2);
  }

  if (settings.gravity !== base.gravity) {
    url.searchParams.set("gravity", values.gravity);
  }

  if (settings.initialAngle1 !== base.initialAngle1) {
    url.searchParams.set("initialAngle1", values.initialAngle1);
  }

  if (settings.initialAngle2 !== base.initialAngle2) {
    url.searchParams.set("initialAngle2", values.initialAngle2);
  }

  if (mode === "push") {
    window.history.pushState({}, "", url);
  } else {
    window.history.replaceState({}, "", url);
  }
}

/**
 * Return a shareable URL representing the current configuration.
 */
export function getShareUrl(
  settings: ControlSettings,
  defaults: ControlSettings,
): string {
  const url = new URL(window.location.href);

  url.search = "";

  if (settings.seed !== 0) {
    url.searchParams.set("seed", String(settings.seed));
  }

  const base = getBaseSettings(settings.seed, defaults);

  const setIfDifferent = (
    key: ConfigKey,
    current: string | number,
    generated: string | number,
  ): void => {
    if (current !== generated) {
      url.searchParams.set(key, String(current));
    }
  };

  setIfDifferent("background", settings.background, base.background);

  setIfDifferent("palette", settings.palette, base.palette);

  setIfDifferent("trailLifetime", settings.trailLifetime, base.trailLifetime);

  setIfDifferent("glow", settings.glow, base.glow);

  setIfDifferent("rainbowSpeed", settings.rainbowSpeed, base.rainbowSpeed);

  setIfDifferent(
    "simulationSpeed",
    settings.simulationSpeed,
    base.simulationSpeed,
  );

  setIfDifferent("m1", settings.m1, base.m1);

  setIfDifferent("m2", settings.m2, base.m2);

  setIfDifferent("l1", settings.l1, base.l1);

  setIfDifferent("l2", settings.l2, base.l2);

  setIfDifferent("gravity", settings.gravity, base.gravity);

  setIfDifferent("initialAngle1", settings.initialAngle1, base.initialAngle1);

  setIfDifferent("initialAngle2", settings.initialAngle2, base.initialAngle2);

  return url.toString();
}
