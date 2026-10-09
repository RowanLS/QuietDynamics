import type { UrlCodec } from "../../utils/urlState";
import type { ControlSettings } from "../../types/settings";

/**
 * Parse a finite number within an inclusive range.
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
 * Create a URL codec for Double Pendulum configuration.
 *
 * The existing ControlSettings type contains both Double-Pendulum-specific
 * settings and shared application settings. This codec only serializes the
 * Double-Pendulum-specific fields; shared settings are handled by the generic
 * URL machinery.
 */
export function createDoublePendulumUrlCodec(
  createRandomConfig: (seed: number, base: ControlSettings) => ControlSettings,
  defaults: ControlSettings,
): UrlCodec<ControlSettings> {
  return {
    simulation: "double-pendulum",

    defaults,

    createRandomConfig: (seed) => createRandomConfig(seed, defaults),

    applyOverrides: (base, params) => {
      const result = {
        ...base,
      };

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

      const initialOmega1 = parseNumber(params.get("initialOmega1"), -20, 20);

      if (initialOmega1 !== null) {
        result.initialOmega1 = initialOmega1;
      }

      const initialOmega2 = parseNumber(params.get("initialOmega2"), -20, 20);

      if (initialOmega2 !== null) {
        result.initialOmega2 = initialOmega2;
      }

      const startingHue = parseNumber(params.get("startingHue"), 0, 359);

      if (startingHue !== null) {
        result.startingHue = startingHue;
      }

      return result;
    },

    serializeOverrides: (settings, base, params) => {
      const setIfDifferent = (
        key: string,
        current: number,
        generated: number,
      ): void => {
        if (current !== generated) {
          params.set(key, String(current));
        }
      };

      setIfDifferent("m1", settings.m1, base.m1);
      setIfDifferent("m2", settings.m2, base.m2);
      setIfDifferent("l1", settings.l1, base.l1);
      setIfDifferent("l2", settings.l2, base.l2);
      setIfDifferent("gravity", settings.gravity, base.gravity);

      setIfDifferent(
        "initialAngle1",
        settings.initialAngle1,
        base.initialAngle1,
      );

      setIfDifferent(
        "initialAngle2",
        settings.initialAngle2,
        base.initialAngle2,
      );

      setIfDifferent(
        "initialOmega1",
        settings.initialOmega1,
        base.initialOmega1,
      );

      setIfDifferent(
        "initialOmega2",
        settings.initialOmega2,
        base.initialOmega2,
      );

      setIfDifferent("startingHue", settings.startingHue, base.startingHue);
    },
  };
}
