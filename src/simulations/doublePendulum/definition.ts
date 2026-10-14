import doublePendulumPreview from "../../assets/previews/double-pendulum.webp";

import { DoublePendulumControls } from "../../components/DoublePendulumControls";

import type { ControlSettings } from "../../types/settings";
import type { SimulationDefinition } from "../definition";

import { createDoublePendulumSimulation } from "./DoublePendulumSimulation";
import { createRandomConfig } from "./randomise";
import { createDoublePendulumUrlCodec } from "./url";

const defaults: ControlSettings = {
  seed: 42,
  background: "#071018",
  palette: "neon-rainbow",
  startingHue: 200,

  trailLifetime: 18,
  glow: 100,
  rainbowSpeed: 0.8,
  simulationSpeed: 1,

  m1: 1,
  m2: 1.37,
  l1: 1,
  l2: 1,
  gravity: 9.81,

  initialAngle1: 2.6,
  initialAngle2: -0.9,

  initialOmega1: 0,
  initialOmega2: 0,

  paused: false,
};

export const doublePendulumDefinition = {
  id: "double-pendulum",
  title: "Double Pendulum",
  description: "Chaotic motion traced by a pair of coupled pendulums.",
  path: "/double-pendulum",
  preview: doublePendulumPreview,

  defaults,

  codec: createDoublePendulumUrlCodec(createRandomConfig, defaults),

  createRandomConfig,

  createSimulation: createDoublePendulumSimulation,

  Controls: DoublePendulumControls,

  requiresReset: (updates: Partial<ControlSettings>) =>
    updates.initialAngle1 !== undefined ||
    updates.initialAngle2 !== undefined ||
    updates.initialOmega1 !== undefined ||
    updates.initialOmega2 !== undefined,
} satisfies SimulationDefinition<ControlSettings>;
