import { describe, expect, it } from "vitest";
import type { SimulationName } from "../types/simulationName";
import { getSimulationDefinition, SIMULATIONS } from "./catalogue";

describe("simulation catalogue", () => {
  it("contains the currently available simulations", () => {
    expect(SIMULATIONS.map((simulation) => simulation.id)).toEqual([
      "double-pendulum",
      "lorenz",
      "pendulum-wave",
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

describe("simulation catalogue", () => {
  it("contains every supported simulation", () => {
    const expected: SimulationName[] = [
      "double-pendulum",
      "lorenz",
      "pendulum-wave",
    ];

    expect(SIMULATIONS.map((simulation) => simulation.id)).toEqual(expected);
  });

  it("has unique simulation IDs", () => {
    const ids = SIMULATIONS.map((simulation) => simulation.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has unique paths", () => {
    const paths = SIMULATIONS.map((simulation) => simulation.path);

    expect(new Set(paths).size).toBe(paths.length);
  });

  it("returns a simulation by ID", () => {
    expect(getSimulationDefinition("pendulum-wave")).toMatchObject({
      id: "pendulum-wave",
      title: "Pendulum Wave",
      path: "/pendulum-wave",
    });
  });

  it("provides display metadata for every simulation", () => {
    for (const simulation of SIMULATIONS) {
      expect(simulation.title.trim()).not.toBe("");
      expect(simulation.description.trim()).not.toBe("");
      expect(simulation.preview.trim()).not.toBe("");
    }
  });
});
