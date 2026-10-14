import { doublePendulumDefinition } from "./doublePendulum/definition";
import { lorenzDefinition } from "./lorenz/definition";
import { pendulumWaveDefinition } from "./pendulumWave/definition";
import { threeBodyDefinition } from "./threeBody/definition";
import type { SimulationName } from "../types/simulationName";

/**
 * Metadata required for navigation and simulation selection.
 *
 * This intentionally excludes simulation-specific settings,
 * factories, codecs and controls.
 */
export interface SimulationMetadata {
  readonly id: SimulationName;
  readonly title: string;
  readonly description: string;
  readonly path: `/${string}`;
  readonly preview: string;
}

export const SIMULATIONS = [
  doublePendulumDefinition,
  lorenzDefinition,
  pendulumWaveDefinition,
  threeBodyDefinition,
] as const;

export function getSimulationDefinition(id: SimulationName) {
  const definition = SIMULATIONS.find((simulation) => simulation.id === id);

  if (!definition) {
    throw new Error(`Unknown simulation: ${id}`);
  }

  return definition;
}
