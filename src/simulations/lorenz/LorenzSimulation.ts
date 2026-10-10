import { TrailBuffer } from "../../engine/TrailBuffer";
import {
  integrateRK4,
  isFiniteState,
  type LorenzParameters,
  type LorenzState,
} from "./physics";
import type { LorenzSettings } from "./settings";
import type {
  Simulation,
  SimulationRuntimeSettings,
} from "../../types/simulation";
export interface LorenzPosition {
  x: number;
  y: number;
}

const TRAIL_SAMPLE_RATE = 120;
const TRAIL_SAMPLE_INTERVAL = 1000 / TRAIL_SAMPLE_RATE;

const MAX_TRAIL_LIFETIME_SECONDS = 40;
const TRAIL_CAPACITY =
  Math.ceil(MAX_TRAIL_LIFETIME_SECONDS * TRAIL_SAMPLE_RATE) + 2;

const TIMESTEP = 1 / 120;
const MAX_SIMULATION_STEPS_PER_FRAME = 40;
const MAX_ELAPSED_SECONDS = 0.1;

/*
 * Coordinate projection constants.
 *
 * The Lorenz attractor is rendered as a top-down projection of the x/z
 * plane. The y coordinate is retained by the physics but does not directly
 * determine the 2D screen position.
 */
const X_MIN = -25;
const X_MAX = 25;
const Z_MIN = 0;
const Z_MAX = 55;

/**
 * Create an imperative Lorenz simulation.
 *
 * Configuration is accessed through a getter so React can update the
 * current configuration without rebuilding the simulation instance.
 */
export function createLorenzSimulation(
  getSettings: () => LorenzSettings,
  getRuntimeSettings: () => SimulationRuntimeSettings,
): Simulation {
  let state: LorenzState = {
    x: 0,
    y: 0,
    z: 0,
  };

  const trail = new TrailBuffer(TRAIL_CAPACITY);

  let accumulator = 0;
  let trailSampleAccumulator = TRAIL_SAMPLE_INTERVAL;
  let hue = 0;
  let trailSequence = 0;

  const reset = (): void => {
    const settings = getSettings();

    state = {
      x: settings.initialX,
      y: settings.initialY,
      z: settings.initialZ,
    };

    hue = settings.startingHue;
    trailSequence = 0;

    trail.clear();

    accumulator = 0;
    trailSampleAccumulator = TRAIL_SAMPLE_INTERVAL;
  };

  const resetTiming = (): void => {
    accumulator = 0;
    trailSampleAccumulator = TRAIL_SAMPLE_INTERVAL;
  };

  const projectState = (
    currentState: LorenzState,
    width: number,
    height: number,
  ): LorenzPosition => {
    const isPortrait = height > width;

    const horizontalPadding = width * (isPortrait ? 0.08 : 0.06);

    const verticalPadding = height * (isPortrait ? 0.2 : 0.08);

    const availableWidth = width - horizontalPadding * 2;

    const availableHeight = height - verticalPadding * 2;

    const modelWidth = X_MAX - X_MIN;
    const modelHeight = Z_MAX - Z_MIN;

    /*
     * Use one scale for both axes so the x/z projection retains
     * its mathematical aspect ratio.
     */
    const scale = Math.min(
      availableWidth / modelWidth,
      availableHeight / modelHeight,
    );

    const projectedWidth = modelWidth * scale;

    const projectedHeight = modelHeight * scale;

    const offsetX = (width - projectedWidth) / 2;

    /*
     * On portrait screens place the attractor slightly below the
     * exact viewport centre. On landscape screens centre it.
     */
    const centreY = isPortrait ? height * 0.54 : height * 0.5;

    const offsetY = centreY - projectedHeight / 2;

    return {
      x: offsetX + (currentState.x - X_MIN) * scale,

      y: offsetY + (Z_MAX - currentState.z) * scale,
    };
  };

  const update = (
    elapsed: number,
    time: number,
    width: number,
    height: number,
  ): void => {
    if (!Number.isFinite(elapsed) || elapsed < 0) {
      throw new RangeError(
        "Lorenz elapsed time must be finite and non-negative.",
      );
    }

    if (
      !Number.isFinite(time) ||
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      throw new RangeError(
        "Lorenz update requires finite positive dimensions and time.",
      );
    }

    const settings = getSettings();
    const runtime = getRuntimeSettings();
    accumulator +=
      Math.min(elapsed, MAX_ELAPSED_SECONDS) * runtime.simulationSpeed;

    const maxAccumulatedTime = TIMESTEP * MAX_SIMULATION_STEPS_PER_FRAME;

    if (accumulator > maxAccumulatedTime) {
      accumulator = maxAccumulatedTime;
    }

    const parameters: LorenzParameters = {
      sigma: settings.sigma,
      rho: settings.rho,
      beta: settings.beta,
    };

    let safety = 0;

    while (accumulator >= TIMESTEP && safety < MAX_SIMULATION_STEPS_PER_FRAME) {
      state = integrateRK4(state, parameters, TIMESTEP);

      accumulator -= TIMESTEP;
      safety += 1;
    }

    if (!isFiniteState(state)) {
      console.error("Lorenz integration produced a non-finite state.");

      reset();
    }

    if (safety === MAX_SIMULATION_STEPS_PER_FRAME) {
      accumulator = 0;
    }

    trailSampleAccumulator += elapsed * 1000;

    if (trailSampleAccumulator >= TRAIL_SAMPLE_INTERVAL) {
      /*
       * Record at most one point per rendered frame. Delayed frames do not
       * create several duplicate trajectory points.
       */
      trailSampleAccumulator %= TRAIL_SAMPLE_INTERVAL;

      const position = projectState(state, width, height);

      trail.push({
        x: position.x,
        y: position.y,
        hue,
        time,
        sequence: trailSequence,
      });

      trailSequence += 1;
    }

    /*
     * Match the existing screensaver convention: hue evolves once per
     * rendered frame rather than once per physics step.
     */
    hue = (hue + 0.75 * runtime.rainbowSpeed) % 360;
  };

  const renderForeground = (context: CanvasRenderingContext2D): void => {
    /*
     * The Lorenz attractor itself is represented by the reusable trail.
     * The foreground only provides a small current-position marker.
     */
    if (trail.length === 0) {
      return;
    }

    const latestPoint = trail.getUnchecked(trail.length - 1);

    context.fillStyle = "rgba(255, 255, 255, 0.9)";
    context.beginPath();
    context.arc(latestPoint.x, latestPoint.y, 2.5, 0, Math.PI * 2);
    context.fill();
  };

  reset();

  return {
    reset,
    resetTiming,
    update,
    renderForeground,
    getTrail: () => trail,
  };
}
