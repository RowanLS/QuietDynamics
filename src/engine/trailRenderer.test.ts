import { describe, expect, it, vi } from "vitest";

import { TrailBuffer, type TrailPoint } from "./TrailBuffer";
import { renderTrail, type TrailPalette } from "./trailRenderer";

function createMockContext(): CanvasRenderingContext2D {
  const context = {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    lineCap: "butt",
    lineJoin: "miter",
    strokeStyle: "",
    lineWidth: 1,
  };

  return context as unknown as CanvasRenderingContext2D;
}

function createTrail(capacity = 16): TrailBuffer {
  return new TrailBuffer(capacity);
}

function addPoint(
  trail: TrailBuffer,
  overrides: Partial<TrailPoint> = {},
): void {
  trail.push({
    x: 100,
    y: 100,
    time: 1_000,
    hue: 180,
    sequence: 0,
    ...overrides,
  });
}

function render(
  context: CanvasRenderingContext2D,
  trail: TrailBuffer,
  overrides: Partial<{
    palette: TrailPalette;
    trailLifetime: number;
    glow: number;
    width: number;
    height: number;
  }> = {},
): void {
  renderTrail({
    context,
    trail,
    now: 2_000,
    settings: {
      palette: "neon-rainbow",
      trailLifetime: 10,
      glow: 100,
      width: 800,
      height: 600,
      ...overrides,
    },
  });
}

describe("renderTrail", () => {
  it("clears the canvas before rendering", () => {
    const context = createMockContext();
    const trail = createTrail();

    render(context, trail);

    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
  });

  it("does not stroke a trail with fewer than two points", () => {
    const context = createMockContext();
    const trail = createTrail();

    addPoint(trail);

    render(context, trail);

    expect(context.beginPath).not.toHaveBeenCalled();
    expect(context.stroke).not.toHaveBeenCalled();
  });

  it("renders a two-point trail", () => {
    const context = createMockContext();
    const trail = createTrail();

    addPoint(trail, {
      x: 10,
      y: 20,
      time: 1_500,
      hue: 100,
      sequence: 0,
    });

    addPoint(trail, {
      x: 30,
      y: 40,
      time: 1_900,
      hue: 120,
      sequence: 1,
    });

    render(context, trail);

    expect(context.beginPath).toHaveBeenCalled();
    expect(context.moveTo).toHaveBeenCalledWith(10, 20);
    expect(context.lineTo).toHaveBeenCalledWith(30, 40);
    expect(context.stroke).toHaveBeenCalled();
  });

  it("removes points older than the configured trail lifetime", () => {
    const context = createMockContext();
    const trail = createTrail();

    addPoint(trail, {
      x: 10,
      y: 20,
      time: 500,
      sequence: 0,
    });

    addPoint(trail, {
      x: 30,
      y: 40,
      time: 1_900,
      sequence: 1,
    });

    render(context, trail, {
      trailLifetime: 1,
    });

    expect(trail.length).toBe(1);
    expect(context.stroke).not.toHaveBeenCalled();
  });

  it("renders points that remain inside the lifetime window", () => {
    const context = createMockContext();
    const trail = createTrail();

    addPoint(trail, {
      x: 10,
      y: 20,
      time: 1_500,
      sequence: 0,
    });

    addPoint(trail, {
      x: 30,
      y: 40,
      time: 1_900,
      sequence: 1,
    });

    render(context, trail, {
      trailLifetime: 1,
    });

    expect(trail.length).toBe(2);
    expect(context.stroke).toHaveBeenCalled();
  });

  it.each<TrailPalette>(["neon-rainbow", "rainbow", "gradient", "solid"])(
    "supports the %s palette",
    (palette) => {
      const context = createMockContext();
      const trail = createTrail();

      addPoint(trail, {
        x: 10,
        y: 20,
        time: 1_500,
        hue: 100,
        sequence: 0,
      });

      addPoint(trail, {
        x: 30,
        y: 40,
        time: 1_900,
        hue: 120,
        sequence: 1,
      });

      expect(() => {
        render(context, trail, { palette });
      }).not.toThrow();

      expect(context.stroke).toHaveBeenCalled();
    },
  );

  it("creates a gradient for the core trail", () => {
    const context = createMockContext();
    const trail = createTrail();

    addPoint(trail, {
      x: 10,
      y: 20,
      time: 1_500,
      hue: 100,
      sequence: 0,
    });

    addPoint(trail, {
      x: 30,
      y: 40,
      time: 1_900,
      hue: 120,
      sequence: 1,
    });

    render(context, trail);

    expect(context.createLinearGradient).toHaveBeenCalledWith(10, 20, 30, 40);
  });

  it("configures rounded trail geometry", () => {
    const context = createMockContext();
    const trail = createTrail();

    addPoint(trail, {
      x: 10,
      y: 20,
      time: 1_500,
      sequence: 0,
    });

    addPoint(trail, {
      x: 30,
      y: 40,
      time: 1_900,
      sequence: 1,
    });

    render(context, trail);

    expect(context.lineCap).toBe("round");
    expect(context.lineJoin).toBe("round");
  });

  it("handles zero glow without throwing", () => {
    const context = createMockContext();
    const trail = createTrail();

    addPoint(trail, {
      x: 10,
      y: 20,
      time: 1_500,
      sequence: 0,
    });

    addPoint(trail, {
      x: 30,
      y: 40,
      time: 1_900,
      sequence: 1,
    });

    expect(() => {
      render(context, trail, {
        glow: 0,
      });
    }).not.toThrow();

    expect(context.stroke).toHaveBeenCalled();
  });
});
