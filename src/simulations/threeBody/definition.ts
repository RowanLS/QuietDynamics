import threeBodyPreview from "../../assets/previews/three-body.webp";
import { ThreeBodyControls } from "../../components/ThreeBodyControls";

import type { SimulationDefinition } from "../definition";

import { createThreeBodySimulation } from "./ThreeBodySimulation";
import { createRandomConfig } from "./randomise";
import {
  DEFAULT_THREE_BODY_SETTINGS,
  type ThreeBodySettings,
} from "./settings";
import { createThreeBodyUrlCodec } from "./url";

const defaults = DEFAULT_THREE_BODY_SETTINGS;

export const threeBodyDefinition = {
  id: "three-body",
  title: "Three-Body Gravity",
  description:
    "Three celestial bodies tracing intricate paths under their mutual gravitational pull.",
  path: "/three-body",
  preview: threeBodyPreview,

  defaults,

  codec: createThreeBodyUrlCodec(defaults),

  createRandomConfig: (seed: number, _base: ThreeBodySettings) => {
    void _base;
    return createRandomConfig(seed);
  },

  createSimulation: createThreeBodySimulation,

  Controls: ThreeBodyControls,

  requiresReset: (_updates: Partial<ThreeBodySettings>) => {
    void _updates;
    return true;
  },
} satisfies SimulationDefinition<ThreeBodySettings>;
