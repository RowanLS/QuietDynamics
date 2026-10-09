import { describe, expect, it } from "vitest";

import { getPendulumAngle, validatePendulumWaveParameters } from "./physics";

describe("Pendulum Wave physics", () => {
  describe("getPendulumAngle", () => {
    it("starts every pendulum vertically aligned", () => {
      for (let index = 0; index < 20; index += 1) {
        expect(getPendulumAngle(index, 0, 50, 60, 0.5)).toBeCloseTo(0, 12);
      }
    });

    it("returns to the initial alignment after one wave period", () => {
      const wavePeriod = 60;
      const amplitude = 0.5;

      for (let index = 0; index < 20; index += 1) {
        expect(
          getPendulumAngle(index, wavePeriod, 50, wavePeriod, amplitude),
        ).toBeCloseTo(0, 10);
      }
    });

    it("gives adjacent pendulums different frequencies", () => {
      const first = getPendulumAngle(0, 1, 50, 60, 0.5);
      const second = getPendulumAngle(1, 1, 50, 60, 0.5);

      expect(first).not.toBeCloseTo(second, 12);
    });

    it("is deterministic", () => {
      const first = getPendulumAngle(7, 12.345, 50, 60, 0.6);
      const second = getPendulumAngle(7, 12.345, 50, 60, 0.6);

      expect(first).toBe(second);
    });

    it("rejects a negative index", () => {
      expect(() => {
        getPendulumAngle(-1, 0, 50, 60, 0.5);
      }).toThrow(RangeError);
    });

    it("rejects negative elapsed time", () => {
      expect(() => {
        getPendulumAngle(0, -1, 50, 60, 0.5);
      }).toThrow(RangeError);
    });
  });

  describe("validatePendulumWaveParameters", () => {
    it("accepts a valid configuration", () => {
      expect(() => {
        validatePendulumWaveParameters(20, 50, 60, 0.5);
      }).not.toThrow();
    });

    it("rejects fewer than two pendulums", () => {
      expect(() => {
        validatePendulumWaveParameters(1, 50, 60, 0.5);
      }).toThrow(RangeError);
    });

    it("rejects a non-integer pendulum count", () => {
      expect(() => {
        validatePendulumWaveParameters(20.5, 50, 60, 0.5);
      }).toThrow(RangeError);
    });

    it("rejects a non-positive wave period", () => {
      expect(() => {
        validatePendulumWaveParameters(20, 50, 0, 0.5);
      }).toThrow(RangeError);
    });

    it("rejects an invalid amplitude", () => {
      expect(() => {
        validatePendulumWaveParameters(20, 50, 60, Math.PI / 2);
      }).toThrow(RangeError);
    });
  });
});
