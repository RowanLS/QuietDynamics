import doublePendulumPreview from "../assets/previews/double-pendulum.webp";
import lorenzPreview from "../assets/previews/lorenz.webp";
import pendulumWavePreview from "../assets/previews/pendulum-wave.webp";
import threeBodyPreview from "../assets/previews/three-body.webp";
import type { SimulationName } from "../types/simulationName";

export interface SimulationDefinition {
  id: SimulationName;
  title: string;
  description: string;
  path: `/${string}`;
  preview: string;
}

export const SIMULATIONS = [
  {
    id: "double-pendulum",
    title: "Double Pendulum",
    description: "Chaotic motion traced by a pair of coupled pendulums.",
    path: "/double-pendulum",
    preview: doublePendulumPreview,
  },
  {
    id: "lorenz",
    title: "Lorenz Attractor",
    description:
      "A continuous trajectory through the classic Lorenz chaotic system.",
    path: "/lorenz",
    preview: lorenzPreview,
  },
  {
    id: "pendulum-wave",
    title: "Pendulum Wave",
    description:
      "A field of pendulums drifting through waves of order and disorder.",
    path: "/pendulum-wave",
    preview: pendulumWavePreview,
  },
  {
    id: "three-body",
    title: "Three-Body Gravity",
    description:
      "Three celestial bodies tracing intricate paths under their mutual gravitational pull.",
    path: "/three-body",
    preview: threeBodyPreview,
  },
] as const satisfies readonly SimulationDefinition[];

export function getSimulationDefinition(
  id: SimulationName,
): SimulationDefinition {
  const definition = SIMULATIONS.find((simulation) => simulation.id === id);

  if (!definition) {
    /*
     * SimulationName and SIMULATIONS should remain exhaustive together.
     * Keep the runtime guard as protection against future configuration errors.
     */
    throw new Error(`No simulation definition exists for "${id}".`);
  }

  return definition;
}
