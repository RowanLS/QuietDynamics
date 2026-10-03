/**
 * Available visual trail palettes.
 */
export type PaletteName = "neon-rainbow" | "rainbow" | "gradient" | "solid";

/**
 * Complete configuration for the current screensaver.
 *
 * These are configuration values, not the current dynamic simulation state.
 */
export interface ControlSettings {
  /*
   * Appearance
   */
  background: string;
  palette: PaletteName;
  startingHue: number;

  trailLifetime: number;
  glow: number;
  rainbowSpeed: number;

  /*
   * Simulation timing
   */
  simulationSpeed: number;
  paused: boolean;

  /*
   * Physical parameters
   */
  m1: number;
  m2: number;
  l1: number;
  l2: number;
  gravity: number;

  /*
   * Initial conditions.
   */
  initialAngle1: number;
  initialAngle2: number;
  initialOmega1: number;
  initialOmega2: number;
}
