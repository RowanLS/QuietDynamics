import { useEffect, useRef } from "react";
import { createCanvasViewport } from "../engine/CanvasViewport";
import { renderTrail } from "../engine/trailRenderer";
import type {
  Simulation,
  SimulationRuntimeSettings,
} from "../types/simulation";

/**
 * Shared Canvas host for mathematical simulations.
 *
 * React owns the component lifecycle and runtime configuration, while
 * simulation and rendering state remain outside React state so the animation
 * loop does not trigger React re-renders.
 *
 * Persistent trajectory history is rendered on the trail canvas. The
 * foreground canvas is cleared every frame and contains only the simulation's
 * current geometry.
 */
interface SimulationCanvasProps {
  runtimeSettings: SimulationRuntimeSettings;
  resetVersion: number;

  createSimulation: (
    getRuntimeSettings: () => SimulationRuntimeSettings,
  ) => Simulation;
}

export function SimulationCanvas({
  runtimeSettings,
  resetVersion,
  createSimulation,
}: SimulationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const trailCanvasRef = useRef<HTMLCanvasElement>(null);

  const runtimeSettingsRef = useRef(runtimeSettings);

  const resetVersionRef = useRef(resetVersion);

  const wasPausedRef = useRef(false);

  useEffect(() => {
    runtimeSettingsRef.current = runtimeSettings;
    resetVersionRef.current = resetVersion;
  }, [runtimeSettings, resetVersion]);

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

    const getRuntimeSettings = (): SimulationRuntimeSettings =>
      runtimeSettingsRef.current;

    const simulation = createSimulation(getRuntimeSettings);

    /*
     * --------------------------------------------------------------
     * Animation timing
     * --------------------------------------------------------------
     */

    let previousTime = performance.now();

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

        simulation.reset();
      },
    });

    const clearForegroundCanvas = (): void => {
      const { width, height } = viewportController.viewport;

      context.clearRect(0, 0, width, height);
    };

    const clearTrailCanvas = (): void => {
      const { width, height } = viewportController.viewport;

      trailContext.clearRect(0, 0, width, height);
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

      const elapsed = Math.max(0, Math.min((time - previousTime) / 1000, 0.1));
      previousTime = time;

      const currentRuntimeSettings = runtimeSettingsRef.current;

      if (resetVersionRef.current !== handledResetVersion) {
        handledResetVersion = resetVersionRef.current;

        simulation.reset();
        clearTrailCanvas();
        clearForegroundCanvas();
      }

      if (currentRuntimeSettings.paused) {
        wasPausedRef.current = true;

        animationFrame = requestAnimationFrame(frame);

        return;
      }

      if (wasPausedRef.current) {
        wasPausedRef.current = false;
        previousTime = time;
      }

      const { width, height } = viewportController.viewport;

      simulation.update(elapsed, time, width, height);

      renderTrail({
        context: trailContext,
        trail: simulation.getTrail(),
        now: time,
        settings: {
          palette: currentRuntimeSettings.palette,
          trailLifetime: currentRuntimeSettings.trailLifetime,
          glow: currentRuntimeSettings.glow,
          width,
          height,
        },
      });

      /*
       * Foreground geometry represents only the simulation's current state.
       * Clear the previous frame before drawing the new one.
       *
       * Persistent trajectory history belongs exclusively to the trail canvas.
       */
      context.clearRect(0, 0, width, height);

      simulation.renderForeground(context, width, height);

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
      simulation.resetTiming();
      clearTrailCanvas();

      animationFrame = requestAnimationFrame(frame);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    animationFrame = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animationFrame);
      viewportController.destroy();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [createSimulation]);

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
        aria-label="Animated mathematical simulation"
      />
    </div>
  );
}
