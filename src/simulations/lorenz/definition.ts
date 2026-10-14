import lorenzPreview from "../../assets/previews/lorenz.webp";
import { LorenzControls } from "../../components/LorenzControls";

import type { SimulationDefinition } from "../definition";

import { createLorenzSimulation } from "./LorenzSimulation";
import { createRandomConfig } from "./randomise";
import type { LorenzSettings } from "./settings";
import { createLorenzUrlCodec } from "./url";

const defaults: LorenzSettings = {
  sigma: 10,
  rho: 25,
  beta: 8 / 3,
  initialX: 0,
  initialY: -1,
  initialZ: 20,
  startingHue: 200,
};

export const lorenzDefinition = {
  id: "lorenz",
  title: "Lorenz Attractor",
  description:
    "A continuous trajectory through the classic Lorenz chaotic system.",
  path: "/lorenz",
  preview: lorenzPreview,

  defaults,

  codec: createLorenzUrlCodec(createRandomConfig, defaults),

  createRandomConfig: (seed: number, _base: LorenzSettings) => {
    void _base;
    return createRandomConfig(seed);
  },

  createSimulation: createLorenzSimulation,

  Controls: LorenzControls,

  requiresReset: (updates: Partial<LorenzSettings>) =>
    updates.initialX !== undefined ||
    updates.initialY !== undefined ||
    updates.initialZ !== undefined,
} satisfies SimulationDefinition<LorenzSettings>;
