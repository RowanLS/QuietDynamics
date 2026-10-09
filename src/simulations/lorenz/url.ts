import type { UrlCodec } from "../../utils/urlState";
import type { LorenzSettings } from "./settings";

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

export function createLorenzUrlCodec(
  createRandomConfig: (seed: number) => LorenzSettings,
  defaults: LorenzSettings,
): UrlCodec<LorenzSettings> {
  return {
    simulation: "lorenz",

    defaults,

    createRandomConfig,

    applyOverrides: (base, params) => {
      const result = {
        ...base,
      };

      const sigma = parseNumber(params.get("sigma"), 0.1, 20);

      if (sigma !== null) {
        result.sigma = sigma;
      }

      const rho = parseNumber(params.get("rho"), 0.1, 50);

      if (rho !== null) {
        result.rho = rho;
      }

      const beta = parseNumber(params.get("beta"), 0.1, 10);

      if (beta !== null) {
        result.beta = beta;
      }

      const initialX = parseNumber(params.get("initialX"), -30, 30);

      if (initialX !== null) {
        result.initialX = initialX;
      }

      const initialY = parseNumber(params.get("initialY"), -30, 30);

      if (initialY !== null) {
        result.initialY = initialY;
      }

      const initialZ = parseNumber(params.get("initialZ"), 0, 60);

      if (initialZ !== null) {
        result.initialZ = initialZ;
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

      setIfDifferent("sigma", settings.sigma, base.sigma);
      setIfDifferent("rho", settings.rho, base.rho);
      setIfDifferent("beta", settings.beta, base.beta);

      setIfDifferent("initialX", settings.initialX, base.initialX);

      setIfDifferent("initialY", settings.initialY, base.initialY);

      setIfDifferent("initialZ", settings.initialZ, base.initialZ);

      setIfDifferent("startingHue", settings.startingHue, base.startingHue);
    },
  };
}
