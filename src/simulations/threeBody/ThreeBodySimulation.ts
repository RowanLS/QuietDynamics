import { TrailBuffer } from "../../engine/TrailBuffer";
import type {
  Simulation,
  SimulationRuntimeSettings,
} from "../../types/simulation";
import {
  advanceBodies,
  centreOfMass,
  initialBodies,
  type Bodies,
} from "./physics";
import type { ThreeBodySettings } from "./settings";

/** One trail per body, without altering the existing single-trail contract. */
export interface ThreeBodySimulation extends Simulation {
  getTrails(): readonly TrailBuffer[];
}

export function createThreeBodySimulation(
  getSettings: () => ThreeBodySettings,
  getRuntimeSettings: () => SimulationRuntimeSettings,
): ThreeBodySimulation {
  const trails = [
    new TrailBuffer(1800),
    new TrailBuffer(1800),
    new TrailBuffer(1800),
  ];
  let bodies: Bodies = initialBodies(
    getSettings().family,
    getSettings().scale,
    getSettings().velocityFactor,
  );
  let accumulator = 0;
  let sequence = 0;
  let lastWidth = 0;
  let lastHeight = 0;
  let camera = { x: 0, y: 0 };
  const step = 1 / 240;
  const reset = (): void => {
    const settings = getSettings();
    bodies = initialBodies(
      settings.family,
      settings.scale,
      settings.velocityFactor,
    );
    accumulator = 0;
    sequence = 0;
    camera = centreOfMass(bodies);
    trails.forEach((trail) => trail.clear());
  };
  const project = (body: Bodies[number], width: number, height: number) => {
    const zoom = Math.min(width, height) / 9;
    return {
      x: width / 2 + (body.x - camera.x) * zoom,
      y: height / 2 - (body.y - camera.y) * zoom,
    };
  };
  return {
    reset,
    resetTiming() {
      accumulator = 0;
    },
    getTrail() {
      return trails[0];
    },
    getTrails() {
      return trails;
    },
    update(elapsed, time, width, height) {
      if (width !== lastWidth || height !== lastHeight) {
        lastWidth = width;
        lastHeight = height;
        reset();
      }
      const speed = getRuntimeSettings().simulationSpeed;
      if (!Number.isFinite(speed) || speed < 0) return;
      accumulator = Math.min(
        accumulator + Math.min(Math.max(elapsed, 0), 0.1) * speed,
        0.1,
      );
      let iterations = 0;
      while (accumulator >= step && iterations < 24) {
        bodies = advanceBodies(bodies, step);
        accumulator -= step;
        iterations++;
      }
      if (iterations === 24) accumulator = 0;
      // Fixed camera on initial centre of mass: no jitter or trailing drift.
      bodies.forEach((body, i) => {
        const point = project(body, width, height);
        trails[i].push({
          ...point,
          hue: (getSettings().startingHue + i * 120) % 360,
          time,
          sequence,
        });
      });
      sequence++;
    },
    renderForeground(context, width, height) {
      const glow = getRuntimeSettings().glow;
      context.save();
      bodies.forEach((body, i) => {
        const point = project(body, width, height);
        const hue = (getSettings().startingHue + i * 120) % 360;
        const radius = 4 + 2 * Math.sqrt(body.mass);
        context.beginPath();
        context.fillStyle = `hsl(${hue} 95% 72%)`;
        context.shadowColor = `hsl(${hue} 95% 65%)`;
        context.shadowBlur = Math.max(0, glow) * 0.2;
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fill();
      });
      context.restore();
    },
  };
}
