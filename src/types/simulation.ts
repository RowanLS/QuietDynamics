import type { TrailBuffer } from "../engine/TrailBuffer";
import type { PlaybackSettings } from "./settings";
import type { PaletteName } from "./settings";
export interface Simulation {
  /**
   * Reset mathematical state and simulation-owned trail state.
   */
  reset(): void;

  /**
   * Reset accumulated timing without changing mathematical state.
   *
   * Used when returning from a hidden browser tab.
   */
  resetTiming(): void;

  /**
   * Advance the simulation and sample its trajectory.
   *
   * elapsed is wall-clock time since the previous rendered frame.
   * time is the current requestAnimationFrame timestamp and is used
   * for trail timestamps.
   */
  update(elapsed: number, time: number, width: number, height: number): void;

  /**
   * Render simulation-specific foreground content.
   */
  renderForeground(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void;

  /**
   * Return the simulation-owned trajectory buffer.
   */
  getTrail(): TrailBuffer;
}

export interface SimulationRuntimeSettings extends PlaybackSettings {
  rainbowSpeed: number;
  palette: PaletteName;
  trailLifetime: number;
  glow: number;
}
