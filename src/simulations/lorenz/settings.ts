/**
 * Parameters and initial conditions for a Lorenz attractor.
 *
 * Visual/screen-level settings such as palette, trail lifetime, glow,
 * background, and rainbow speed deliberately remain outside this type.
 */
export interface LorenzSettings {
  sigma: number;
  rho: number;
  beta: number;

  initialX: number;
  initialY: number;
  initialZ: number;

  startingHue: number;
}
