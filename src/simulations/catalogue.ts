import type { SimulationName } from "../types/simulationName";

export interface SimulationDefinition {
  id: SimulationName;
  title: string;
  description: string;
  path: string;
}

export const SIMULATIONS: readonly SimulationDefinition[] = [
  {
    id: "double-pendulum",
    title: "Double Pendulum",
    description: "Chaotic motion traced by a pair of coupled pendulums.",
    path: "/double-pendulum",
  },
  {
    id: "lorenz",
    title: "Lorenz Attractor",
    description:
      "A continuous trajectory through the classic Lorenz chaotic system.",
    path: "/lorenz",
  },
];
