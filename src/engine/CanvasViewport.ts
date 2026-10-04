/**
 * Manages the CSS-pixel viewport and high-DPI backing-store size for a
 * pair of layered canvases.
 *
 * The simulation can continue to render using CSS-pixel coordinates while
 * this class keeps the actual Canvas backing stores scaled for the display.
 */
export interface CanvasViewport {
  width: number;
  height: number;
  dpr: number;
}

interface CanvasViewportOptions {
  canvas: HTMLCanvasElement;
  trailCanvas: HTMLCanvasElement;
  onResize?: (viewport: CanvasViewport) => void;
}

/**
 * Create a viewport controller for the simulation canvases.
 */
export function createCanvasViewport({
  canvas,
  trailCanvas,
  onResize,
}: CanvasViewportOptions): {
  viewport: CanvasViewport;
  resize: () => void;
  destroy: () => void;
} {
  let viewport: CanvasViewport = {
    width: 1,
    height: 1,
    dpr: 1,
  };

  const resize = (): void => {
    const rect = canvas.getBoundingClientRect();

    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);

    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));

    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));

    canvas.width = pixelWidth;
    canvas.height = pixelHeight;

    trailCanvas.width = pixelWidth;
    trailCanvas.height = pixelHeight;

    viewport = {
      width,
      height,
      dpr,
    };

    onResize?.(viewport);
  };

  const handleResize = (): void => {
    resize();
  };

  window.addEventListener("resize", handleResize);

  resize();

  return {
    get viewport() {
      return viewport;
    },
    resize,
    destroy: () => {
      window.removeEventListener("resize", handleResize);
    },
  };
}

export interface CanvasViewportController {
  readonly viewport: CanvasViewport;
  resize(): void;
  destroy(): void;
}
