import type { ComponentType } from "react";

import type {
  Simulation,
  SimulationRuntimeSettings,
} from "../types/simulation";

import type { SimulationName } from "../types/simulationName";
import type { UrlCodec } from "../utils/urlState";

/**
 * A simulation's settings and update callback.
 *
 * Every simulation-specific controls component must implement
 * this interface for its own settings type.
 */
export interface SimulationControlsProps<TSettings extends object> {
  settings: TSettings;
  onChange: (updates: Partial<TSettings>) => void;
}

/**
 * Strongly typed registration for one mathematical simulation.
 *
 * TSettings connects the simulation's defaults, URL codec,
 * randomiser, factory and controls component.
 *
 * This definition contains application integration metadata.
 * It does not define or generalise simulation mathematics.
 */
export interface SimulationDefinition<TSettings extends object> {
  readonly id: SimulationName;

  readonly title: string;
  readonly description: string;
  readonly path: `/${string}`;
  readonly preview: string;

  readonly defaults: TSettings;

  readonly codec: UrlCodec<TSettings>;

  /**
   * Generate a deterministic configuration from a seed.
   *
   * The base configuration allows randomisers to preserve
   * selected existing settings when appropriate.
   */
  readonly createRandomConfig: (seed: number, base: TSettings) => TSettings;

  /**
   * Construct the imperative simulation.
   *
   * Getters ensure that the simulation can access current
   * settings without recreating the animation loop.
   */
  readonly createSimulation: (
    getSettings: () => TSettings,
    getRuntimeSettings: () => SimulationRuntimeSettings,
  ) => Simulation;

  readonly Controls: ComponentType<SimulationControlsProps<TSettings>>;

  /**
   * Whether applying the supplied settings update requires
   * restarting the mathematical simulation.
   */
  readonly requiresReset: (updates: Partial<TSettings>) => boolean;
}
