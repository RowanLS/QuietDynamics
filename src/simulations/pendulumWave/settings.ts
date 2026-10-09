export interface PendulumWaveSettings {
  pendulumCount: number;

  /**
   * Number of oscillations completed by the slowest pendulum during one
   * complete wave cycle.
   */
  baseOscillations: number;

  /**
   * Duration, in seconds, after which the array returns to its initial
   * alignment.
   */
  wavePeriod: number;

  /**
   * Maximum angular displacement from vertical, in radians.
   */
  amplitude: number;

  startingHue: number;
}
