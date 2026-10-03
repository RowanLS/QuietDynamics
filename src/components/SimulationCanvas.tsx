import { useEffect, useRef } from "react";
import type { ControlSettings } from "../types/settings";

import {
  mulberry32,
  createSeed,
} from "../simulations/doublePendulum/randomise";

/**
 * One recorded point of the second bob's trajectory.
 */
interface TrailPoint {
  x: number;
  y: number;
  hue: number;
  time: number;
  /** Monotically increasing sample number to keep chunks spatially stable. */
  sequence: number;
}

/**
 * Fixed-capacity circular buffer ordered from oldest to newest.
 *
 * Expired points can be removed from the front in O(number expired),
 * without scanning the entire buffer.
 */
class TrailBuffer {
  private readonly points: Array<TrailPoint | undefined>;
  private readonly capacity: number;

  private start = 0;
  private count = 0;

  constructor(capacity: number) {
    this.capacity = capacity;

    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error("TrailBuffer capacity must be a positive integer.");
    }

    this.points = new Array(capacity);
  }

  clear(): void {
    this.start = 0;
    this.count = 0;
  }

  push(point: TrailPoint): void {
    const index = (this.start + this.count) % this.capacity;

    this.points[index] = point;

    if (this.count < this.capacity) {
      this.count += 1;
      return;
    }

    // Buffer is full: overwrite the oldest point.
    this.start = (this.start + 1) % this.capacity;
  }

  /**
   * Remove all points older than the supplied timestamp.
   */
  discardBefore(timestamp: number): void {
    while (this.count > 0) {
      const point = this.points[this.start];

      if (!point || point.time >= timestamp) {
        break;
      }

      this.points[this.start] = undefined;

      this.start = (this.start + 1) % this.capacity;

      this.count -= 1;
    }
  }

  get length(): number {
    return this.count;
  }

  /**
   * Checked accessor for non-hot call sites.
   */
  get(index: number): TrailPoint {
    if (index < 0 || index >= this.count) {
      throw new RangeError(`Trail index ${index} is out of range.`);
    }

    return this.getUnchecked(index);
  }

  /**
   * Hot-path accessor.
   *
   * The renderer only calls this with indices known to be in range,
   * so avoid repeated bounds/error checks in the animation loop.
   */
  getUnchecked(index: number): TrailPoint {
    const point = this.points[(this.start + index) % this.capacity];

    // This should be impossible while the buffer invariants hold.
    if (!point) {
      throw new Error("TrailBuffer contained an unexpected empty point.");
    }

    return point;
  }
}

/**
 * Clamp a number to a range.
 */
function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Animated double-pendulum canvas.
 *
 * React owns the component lifecycle, but simulation/rendering state is
 * kept outside React state so the animation loop does not trigger React
 * re-renders.
 */
interface SimulationCanvasProps {
  settings: ControlSettings;
  resetVersion: number;
}

export function SimulationCanvas({
  settings,
  resetVersion,
}: SimulationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const trailCanvasRef = useRef<HTMLCanvasElement>(null);

  const settingsRef = useRef(settings);

  const resetVersionRef = useRef(resetVersion);

  const wasPausedRef = useRef(false);

  useEffect(() => {
    settingsRef.current = settings;
    resetVersionRef.current = resetVersion;
  }, [settings, resetVersion]);

  useEffect(() => {
    const canvas = canvasRef.current;

    const trailCanvas = trailCanvasRef.current;

    if (!canvas || !trailCanvas) {
      console.error("Could not create simulation canvases.");
      return;
    }

    const context = canvas.getContext("2d");

    const trailContext = trailCanvas.getContext("2d");

    let handledResetVersion = resetVersionRef.current;

    if (!context || !trailContext) {
      console.error("2D canvas rendering is unavailable.");
      return;
    }

    /*
     * --------------------------------------------------------------
     * Simulation state
     * --------------------------------------------------------------
     */

    let theta1 = 2.6;
    let theta2 = -0.9;
    let omega1 = 0;
    let omega2 = 0;

    const random = mulberry32(createSeed());

    /*
     * --------------------------------------------------------------
     * Trail configuration
     * --------------------------------------------------------------
     *
     * The trail is sampled at a fixed maximum rate instead of once per
     * rendered frame. This makes point density independent of monitor
     * refresh rate and prevents 144/240 Hz displays from multiplying
     * trail-processing work.
     */
    const TRAIL_SAMPLE_RATE = 120;
    const TRAIL_SAMPLE_INTERVAL = 1000 / TRAIL_SAMPLE_RATE;

    const MAX_TRAIL_LIFETIME_SECONDS = 40;
    const TRAIL_CAPACITY =
      Math.ceil(MAX_TRAIL_LIFETIME_SECONDS * TRAIL_SAMPLE_RATE) + 2;

    const trail = new TrailBuffer(TRAIL_CAPACITY);

    let trailSampleAccumulator = TRAIL_SAMPLE_INTERVAL;

    let hue = random() * 360;

    let trailSequence = 0;
    /*
     * Larger chunks keep the glow cheap while the shorter core chunks
     * preserve the detailed rainbow transition.
     */
    const GLOW_CHUNK_SIZE = 64;
    const CORE_CHUNK_SIZE = 32;

    /*
     * --------------------------------------------------------------
     * Animation timing
     * --------------------------------------------------------------
     */

    const timestep = 1 / 120;

    let previousTime = performance.now();

    let accumulator = 0;
    let animationFrame = 0;
    let hidden = document.hidden;

    /*
     * --------------------------------------------------------------
     * Canvas dimensions
     * --------------------------------------------------------------
     */

    let width = 1;
    let height = 1;
    let dpr = 1;

    /*
     * These states do not change inside the corresponding draw loops,
     * so establish them once rather than using save()/restore() for
     * every trail chunk.
     */
    trailContext.lineCap = "round";
    trailContext.lineJoin = "round";

    context.lineCap = "round";
    context.lineJoin = "round";

    const resize = (): void => {
      const rect = canvas.getBoundingClientRect();

      width = Math.max(1, rect.width);

      height = Math.max(1, rect.height);

      dpr = clamp(window.devicePixelRatio || 1, 1, 2);

      const pixelWidth = Math.max(1, Math.round(width * dpr));

      const pixelHeight = Math.max(1, Math.round(height * dpr));

      canvas.width = pixelWidth;
      canvas.height = pixelHeight;

      trailCanvas.width = pixelWidth;
      trailCanvas.height = pixelHeight;

      /*
       * Use CSS-pixel coordinates for both canvases.
       */
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      trailContext.setTransform(dpr, 0, 0, dpr, 0, 0);

      trail.clear();
      trailSampleAccumulator = TRAIL_SAMPLE_INTERVAL;

      trailContext.clearRect(0, 0, width, height);
    };

    /*
     * --------------------------------------------------------------
     * Reset / randomisation
     * --------------------------------------------------------------
     */

    const reset = (): void => {
      const currentSettings = settingsRef.current;

      theta1 = currentSettings.initialAngle1;

      theta2 = currentSettings.initialAngle2;

      omega1 = currentSettings.initialOmega1;

      omega2 = currentSettings.initialOmega2;

      hue = currentSettings.startingHue;

      trailSequence = 0;

      trail.clear();

      trailSampleAccumulator = TRAIL_SAMPLE_INTERVAL;

      trailContext.clearRect(0, 0, width, height);

      accumulator = 0;

      previousTime = performance.now();
    };

    /*
     * --------------------------------------------------------------
     * Double-pendulum equations
     * --------------------------------------------------------------
     *
     * This version avoids allocating a derivative object four times
     * for every RK4 step. All intermediate derivatives stay in scalar
     * locals, which reduces garbage collection pressure in the hot loop.
     */

    const integrate = (dt: number): void => {
      const { m1, m2, l1, l2, gravity: g } = settingsRef.current;

      /* k1 */
      let delta = theta1 - theta2;

      let sinDelta = Math.sin(delta);
      let cosDelta = Math.cos(delta);

      let denominator = 2 * m1 + m2 - m2 * Math.cos(2 * delta);

      const k1t1 = omega1;
      const k1t2 = omega2;

      const k1w1 =
        (-g * (2 * m1 + m2) * Math.sin(theta1) -
          m2 * g * Math.sin(theta1 - 2 * theta2) -
          2 *
            sinDelta *
            m2 *
            (omega2 * omega2 * l2 + omega1 * omega1 * l1 * cosDelta)) /
        (l1 * denominator);

      const k1w2 =
        (2 *
          sinDelta *
          (omega1 * omega1 * l1 * (m1 + m2) +
            g * (m1 + m2) * Math.cos(theta1) +
            omega2 * omega2 * l2 * m2 * cosDelta)) /
        (l2 * denominator);

      /* k2 */
      const theta1K2 = theta1 + k1t1 * dt * 0.5;
      const theta2K2 = theta2 + k1t2 * dt * 0.5;
      const omega1K2 = omega1 + k1w1 * dt * 0.5;
      const omega2K2 = omega2 + k1w2 * dt * 0.5;

      delta = theta1K2 - theta2K2;
      sinDelta = Math.sin(delta);
      cosDelta = Math.cos(delta);

      denominator = 2 * m1 + m2 - m2 * Math.cos(2 * delta);

      const k2t1 = omega1K2;
      const k2t2 = omega2K2;

      const k2w1 =
        (-g * (2 * m1 + m2) * Math.sin(theta1K2) -
          m2 * g * Math.sin(theta1K2 - 2 * theta2K2) -
          2 *
            sinDelta *
            m2 *
            (omega2K2 * omega2K2 * l2 + omega1K2 * omega1K2 * l1 * cosDelta)) /
        (l1 * denominator);

      const k2w2 =
        (2 *
          sinDelta *
          (omega1K2 * omega1K2 * l1 * (m1 + m2) +
            g * (m1 + m2) * Math.cos(theta1K2) +
            omega2K2 * omega2K2 * l2 * m2 * cosDelta)) /
        (l2 * denominator);

      /* k3 */
      const theta1K3 = theta1 + k2t1 * dt * 0.5;
      const theta2K3 = theta2 + k2t2 * dt * 0.5;
      const omega1K3 = omega1 + k2w1 * dt * 0.5;
      const omega2K3 = omega2 + k2w2 * dt * 0.5;

      delta = theta1K3 - theta2K3;
      sinDelta = Math.sin(delta);
      cosDelta = Math.cos(delta);

      denominator = 2 * m1 + m2 - m2 * Math.cos(2 * delta);

      const k3t1 = omega1K3;
      const k3t2 = omega2K3;

      const k3w1 =
        (-g * (2 * m1 + m2) * Math.sin(theta1K3) -
          m2 * g * Math.sin(theta1K3 - 2 * theta2K3) -
          2 *
            sinDelta *
            m2 *
            (omega2K3 * omega2K3 * l2 + omega1K3 * omega1K3 * l1 * cosDelta)) /
        (l1 * denominator);

      const k3w2 =
        (2 *
          sinDelta *
          (omega1K3 * omega1K3 * l1 * (m1 + m2) +
            g * (m1 + m2) * Math.cos(theta1K3) +
            omega2K3 * omega2K3 * l2 * m2 * cosDelta)) /
        (l2 * denominator);

      /* k4 */
      const theta1K4 = theta1 + k3t1 * dt;
      const theta2K4 = theta2 + k3t2 * dt;
      const omega1K4 = omega1 + k3w1 * dt;
      const omega2K4 = omega2 + k3w2 * dt;

      delta = theta1K4 - theta2K4;
      sinDelta = Math.sin(delta);
      cosDelta = Math.cos(delta);

      denominator = 2 * m1 + m2 - m2 * Math.cos(2 * delta);

      const k4t1 = omega1K4;
      const k4t2 = omega2K4;

      const k4w1 =
        (-g * (2 * m1 + m2) * Math.sin(theta1K4) -
          m2 * g * Math.sin(theta1K4 - 2 * theta2K4) -
          2 *
            sinDelta *
            m2 *
            (omega2K4 * omega2K4 * l2 + omega1K4 * omega1K4 * l1 * cosDelta)) /
        (l1 * denominator);

      const k4w2 =
        (2 *
          sinDelta *
          (omega1K4 * omega1K4 * l1 * (m1 + m2) +
            g * (m1 + m2) * Math.cos(theta1K4) +
            omega2K4 * omega2K4 * l2 * m2 * cosDelta)) /
        (l2 * denominator);

      theta1 += (dt * (k1t1 + 2 * k2t1 + 2 * k3t1 + k4t1)) / 6;

      theta2 += (dt * (k1t2 + 2 * k2t2 + 2 * k3t2 + k4t2)) / 6;

      omega1 += (dt * (k1w1 + 2 * k2w1 + 2 * k3w1 + k4w1)) / 6;

      omega2 += (dt * (k1w2 + 2 * k2w2 + 2 * k3w2 + k4w2)) / 6;

      /*
       * Recover from an unexpected numerical failure rather than
       * allowing NaNs to propagate into the Canvas renderer.
       */
      if (
        !Number.isFinite(theta1) ||
        !Number.isFinite(theta2) ||
        !Number.isFinite(omega1) ||
        !Number.isFinite(omega2)
      ) {
        reset();
      }
    };

    /*
     * --------------------------------------------------------------
     * Geometry
     * --------------------------------------------------------------
     */

    const position = {
      x0: 0,
      y0: 0,
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
    };

    /**
     * Update and return the reusable pendulum position object.
     */
    const updatePositions = () => {
      const { l1, l2 } = settingsRef.current;
      const x0 = width * 0.5;

      const y0 = height * 0.5;

      const scale = Math.min(width, height) * 0.14;

      const x1 = x0 + Math.sin(theta1) * l1 * scale;

      const y1 = y0 + Math.cos(theta1) * l1 * scale;

      const x2 = x1 + Math.sin(theta2) * l2 * scale;

      const y2 = y1 + Math.cos(theta2) * l2 * scale;

      position.x0 = x0;
      position.y0 = y0;
      position.x1 = x1;
      position.y1 = y1;
      position.x2 = x2;
      position.y2 = y2;

      return position;
    };

    /*
     * --------------------------------------------------------------
     * Trail rendering
     * --------------------------------------------------------------
     */

    const drawTrail = (now: number): void => {
      const currentSettings = settingsRef.current;
      const palette = currentSettings.palette;

      const trailLifetimeMs = Math.max(1, currentSettings.trailLifetime * 1000);

      const cutoff = now - trailLifetimeMs;

      trail.discardBefore(cutoff);

      trailContext.clearRect(0, 0, width, height);

      if (trail.length < 2) {
        return;
      }

      const glowAmount = clamp(currentSettings.glow / 200, 0, 1);

      const glowStrength =
        palette == "rainbow"
          ? Math.pow(glowAmount, 0.8) * 0.25
          : Math.pow(glowAmount, 0.8);

      const inverseLifetime = 1 / trailLifetimeMs;

      /*
       * --------------------------------------------------------------
       * Age helpers
       * --------------------------------------------------------------
       */

      const getAgeFactor = (time: number): number => {
        return clamp(1 - (now - time) * inverseLifetime, 0, 1);
      };

      const getBrightness = (time: number): number => {
        const age = getAgeFactor(time);

        return age * age * age;
      };

      const getWidthFactor = (time: number): number => {
        return Math.pow(getAgeFactor(time), 0.6);
      };

      /*
       * --------------------------------------------------------------
       * Glow
       * --------------------------------------------------------------
       *
       * Chunks are anchored to TrailPoint.sequence rather than the
       * current buffer index.
       * This is important: when discardBefore() removes an old point,
       * the remaining chunks do NOT move their boundaries.
       */

      trailContext.lineCap = "round";
      trailContext.lineJoin = "round";

      let glowStart = 0;

      while (glowStart < trail.length - 1) {
        const glowFirst = trail.getUnchecked(glowStart);

        /*
         * Determine the stable chunk to which this point belongs.
         */
        const bucket = Math.floor(glowFirst.sequence / GLOW_CHUNK_SIZE);

        let glowEnd = glowStart + 1;

        /*
         * Extend until the next point belongs to a different
         * stable chunk.
         */
        while (
          glowEnd < trail.length - 1 &&
          Math.floor(trail.getUnchecked(glowEnd).sequence / GLOW_CHUNK_SIZE) ===
            bucket
        ) {
          glowEnd += 1;
        }

        /*
         * Include the point after the final segment so the stroke
         * terminates at the correct position.
         */
        /*const glowLast =
          trail.getUnchecked(glowEnd);
        */
        /*
         * Determine glow properties from the midpoint of the
         * stable chunk.
         */
        const midpointIndex = Math.floor((glowStart + glowEnd) / 2);

        const midpoint = trail.getUnchecked(midpointIndex);

        const brightness = getBrightness(midpoint.time);

        const widthFactor = getWidthFactor(midpoint.time);

        const glowHue =
          palette === "solid"
            ? 195
            : palette === "gradient"
              ? 240
              : midpoint.hue;

        if (brightness > 0 && widthFactor > 0 && glowStrength > 0) {
          const broadWidth = Math.max(
            1.5,
            (6 + 34 * glowStrength) * widthFactor,
          );

          const broadOpacity = 0.025 * glowStrength * brightness;

          const innerWidth = Math.max(
            1.2,
            (2.5 + 10 * glowStrength) * widthFactor,
          );

          const innerOpacity = 0.075 * glowStrength * brightness;

          /*
           * Broad atmospheric layer.
           */
          trailContext.strokeStyle = `hsla(${glowHue} 100% 60% / ${broadOpacity})`;

          trailContext.lineWidth = broadWidth;

          trailContext.beginPath();

          trailContext.moveTo(glowFirst.x, glowFirst.y);

          for (let i = glowStart + 1; i <= glowEnd; i += 1) {
            const point = trail.getUnchecked(i);

            trailContext.lineTo(point.x, point.y);
          }

          trailContext.stroke();

          /*
           * Inner halo.
           */
          trailContext.strokeStyle = `hsla(${glowHue} 100% 68% / ${innerOpacity})`;

          trailContext.lineWidth = innerWidth;

          trailContext.beginPath();

          trailContext.moveTo(glowFirst.x, glowFirst.y);

          for (let i = glowStart + 1; i <= glowEnd; i += 1) {
            const point = trail.getUnchecked(i);

            trailContext.lineTo(point.x, point.y);
          }

          trailContext.stroke();
        }

        /*
         * Advance to the first point belonging to the next stable
         * sequence bucket.
         */
        glowStart = glowEnd;
      }

      /*
       * --------------------------------------------------------------
       * Rainbow core
       * --------------------------------------------------------------
       *
       * Core chunks are also anchored to sequence numbers. This is less
       * important visually because the core is narrow, but it prevents
       * the colour interpolation boundaries from moving as the buffer
       * ages.
       */

      let coreStart = 0;

      while (coreStart < trail.length - 1) {
        const coreFirst = trail.getUnchecked(coreStart);

        const bucket = Math.floor(coreFirst.sequence / CORE_CHUNK_SIZE);

        let coreEnd = coreStart + 1;

        while (
          coreEnd < trail.length - 1 &&
          Math.floor(trail.getUnchecked(coreEnd).sequence / CORE_CHUNK_SIZE) ===
            bucket
        ) {
          coreEnd += 1;
        }

        const coreLast = trail.getUnchecked(coreEnd);

        const gradient = trailContext.createLinearGradient(
          coreFirst.x,
          coreFirst.y,
          coreLast.x,
          coreLast.y,
        );

        const denominator = Math.max(1, coreEnd - coreStart);

        for (let i = coreStart; i <= coreEnd; i += 1) {
          const point = trail.getUnchecked(i);

          const localPosition = (i - coreStart) / denominator;

          const brightness = getBrightness(point.time);

          let colour: string;

          switch (palette) {
            case "neon-rainbow":
              colour = `hsla(${point.hue} 100% 72% / ${0.82 * brightness})`;
              break;

            case "rainbow":
              colour = `hsla(${point.hue} 85% 58% / ${0.9 * brightness})`;
              break;

            case "gradient": {
              const startHue = 195;
              const endHue = 285;

              const gradientHue =
                startHue + (endHue - startHue) * localPosition;

              colour = `hsla(${gradientHue} 100% 72% / ${0.82 * brightness})`;

              break;
            }

            case "solid":
              colour = `hsla(195 100% 72% / ${0.82 * brightness})`;
              break;

            default: {
              const exhaustiveCheck: never = palette;

              throw new Error(`Unsupported palette: ${exhaustiveCheck}`);
            }
          }

          gradient.addColorStop(clamp(localPosition, 0, 1), colour);
        }

        trailContext.strokeStyle = gradient;

        trailContext.lineWidth = 1.2 + 0.35 * glowStrength;

        trailContext.beginPath();

        trailContext.moveTo(coreFirst.x, coreFirst.y);

        for (let i = coreStart + 1; i <= coreEnd; i += 1) {
          const point = trail.getUnchecked(i);

          trailContext.lineTo(point.x, point.y);
        }

        trailContext.stroke();

        coreStart = coreEnd;
      }
    };

    /*
     * --------------------------------------------------------------
     * Foreground rendering
     * --------------------------------------------------------------
     */

    const drawPendulum = (currentPosition: typeof position): void => {
      const { m1, m2 } = settingsRef.current;

      context.clearRect(0, 0, width, height);

      context.strokeStyle = "rgba(235, 242, 248, 0.75)";
      context.lineWidth = 1.5;

      context.beginPath();
      context.moveTo(currentPosition.x0, currentPosition.y0);
      context.lineTo(currentPosition.x1, currentPosition.y1);
      context.lineTo(currentPosition.x2, currentPosition.y2);
      context.stroke();

      context.fillStyle = "#64d9ff";
      context.beginPath();
      context.arc(
        currentPosition.x1,
        currentPosition.y1,
        8 + m1,
        0,
        Math.PI * 2,
      );
      context.fill();

      context.fillStyle = "#d18cff";
      context.beginPath();
      context.arc(
        currentPosition.x2,
        currentPosition.y2,
        9 + m2,
        0,
        Math.PI * 2,
      );
      context.fill();

      context.fillStyle = "rgba(255,255,255,0.9)";
      context.beginPath();
      context.arc(currentPosition.x0, currentPosition.y0, 3, 0, Math.PI * 2);
      context.fill();
    };

    /*
     * --------------------------------------------------------------
     * Animation loop
     * --------------------------------------------------------------
     */

    const frame = (time: number): void => {
      if (hidden) {
        return;
      }

      const elapsed = Math.min((time - previousTime) / 1000, 0.1);

      previousTime = time;

      const currentSettings = settingsRef.current;

      if (resetVersionRef.current !== handledResetVersion) {
        handledResetVersion = resetVersionRef.current;

        reset();
      }

      /*
       * When paused, leave the current Canvas contents untouched.
       *
       * Continue the requestAnimationFrame loop so that resuming does
       * not require a separate animation-loop lifecycle and there is
       * essentially no work beyond this check.
       */
      if (currentSettings.paused) {
        wasPausedRef.current = true;

        animationFrame = requestAnimationFrame(frame);

        return;
      }

      if (wasPausedRef.current) {
        /*
         * Discard time spent paused so the simulation resumes smoothly
         * rather than trying to catch up.
         */
        wasPausedRef.current = false;

        previousTime = time;
        accumulator = 0;
        trailSampleAccumulator = TRAIL_SAMPLE_INTERVAL;
      }
      accumulator += elapsed * currentSettings.simulationSpeed;

      /*
       * Bound accumulated simulation work after long frames. Without
       * this cap, a stalled frame can create a growing backlog that
       * causes repeated expensive integration in subsequent frames.
       */
      const maxAccumulatedTime = timestep * 40;

      if (accumulator > maxAccumulatedTime) {
        accumulator = maxAccumulatedTime;
      }

      let safety = 0;

      while (accumulator >= timestep && safety < 40) {
        integrate(timestep);
        accumulator -= timestep;
        safety += 1;
      }

      /*
       * If the safety limit was reached, discard the remainder rather
       * than carrying an expensive backlog into subsequent frames.
       */
      if (safety === 40) {
        accumulator = 0;
      }

      /*
       * Update geometry once per rendered frame. The returned object is
       * reused to avoid a per-frame allocation.
       */
      const currentPosition = updatePositions();

      /*
       * Sample the trail at a fixed maximum rate. This means high-refresh
       * displays do not create proportionally more trail points.
       */
      trailSampleAccumulator += elapsed * 1000;

      if (trailSampleAccumulator >= TRAIL_SAMPLE_INTERVAL) {
        /*
         * Record at most one point per rendered frame. If a frame is
         * delayed, do not insert several identical positions just to
         * catch up with the sampling clock.
         */
        trailSampleAccumulator %= TRAIL_SAMPLE_INTERVAL;

        trail.push({
          x: currentPosition.x2,
          y: currentPosition.y2,
          hue,
          time,
          sequence: trailSequence++,
        });
      }

      /*
       * Preserve the existing rainbow-speed behaviour: hue advances once
       * per rendered frame rather than once per physics step.
       */
      hue = (hue + 0.75 * currentSettings.rainbowSpeed) % 360;

      drawTrail(time);
      drawPendulum(currentPosition);

      animationFrame = requestAnimationFrame(frame);
    };

    /*
     * --------------------------------------------------------------
     * Events
     * --------------------------------------------------------------
     */

    const handleResize = (): void => {
      resize();
    };

    const handleVisibilityChange = (): void => {
      hidden = document.hidden;

      if (hidden) {
        cancelAnimationFrame(animationFrame);
        return;
      }

      previousTime = performance.now();
      accumulator = 0;
      trailSampleAccumulator = TRAIL_SAMPLE_INTERVAL;

      animationFrame = requestAnimationFrame(frame);
    };

    resize();

    window.addEventListener("resize", handleResize);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    animationFrame = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animationFrame);

      window.removeEventListener("resize", handleResize);

      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <div className="canvas-container">
      <canvas
        ref={trailCanvasRef}
        className="canvas canvas-trail"
        aria-hidden="true"
      />

      <canvas
        ref={canvasRef}
        className="canvas canvas-foreground"
        aria-label="Animated double pendulum"
      />
    </div>
  );
}
