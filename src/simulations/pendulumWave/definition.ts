import pendulumWavePreview from "../../assets/previews/pendulum-wave.webp";
import { PendulumWaveControls } from "../../components/PendulumWaveControls";

import type { SimulationDefinition } from "../definition";

import { createPendulumWaveSimulation } from "./PendulumWaveSimulation";
import { createRandomConfig } from "./randomise";
import type { PendulumWaveSettings } from "./settings";
import { createPendulumWaveUrlCodec } from "./url";

const defaults: PendulumWaveSettings = {
  pendulumCount: 30,
  baseOscillations: 24,
  wavePeriod: 90,
  amplitude: 0.35,
  startingHue: 200,
};

export const pendulumWaveDefinition = {
  id: "pendulum-wave",
  title: "Pendulum Wave",
  description:
    "A field of pendulums drifting through waves of order and disorder.",
  path: "/pendulum-wave",
  preview: pendulumWavePreview,

  defaults,

  codec: createPendulumWaveUrlCodec(createRandomConfig, defaults),

  createRandomConfig: (seed: number, _base: PendulumWaveSettings) => {
    void _base;
    return createRandomConfig(seed);
  },

  createSimulation: createPendulumWaveSimulation,

  Controls: PendulumWaveControls,

  requiresReset: (_updates: Partial<PendulumWaveSettings>) => {
    void _updates;
    return true;
  },
} satisfies SimulationDefinition<PendulumWaveSettings>;
