import type { SimulationDefinition } from "../simulations/catalogue";

const UINT32_RANGE = 0x1_0000_0000;

/**
 * Choose one simulation uniformly from the supplied catalogue.
 *
 * randomValue is injectable so selection can be tested deterministically.
 */
export function chooseRandomSimulation(
  simulations: readonly SimulationDefinition[],
  randomValue: number = Math.random(),
): SimulationDefinition {
  if (simulations.length === 0) {
    throw new Error("Cannot choose a simulation from an empty catalogue.");
  }

  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
    throw new RangeError("Random value must be in the range [0, 1).");
  }

  const index = Math.floor(randomValue * simulations.length);

  return simulations[index];
}

/**
 * Build a reproducible URL for a randomly selected simulation.
 */
export function createRandomSimulationPath(
  simulations: readonly SimulationDefinition[],
  seed: number,
  randomValue: number = Math.random(),
): string {
  if (!Number.isInteger(seed) || seed < 1 || seed >= UINT32_RANGE) {
    throw new RangeError("Seed must be a non-zero unsigned 32-bit integer.");
  }

  const simulation = chooseRandomSimulation(simulations, randomValue);

  const params = new URLSearchParams();

  params.set("seed", String(seed));

  return `${simulation.path}?${params.toString()}`;
}
