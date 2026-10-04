import { describe, expect, it } from "vitest";

import {
  derivatives,
  integrateRK4,
  isFiniteState,
  type LorenzParameters,
  type LorenzState,
} from "./physics";

const STANDARD_PARAMETERS: LorenzParameters = {
  sigma: 10,
  rho: 28,
  beta: 8 / 3,
};

const STANDARD_STATE: LorenzState = {
  x: 1,
  y: 1,
  z: 1,
};

function expectStateToBeFinite(state: LorenzState): void {
  expect(isFiniteState(state)).toBe(true);
  expect(Number.isFinite(state.x)).toBe(true);
  expect(Number.isFinite(state.y)).toBe(true);
  expect(Number.isFinite(state.z)).toBe(true);
}

function expectStatesClose(
  actual: LorenzState,
  expected: LorenzState,
  tolerance = 1e-12,
): void {
  expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(actual.z - expected.z)).toBeLessThanOrEqual(tolerance);
}

describe("Lorenz physics", () => {
  describe("derivatives", () => {
    it("returns the Lorenz equilibrium derivative at the origin", () => {
      const state: LorenzState = {
        x: 0,
        y: 0,
        z: 0,
      };

      expect(derivatives(state, STANDARD_PARAMETERS)).toEqual({
        x: 0,
        y: 0,
        z: 0,
      });
    });

    it("returns the expected derivatives for the standard test state", () => {
      const result = derivatives(STANDARD_STATE, STANDARD_PARAMETERS);

      expect(result.x).toBeCloseTo(0, 12);
      expect(result.y).toBeCloseTo(26, 12);
      expect(result.z).toBeCloseTo(-5 / 3, 12);
    });

    it("satisfies dx/dt = sigma * (y - x)", () => {
      const state: LorenzState = {
        x: 2,
        y: 5,
        z: 7,
      };

      const parameters: LorenzParameters = {
        sigma: 4,
        rho: 12,
        beta: 2,
      };

      const result = derivatives(state, parameters);

      expect(result.x).toBe(parameters.sigma * (state.y - state.x));
    });

    it("satisfies dy/dt = x * (rho - z) - y", () => {
      const state: LorenzState = {
        x: 2,
        y: 5,
        z: 7,
      };

      const parameters: LorenzParameters = {
        sigma: 4,
        rho: 12,
        beta: 2,
      };

      const result = derivatives(state, parameters);

      expect(result.y).toBe(state.x * (parameters.rho - state.z) - state.y);
    });

    it("satisfies dz/dt = x * y - beta * z", () => {
      const state: LorenzState = {
        x: 2,
        y: 5,
        z: 7,
      };

      const parameters: LorenzParameters = {
        sigma: 4,
        rho: 12,
        beta: 2,
      };

      const result = derivatives(state, parameters);

      expect(result.z).toBe(state.x * state.y - parameters.beta * state.z);
    });

    it("does not mutate the input state", () => {
      const state: LorenzState = {
        ...STANDARD_STATE,
      };

      const original = {
        ...state,
      };

      derivatives(state, STANDARD_PARAMETERS);

      expect(state).toEqual(original);
    });
  });

  describe("integrateRK4", () => {
    it("returns an equivalent copy for a zero timestep", () => {
      const result = integrateRK4(STANDARD_STATE, STANDARD_PARAMETERS, 0);

      expect(result).toEqual(STANDARD_STATE);
      expect(result).not.toBe(STANDARD_STATE);
    });

    it("does not mutate the input state", () => {
      const state: LorenzState = {
        ...STANDARD_STATE,
      };

      const original = {
        ...state,
      };

      integrateRK4(state, STANDARD_PARAMETERS, 0.01);

      expect(state).toEqual(original);
    });

    it("produces deterministic results", () => {
      const first = integrateRK4(STANDARD_STATE, STANDARD_PARAMETERS, 0.01);

      const second = integrateRK4(STANDARD_STATE, STANDARD_PARAMETERS, 0.01);

      expect(second).toEqual(first);
    });

    it("produces the expected RK4 result for a standard test step", () => {
      const result = integrateRK4(
        {
          x: 1,
          y: 1,
          z: 1,
        },
        STANDARD_PARAMETERS,
        0.01,
      );

      expectStateToBeFinite(result);

      expectStatesClose(
        result,
        {
          x: 1.0125671911,
          y: 1.2599177996,
          z: 0.9848909717,
        },
        1e-9,
      );
    });

    it("keeps the origin at equilibrium", () => {
      const origin: LorenzState = {
        x: 0,
        y: 0,
        z: 0,
      };

      const result = integrateRK4(origin, STANDARD_PARAMETERS, 0.01);

      expect(result).toEqual(origin);
    });

    it("remains finite over a long deterministic integration", () => {
      let state: LorenzState = {
        x: 1,
        y: 1,
        z: 1,
      };

      for (let i = 0; i < 100_000; i += 1) {
        state = integrateRK4(state, STANDARD_PARAMETERS, 0.001);

        if (!isFiniteState(state)) {
          break;
        }
      }

      expectStateToBeFinite(state);
    });

    it("responds to changes in sigma", () => {
      const baseline = integrateRK4(STANDARD_STATE, STANDARD_PARAMETERS, 0.01);

      const changed = integrateRK4(
        STANDARD_STATE,
        {
          ...STANDARD_PARAMETERS,
          sigma: 20,
        },
        0.01,
      );

      expect(changed).not.toEqual(baseline);
    });

    it("responds to changes in rho", () => {
      const baseline = integrateRK4(STANDARD_STATE, STANDARD_PARAMETERS, 0.01);

      const changed = integrateRK4(
        STANDARD_STATE,
        {
          ...STANDARD_PARAMETERS,
          rho: 35,
        },
        0.01,
      );

      expect(changed).not.toEqual(baseline);
    });

    it("responds to changes in beta", () => {
      const baseline = integrateRK4(STANDARD_STATE, STANDARD_PARAMETERS, 0.01);

      const changed = integrateRK4(
        STANDARD_STATE,
        {
          ...STANDARD_PARAMETERS,
          beta: 3,
        },
        0.01,
      );

      expect(changed).not.toEqual(baseline);
    });
  });

  describe("isFiniteState", () => {
    it("returns true for a finite state", () => {
      expect(isFiniteState(STANDARD_STATE)).toBe(true);
    });

    it.each([
      {
        name: "x",
        state: {
          x: Number.NaN,
          y: 1,
          z: 1,
        },
      },
      {
        name: "y",
        state: {
          x: 1,
          y: Number.NaN,
          z: 1,
        },
      },
      {
        name: "z",
        state: {
          x: 1,
          y: 1,
          z: Number.NaN,
        },
      },
      {
        name: "positive infinity",
        state: {
          x: Number.POSITIVE_INFINITY,
          y: 1,
          z: 1,
        },
      },
      {
        name: "negative infinity",
        state: {
          x: Number.NEGATIVE_INFINITY,
          y: 1,
          z: 1,
        },
      },
    ])("returns false for a non-finite $name component", ({ state }) => {
      expect(isFiniteState(state)).toBe(false);
    });
  });

  describe("input validation", () => {
    it("rejects non-finite state values", () => {
      expect(() =>
        derivatives(
          {
            x: Number.NaN,
            y: 1,
            z: 1,
          },
          STANDARD_PARAMETERS,
        ),
      ).toThrow(RangeError);
    });

    it("rejects non-finite sigma", () => {
      expect(() =>
        derivatives(STANDARD_STATE, {
          ...STANDARD_PARAMETERS,
          sigma: Number.NaN,
        }),
      ).toThrow(RangeError);
    });

    it("rejects non-finite rho", () => {
      expect(() =>
        derivatives(STANDARD_STATE, {
          ...STANDARD_PARAMETERS,
          rho: Number.POSITIVE_INFINITY,
        }),
      ).toThrow(RangeError);
    });

    it("rejects non-finite beta", () => {
      expect(() =>
        derivatives(STANDARD_STATE, {
          ...STANDARD_PARAMETERS,
          beta: Number.NEGATIVE_INFINITY,
        }),
      ).toThrow(RangeError);
    });

    it("rejects non-positive sigma", () => {
      expect(() =>
        derivatives(STANDARD_STATE, {
          ...STANDARD_PARAMETERS,
          sigma: 0,
        }),
      ).toThrow(RangeError);
    });

    it("rejects non-positive rho", () => {
      expect(() =>
        derivatives(STANDARD_STATE, {
          ...STANDARD_PARAMETERS,
          rho: 0,
        }),
      ).toThrow(RangeError);
    });

    it("rejects non-positive beta", () => {
      expect(() =>
        derivatives(STANDARD_STATE, {
          ...STANDARD_PARAMETERS,
          beta: 0,
        }),
      ).toThrow(RangeError);
    });

    it("rejects a negative timestep", () => {
      expect(() =>
        integrateRK4(STANDARD_STATE, STANDARD_PARAMETERS, -0.01),
      ).toThrow(RangeError);
    });

    it("rejects a non-finite timestep", () => {
      expect(() =>
        integrateRK4(STANDARD_STATE, STANDARD_PARAMETERS, Number.NaN),
      ).toThrow(RangeError);
    });
  });
});
