import { describe, expect, it } from "vitest";
import doublePendulumPreview from "../assets/previews/double-pendulum.webp";
import lorenzPreview from "../assets/previews/lorenz.webp";
import type { SimulationDefinition } from "../simulations/catalogue";
import {
  chooseRandomSimulation,
  createRandomSimulationPath,
} from "./randomSimulation";

const simulations: readonly SimulationDefinition[] = [
  {
    id: "double-pendulum",
    title: "Double Pendulum",
    description: "Test description",
    path: "/double-pendulum",
    preview: doublePendulumPreview,
  },
  {
    id: "lorenz",
    title: "Lorenz Attractor",
    description: "Test description",
    path: "/lorenz",
    preview: lorenzPreview,
  },
];

describe("chooseRandomSimulation", () => {
  it("selects the first simulation from the lower half of the range", () => {
    expect(chooseRandomSimulation(simulations, 0)).toBe(simulations[0]);
    expect(chooseRandomSimulation(simulations, 0.499999)).toBe(simulations[0]);
  });

  it("selects the second simulation from the upper half of the range", () => {
    expect(chooseRandomSimulation(simulations, 0.5)).toBe(simulations[1]);

    expect(chooseRandomSimulation(simulations, 0.999999)).toBe(simulations[1]);
  });

  it("works with a single simulation", () => {
    expect(chooseRandomSimulation([simulations[0]], 0.999999)).toBe(
      simulations[0],
    );
  });

  it("rejects an empty catalogue", () => {
    expect(() => {
      chooseRandomSimulation([], 0.5);
    }).toThrow(/empty catalogue/i);
  });

  it.each([-0.1, 1, 1.1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid random value %s",
    (randomValue) => {
      expect(() => {
        chooseRandomSimulation(simulations, randomValue);
      }).toThrow(/range/i);
    },
  );
});

describe("createRandomSimulationPath", () => {
  it("creates a reproducible Double Pendulum URL", () => {
    expect(createRandomSimulationPath(simulations, 12345, 0)).toBe(
      "/double-pendulum?seed=12345",
    );
  });

  it("creates a reproducible Lorenz URL", () => {
    expect(createRandomSimulationPath(simulations, 987654321, 0.75)).toBe(
      "/lorenz?seed=987654321",
    );
  });

  it("accepts the maximum unsigned 32-bit seed", () => {
    expect(createRandomSimulationPath(simulations, 0xffffffff, 0)).toBe(
      "/double-pendulum?seed=4294967295",
    );
  });

  it("rejects seed zero because zero represents application defaults", () => {
    expect(() => {
      createRandomSimulationPath(simulations, 0, 0);
    }).toThrow(/non-zero unsigned 32-bit integer/i);
  });

  it.each([-1, 0x1_0000_0000, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid seed %s",
    (seed) => {
      expect(() => {
        createRandomSimulationPath(simulations, seed, 0);
      }).toThrow(/unsigned 32-bit integer/i);
    },
  );
});
