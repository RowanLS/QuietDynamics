import { useEffect, useRef } from "react";
import type { ControlSettings } from "../types/settings";
import { createCanvasViewport } from "../engine/CanvasViewport";
import { renderTrail } from "../engine/trailRenderer";
import { createDoublePendulumSimulation } from "../simulations/doublePendulum/DoublePendulumSimulation";

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

    const simulation = createDoublePendulumSimulation(
      () => settingsRef.current,
    );

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

      const currentSettings = settingsRef.current;

      if (resetVersionRef.current !== handledResetVersion) {
        handledResetVersion = resetVersionRef.current;

        simulation.reset();
        clearTrailCanvas();
      }

      if (currentSettings.paused) {
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
          palette: currentSettings.palette,
          trailLifetime: currentSettings.trailLifetime,
          glow: currentSettings.glow,
          width: viewportController.viewport.width,
          height: viewportController.viewport.height,
        },
      });

      simulation.renderForeground(
        context,
        viewportController.viewport.width,
        viewportController.viewport.height,
      );

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
