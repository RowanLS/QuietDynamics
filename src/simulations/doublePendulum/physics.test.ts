/**
 * Tests for the pure double-pendulum mathematical model.
 */

import { describe, expect, it } from "vitest";

import { derivatives, integrateRK4, totalEnergy } from "./physics";

import type { DoublePendulumParameters, DoublePendulumState } from "./physics";

const PARAMETERS: DoublePendulumParameters = {
  m1: 1,
  m2: 1.37,
  l1: 1,
  l2: 1,
  gravity: 9.81,
};

const RESTING_STATE: DoublePendulumState = {
  theta1: 0,
  theta2: 0,
  omega1: 0,
  omega2: 0,
};

describe("double pendulum derivatives", () => {
  it("returns zero derivatives for the hanging rest state", () => {
    const result = derivatives(RESTING_STATE, PARAMETERS);

    expect(result.theta1).toBeCloseTo(0, 15);
    expect(result.theta2).toBeCloseTo(0, 15);
    expect(result.omega1).toBeCloseTo(0, 15);
    expect(result.omega2).toBeCloseTo(0, 15);
  });

  it("returns angular velocities as the angle derivatives", () => {
    const state: DoublePendulumState = {
      theta1: 1.2,
      theta2: -0.4,
      omega1: 0.3,
      omega2: -0.7,
    };

    const result = derivatives(state, PARAMETERS);

    expect(result.theta1).toBe(state.omega1);

    expect(result.theta2).toBe(state.omega2);
  });

  it("produces finite derivatives for a normal state", () => {
    const state: DoublePendulumState = {
      theta1: 2.6,
      theta2: -0.9,
      omega1: 0,
      omega2: 0,
    };

    const result = derivatives(state, PARAMETERS);

    expect(Number.isFinite(result.theta1)).toBe(true);

    expect(Number.isFinite(result.theta2)).toBe(true);

    expect(Number.isFinite(result.omega1)).toBe(true);

    expect(Number.isFinite(result.omega2)).toBe(true);
  });
});

describe("integrateRK4", () => {
  it("does not mutate the input state", () => {
    const state: DoublePendulumState = {
      theta1: 2.6,
      theta2: -0.9,
      omega1: 0,
      omega2: 0,
    };

    const original = {
      ...state,
    };

    integrateRK4(state, PARAMETERS, 1 / 120);

    expect(state).toEqual(original);
  });

  it("returns the same state for zero timestep", () => {
    const state: DoublePendulumState = {
      theta1: 1.2,
      theta2: -0.4,
      omega1: 0.3,
      omega2: -0.7,
    };

    const result = integrateRK4(state, PARAMETERS, 0);

    expect(result).toEqual(state);

    expect(result).not.toBe(state);
  });

  it("leaves the hanging rest state stationary", () => {
    const result = integrateRK4(RESTING_STATE, PARAMETERS, 1 / 120);

    expect(result.theta1).toBeCloseTo(0, 14);

    expect(result.theta2).toBeCloseTo(0, 14);

    expect(result.omega1).toBeCloseTo(0, 14);

    expect(result.omega2).toBeCloseTo(0, 14);
  });

  it("is deterministic", () => {
    const state: DoublePendulumState = {
      theta1: 2.6,
      theta2: -0.9,
      omega1: 0.15,
      omega2: -0.2,
    };

    const first = integrateRK4(state, PARAMETERS, 1 / 120);

    const second = integrateRK4(state, PARAMETERS, 1 / 120);

    expect(first).toEqual(second);
  });

  it("produces a finite state after many steps", () => {
    let state: DoublePendulumState = {
      theta1: 2.6,
      theta2: -0.9,
      omega1: 0,
      omega2: 0,
    };

    for (let i = 0; i < 12000; i += 1) {
      state = integrateRK4(state, PARAMETERS, 1 / 120);

      expect(Number.isFinite(state.theta1)).toBe(true);

      expect(Number.isFinite(state.theta2)).toBe(true);

      expect(Number.isFinite(state.omega1)).toBe(true);

      expect(Number.isFinite(state.omega2)).toBe(true);
    }
  }, 10000);

  it("changes the dynamics when gravity changes", () => {
    const state: DoublePendulumState = {
      theta1: 1,
      theta2: 0.5,
      omega1: 0,
      omega2: 0,
    };

    const normalGravity = integrateRK4(state, PARAMETERS, 1 / 120);

    const lowGravity = integrateRK4(
      state,
      {
        ...PARAMETERS,
        gravity: 2,
      },
      1 / 120,
    );

    expect(normalGravity.omega1).not.toBe(lowGravity.omega1);

    expect(normalGravity.omega2).not.toBe(lowGravity.omega2);
  });

  it("rejects invalid timesteps", () => {
    expect(() => integrateRK4(RESTING_STATE, PARAMETERS, -0.001)).toThrow(
      RangeError,
    );

    expect(() => integrateRK4(RESTING_STATE, PARAMETERS, Number.NaN)).toThrow(
      RangeError,
    );
  });

  it("rejects invalid physical parameters", () => {
    expect(() =>
      integrateRK4(
        RESTING_STATE,
        {
          ...PARAMETERS,
          l1: 0,
        },
        1 / 120,
      ),
    ).toThrow(RangeError);

    expect(() =>
      integrateRK4(
        RESTING_STATE,
        {
          ...PARAMETERS,
          m2: -1,
        },
        1 / 120,
      ),
    ).toThrow(RangeError);
  });
});

describe("totalEnergy", () => {
  it("is finite for a normal state", () => {
    const state: DoublePendulumState = {
      theta1: 2.6,
      theta2: -0.9,
      omega1: 0,
      omega2: 0,
    };

    const energy = totalEnergy(state, PARAMETERS);

    expect(Number.isFinite(energy)).toBe(true);
  });

  /**
   * Check that RK4 keeps the mechanical energy bounded over time.
   *
   * We test the maximum relative deviation from the initial energy rather
   * than only the final energy, because numerical energy error can oscillate.
   */
  it("keeps mechanical energy approximately conserved", () => {
    let state: DoublePendulumState = {
      theta1: 2.6,
      theta2: -0.9,
      omega1: 0,
      omega2: 0,
    };

    const initialEnergy = totalEnergy(state, PARAMETERS);

    let maximumRelativeError = 0;

    for (let i = 0; i < 1200; i += 1) {
      state = integrateRK4(state, PARAMETERS, 1 / 120);

      const currentEnergy = totalEnergy(state, PARAMETERS);

      const relativeError =
        Math.abs(currentEnergy - initialEnergy) /
        Math.max(1, Math.abs(initialEnergy));

      maximumRelativeError = Math.max(maximumRelativeError, relativeError);
    }

    expect(maximumRelativeError).toBeLessThan(1e-4);
  });

  /**
   * A smaller timestep should reduce the numerical energy error.
   *
   * This is a more meaningful test of the integrator than asserting an
   * arbitrarily tiny absolute energy error.
   */
  it("converges as the timestep is reduced", () => {
    const initialState: DoublePendulumState = {
      theta1: 2.6,
      theta2: -0.9,
      omega1: 0,
      omega2: 0,
    };

    const initialEnergy = totalEnergy(initialState, PARAMETERS);

    const simulate = (dt: number): number => {
      let state = initialState;

      const steps = Math.round(10 / dt);

      for (let i = 0; i < steps; i += 1) {
        state = integrateRK4(state, PARAMETERS, dt);
      }

      return (
        Math.abs(totalEnergy(state, PARAMETERS) - initialEnergy) /
        Math.max(1, Math.abs(initialEnergy))
      );
    };

    const coarseError = simulate(1 / 60);

    const fineError = simulate(1 / 120);

    expect(fineError).toBeLessThan(coarseError);
  });
});
