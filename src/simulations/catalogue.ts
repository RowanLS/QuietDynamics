import doublePendulumPreview from "../assets/previews/double-pendulum.webp";
import lorenzPreview from "../assets/previews/lorenz.webp";

import type { SimulationName } from "../types/simulationName";

export interface SimulationDefinition {
  id: SimulationName;
  title: string;
  description: string;
  path: string;
  preview: string;
}

export const SIMULATIONS: readonly SimulationDefinition[] = [
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
];
