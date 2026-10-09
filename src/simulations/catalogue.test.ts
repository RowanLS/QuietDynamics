import { describe, expect, it } from "vitest";

import { SIMULATIONS } from "./catalogue";

describe("simulation catalogue", () => {
  it("contains the currently available simulations", () => {
    expect(SIMULATIONS.map((simulation) => simulation.id)).toEqual([
      "double-pendulum",
      "lorenz",
    ]);
  });

  it("has unique simulation IDs", () => {
    const ids = SIMULATIONS.map((simulation) => simulation.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique paths", () => {
    const paths = SIMULATIONS.map((simulation) => simulation.path);

    expect(new Set(paths).size).toBe(paths.length);
  });

  it("uses absolute paths", () => {
    for (const simulation of SIMULATIONS) {
      expect(simulation.path).toMatch(/^\//);
    }
  });

  it("provides display metadata for every simulation", () => {
    for (const simulation of SIMULATIONS) {
      expect(simulation.title.trim()).not.toBe("");
      expect(simulation.description.trim()).not.toBe("");
    }
  });
});
