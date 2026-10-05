import { TrailBuffer } from "../../engine/TrailBuffer";
import {
  integrateRK4,
  type DoublePendulumParameters,
  type DoublePendulumState,
} from "./physics";
import type { ControlSettings } from "../../types/settings";
import type {
  Simulation,
  SimulationRuntimeSettings,
} from "../../types/simulation";

export interface DoublePendulumPosition {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const TRAIL_SAMPLE_RATE = 120;
const TRAIL_SAMPLE_INTERVAL = 1000 / TRAIL_SAMPLE_RATE;

const MAX_TRAIL_LIFETIME_SECONDS = 40;
const TRAIL_CAPACITY =
  Math.ceil(MAX_TRAIL_LIFETIME_SECONDS * TRAIL_SAMPLE_RATE) + 2;

const TIMESTEP = 1 / 120;
const MAX_SIMULATION_STEPS_PER_FRAME = 40;
const MAX_ELAPSED_SECONDS = 0.1;

/**
 * Create an imperative double-pendulum simulation.
 *
 * React is deliberately not referenced here. The current configuration is
 * supplied through a getter so React can update settings without rebuilding
 * the simulation or animation loop.
 */
export function createDoublePendulumSimulation(
  getSettings: () => ControlSettings,
  getRuntimeSettings: () => SimulationRuntimeSettings,
): Simulation {
  let accumulator = 0;
  let trailSampleAccumulator = TRAIL_SAMPLE_INTERVAL;

  const resetTiming = (): void => {
    accumulator = 0;
    trailSampleAccumulator = TRAIL_SAMPLE_INTERVAL;
  };

  let state: DoublePendulumState = {
    theta1: 0,
    theta2: 0,
    omega1: 0,
    omega2: 0,
  };

  const trail = new TrailBuffer(TRAIL_CAPACITY);

  const position: DoublePendulumPosition = {
    x0: 0,
    y0: 0,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
  };

  let hue = 0;
  let trailSequence = 0;

  const initialiseState = (): void => {
    const settings = getSettings();

    state = {
      theta1: settings.initialAngle1,
      theta2: settings.initialAngle2,
      omega1: settings.initialOmega1,
      omega2: settings.initialOmega2,
    };

    hue = settings.startingHue;
    trailSequence = 0;
    trail.clear();

    trailSampleAccumulator = TRAIL_SAMPLE_INTERVAL;
    accumulator = 0;
  };

  const updatePositions = (width: number, height: number): void => {
    const settings = getSettings();

    const x0 = width * 0.5;
    const y0 = height * 0.5;
    const scale = Math.min(width, height) * 0.14;

    const x1 = x0 + Math.sin(state.theta1) * settings.l1 * scale;
    const y1 = y0 + Math.cos(state.theta1) * settings.l1 * scale;

    const x2 = x1 + Math.sin(state.theta2) * settings.l2 * scale;
    const y2 = y1 + Math.cos(state.theta2) * settings.l2 * scale;

    position.x0 = x0;
    position.y0 = y0;
    position.x1 = x1;
    position.y1 = y1;
    position.x2 = x2;
    position.y2 = y2;
  };

  const update = (
    elapsed: number,
    time: number,
    width: number,
    height: number,
  ): void => {
    if (!Number.isFinite(elapsed) || elapsed < 0) {
      throw new RangeError(
        "Double-pendulum elapsed time must be finite and non-negative.",
      );
    }

    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      height <= 0
    ) {
      throw new RangeError(
        "Double-pendulum update requires finite positive dimensions and time.",
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

    const parameters: DoublePendulumParameters = {
      m1: settings.m1,
      m2: settings.m2,
      l1: settings.l1,
      l2: settings.l2,
      gravity: settings.gravity,
    };

    let safety = 0;

    while (accumulator >= TIMESTEP && safety < MAX_SIMULATION_STEPS_PER_FRAME) {
      state = integrateRK4(state, parameters, TIMESTEP);

      accumulator -= TIMESTEP;
      safety += 1;
    }

    if (
      !Number.isFinite(state.theta1) ||
      !Number.isFinite(state.theta2) ||
      !Number.isFinite(state.omega1) ||
      !Number.isFinite(state.omega2)
    ) {
      console.error("Double-pendulum integration produced a non-finite state.");

      initialiseState();
    }

    if (safety === MAX_SIMULATION_STEPS_PER_FRAME) {
      accumulator = 0;
    }

    updatePositions(width, height);

    trailSampleAccumulator += elapsed * 1000;

    if (trailSampleAccumulator >= TRAIL_SAMPLE_INTERVAL) {
      /*
       * Record at most one point per rendered frame. If a frame is delayed,
       * do not insert several identical positions to catch up.
       */
      trailSampleAccumulator %= TRAIL_SAMPLE_INTERVAL;

      trail.push({
        x: position.x2,
        y: position.y2,
        hue,
        time,
        sequence: trailSequence,
      });

      trailSequence += 1;
    }

    /*
     * Preserve the existing behaviour: hue advances once per rendered
     * frame rather than once per physics step.
     */
    hue = (hue + 0.75 * runtime.rainbowSpeed) % 360;
  };

  const renderForeground = (
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void => {
    const settings = getSettings();

    context.clearRect(0, 0, width, height);

    context.strokeStyle = "rgba(235, 242, 248, 0.75)";
    context.lineWidth = 1.5;

    context.beginPath();
    context.moveTo(position.x0, position.y0);
    context.lineTo(position.x1, position.y1);
    context.lineTo(position.x2, position.y2);
    context.stroke();

    context.fillStyle = "#64d9ff";
    context.beginPath();
    context.arc(position.x1, position.y1, 8 + settings.m1, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#d18cff";
    context.beginPath();
    context.arc(position.x2, position.y2, 9 + settings.m2, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "rgba(255,255,255,0.9)";
    context.beginPath();
    context.arc(position.x0, position.y0, 3, 0, Math.PI * 2);
    context.fill();
  };

  initialiseState();

  return {
    reset: initialiseState,
    update,
    renderForeground,

    getTrail: () => trail,

    resetTiming,
  };
}
