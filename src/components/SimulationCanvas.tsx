import { useEffect, useRef } from "react";
import type { ControlSettings } from "../types/settings";
import { TrailBuffer } from "../engine/TrailBuffer";
import { integrateRK4 } from "../simulations/doublePendulum/physics";
import { createCanvasViewport } from "../engine/CanvasViewport";
import type { DoublePendulumState } from "../simulations/doublePendulum/physics";
import { renderTrail } from "../engine/trailRenderer";

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

    let state: DoublePendulumState = {
      theta1: settingsRef.current.initialAngle1,

      theta2: settingsRef.current.initialAngle2,

      omega1: settingsRef.current.initialOmega1,

      omega2: settingsRef.current.initialOmega2,
    };

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

    let hue = settingsRef.current.startingHue;

    let trailSequence = 0;
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
     * These states do not change inside the corresponding draw loops,
     * so establish them once rather than using save()/restore() for
     * every trail chunk.
     */
    trailContext.lineCap = "round";
    trailContext.lineJoin = "round";

    context.lineCap = "round";
    context.lineJoin = "round";

    const viewportController = createCanvasViewport({
      canvas,
      trailCanvas,
      onResize: ({ dpr }) => {
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        trailContext.setTransform(dpr, 0, 0, dpr, 0, 0);

        trail.clear();
        trailSampleAccumulator = TRAIL_SAMPLE_INTERVAL;
      },
    });

    /*
     * --------------------------------------------------------------
     * Reset / randomisation
     * --------------------------------------------------------------
     */

    const reset = (): void => {
      const currentSettings = settingsRef.current;

      state = {
        theta1: currentSettings.initialAngle1,

        theta2: currentSettings.initialAngle2,

        omega1: currentSettings.initialOmega1,

        omega2: currentSettings.initialOmega2,
      };

      hue = currentSettings.startingHue;

      trailSequence = 0;

      trail.clear();

      trailSampleAccumulator = TRAIL_SAMPLE_INTERVAL;

      const { width, height } = viewportController.viewport;

      trailContext.clearRect(0, 0, width, height);

      accumulator = 0;

      previousTime = performance.now();
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
      const { width, height } = viewportController.viewport;

      const x0 = width * 0.5;

      const y0 = height * 0.5;

      const scale = Math.min(width, height) * 0.14;

      const x1 = x0 + Math.sin(state.theta1) * l1 * scale;

      const y1 = y0 + Math.cos(state.theta1) * l1 * scale;

      const x2 = x1 + Math.sin(state.theta2) * l2 * scale;

      const y2 = y1 + Math.cos(state.theta2) * l2 * scale;

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
     * Foreground rendering
     * --------------------------------------------------------------
     */

    const drawPendulum = (currentPosition: typeof position): void => {
      const { m1, m2 } = settingsRef.current;
      const { width, height } = viewportController.viewport;
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

      const parameters = {
        m1: currentSettings.m1,
        m2: currentSettings.m2,
        l1: currentSettings.l1,
        l2: currentSettings.l2,
        gravity: currentSettings.gravity,
      };

      while (accumulator >= timestep && safety < 40) {
        state = integrateRK4(state, parameters, timestep);

        accumulator -= timestep;

        safety += 1;
      }

      if (
        !Number.isFinite(state.theta1) ||
        !Number.isFinite(state.theta2) ||
        !Number.isFinite(state.omega1) ||
        !Number.isFinite(state.omega2)
      ) {
        console.error(
          "Double-pendulum integration produced a non-finite state.",
        );

        reset();
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

      const { width, height } = viewportController.viewport;

      renderTrail({
        context: trailContext,
        trail,
        now: time,
        settings: {
          palette: currentSettings.palette,
          trailLifetime: currentSettings.trailLifetime,
          glow: currentSettings.glow,
          width,
          height,
        },
      });

      drawPendulum(currentPosition);

      animationFrame = requestAnimationFrame(frame);
    };

    /*
     * --------------------------------------------------------------
     * Events
     * --------------------------------------------------------------
     */

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

    document.addEventListener("visibilitychange", handleVisibilityChange);

    animationFrame = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animationFrame);
      viewportController.destroy();
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
