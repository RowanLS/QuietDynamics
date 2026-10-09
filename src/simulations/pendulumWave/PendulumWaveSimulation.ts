import { TrailBuffer } from "../../engine/TrailBuffer";
import type {
  Simulation,
  SimulationRuntimeSettings,
} from "../../types/simulation";

import { getPendulumAngle } from "./physics";
import type { PendulumWaveSettings } from "./settings";

const EMPTY_TRAIL_CAPACITY = 1;

interface PendulumGeometry {
  pivotX: number;
  pivotY: number;
  bobX: number;
  bobY: number;
}

/**
 * Convert HSL components into a CSS colour.
 */
function hsl(
  hue: number,
  saturation: number,
  lightness: number,
  alpha = 1,
): string {
  return `hsl(${hue} ${saturation}% ${lightness}% / ${alpha})`;
}

/**
 * Create the Pendulum Wave simulation.
 *
 * Pendulum Wave is rendered entirely as foreground geometry. It does not
 * currently produce a trajectory trail, so an empty TrailBuffer satisfies
 * the existing shared Simulation contract.
 */
export function createPendulumWaveSimulation(
  getSettings: () => PendulumWaveSettings,
  getRuntimeSettings: () => SimulationRuntimeSettings,
): Simulation {
  let elapsedTime = 0;

  const trail = new TrailBuffer(EMPTY_TRAIL_CAPACITY);

  const getGeometry = (
    index: number,
    count: number,
    angle: number,
    width: number,
    height: number,
  ): PendulumGeometry => {
    const fraction = count <= 1 ? 0.5 : index / (count - 1);

    const railWidth = Math.min(width * 0.52, 720);

    const railLeft = (width - railWidth) / 2;

    const pivotX = railLeft + railWidth * fraction;

    const pivotY = Math.max(30, height * 0.08);

    const length = Math.min(height * 0.62, width * 0.38);

    return {
      pivotX,
      pivotY,
      bobX: pivotX + Math.sin(angle) * length,
      bobY: pivotY + Math.cos(angle) * length,
    };
  };

  return {
    reset(): void {
      elapsedTime = 0;
      trail.clear();
    },

    resetTiming(): void {
      /*
       * No accumulator is used. elapsedTime is simulation time rather than
       * browser frame timing, so there is nothing else to reset here.
       */
    },

    update(elapsed: number, time: number, width: number, height: number): void {
      // Required by the shared Simulation contract; Pendulum Wave does not
      // currently depend on frame timestamp or viewport dimensions during update.
      void time;
      void width;
      void height;

      if (!Number.isFinite(elapsed) || elapsed < 0) {
        throw new RangeError(
          "Pendulum Wave elapsed time must be finite and non-negative.",
        );
      }

      const runtime = getRuntimeSettings();

      if (runtime.paused) {
        return;
      }

      elapsedTime += elapsed * runtime.simulationSpeed;

      /*
       * Avoid unbounded time growth while preserving the periodic state.
       */
      const wavePeriod = getSettings().wavePeriod;

      if (
        Number.isFinite(wavePeriod) &&
        wavePeriod > 0 &&
        elapsedTime >= wavePeriod
      ) {
        elapsedTime %= wavePeriod;
      }
    },

    renderForeground(
      context: CanvasRenderingContext2D,
      width: number,
      height: number,
    ): void {
      const settings = getSettings();
      const runtime = getRuntimeSettings();

      const count = settings.pendulumCount;

      context.save();

      context.lineWidth = 1;

      for (let index = 0; index < count; index += 1) {
        const angle = getPendulumAngle(
          index,
          elapsedTime,
          settings.baseOscillations,
          settings.wavePeriod,
          settings.amplitude,
        );

        const geometry = getGeometry(index, count, angle, width, height);

        const hue =
          (settings.startingHue +
            index * (360 / count) +
            elapsedTime * runtime.rainbowSpeed * 18) %
          360;

        /*
         * Suspension line.
         */
        context.beginPath();
        context.moveTo(geometry.pivotX, geometry.pivotY);
        context.lineTo(geometry.bobX, geometry.bobY);

        context.strokeStyle = hsl(hue, 70, 70, 0.12);

        context.stroke();

        const bobRadius = Math.max(3, Math.min(5.5, width / 300));
        /*
         * Soft glow without relying on large shadowBlur values.
         */
        const glowScale = runtime.glow / 100;

        if (glowScale > 0) {
          context.beginPath();

          context.arc(
            geometry.bobX,
            geometry.bobY,
            bobRadius * (1.25 + glowScale * 0.8),
            0,
            Math.PI * 2,
          );

          context.fillStyle = hsl(
            hue,
            100,
            60,
            Math.min(0.14, 0.055 * glowScale),
          );

          context.fill();
        }

        context.beginPath();

        context.arc(geometry.bobX, geometry.bobY, bobRadius, 0, Math.PI * 2);

        context.fillStyle = hsl(hue, 100, 72);

        context.fill();

        /*
         * Bright core.
         */
        context.beginPath();
        context.arc(geometry.bobX, geometry.bobY, 3.2, 0, Math.PI * 2);

        context.fillStyle = hsl(hue, 100, 72);

        context.fill();
      }

      context.restore();
    },

    getTrail(): TrailBuffer {
      return trail;
    },
  };
}
