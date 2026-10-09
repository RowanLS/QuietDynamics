import type { UrlCodec } from "../../utils/urlState";

import type { PendulumWaveSettings } from "./settings";

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

function parseInteger(
  value: string | null,
  minimum: number,
  maximum: number,
): number | null {
  const parsed = parseNumber(value, minimum, maximum);

  if (parsed === null || !Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

export function createPendulumWaveUrlCodec(
  createRandomConfig: (seed: number) => PendulumWaveSettings,
  defaults: PendulumWaveSettings,
): UrlCodec<PendulumWaveSettings> {
  return {
    simulation: "pendulum-wave",
    defaults,
    createRandomConfig,

    applyOverrides: (base, params) => {
      const result = {
        ...base,
      };

      const pendulumCount = parseInteger(params.get("pendulumCount"), 12, 48);

      if (pendulumCount !== null) {
        result.pendulumCount = pendulumCount;
      }

      const baseOscillations = parseInteger(
        params.get("baseOscillations"),
        10,
        100,
      );

      if (baseOscillations !== null) {
        result.baseOscillations = baseOscillations;
      }

      const wavePeriod = parseNumber(params.get("wavePeriod"), 20, 120);

      if (wavePeriod !== null) {
        result.wavePeriod = wavePeriod;
      }

      const amplitude = parseNumber(params.get("amplitude"), 0.1, 1.2);

      if (amplitude !== null) {
        result.amplitude = amplitude;
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

      setIfDifferent(
        "pendulumCount",
        settings.pendulumCount,
        base.pendulumCount,
      );

      setIfDifferent(
        "baseOscillations",
        settings.baseOscillations,
        base.baseOscillations,
      );

      setIfDifferent("wavePeriod", settings.wavePeriod, base.wavePeriod);

      setIfDifferent("amplitude", settings.amplitude, base.amplitude);

      setIfDifferent("startingHue", settings.startingHue, base.startingHue);
    },
  };
}
