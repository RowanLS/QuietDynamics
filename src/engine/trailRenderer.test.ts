import { describe, expect, it, vi } from "vitest";

import { TrailBuffer, type TrailPoint } from "./TrailBuffer";
import {
  renderTrail,
  getTrailChunks,
  type TrailPalette,
} from "./trailRenderer";

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

  it("renders the core trail without a screen-space gradient", () => {
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

    render(context, trail, {
      glow: 0,
    });

    expect(context.createLinearGradient).not.toHaveBeenCalled();

    expect(context.moveTo).toHaveBeenCalledWith(10, 20);
    expect(context.lineTo).toHaveBeenCalledWith(30, 40);
    expect(context.stroke).toHaveBeenCalled();
  });

  it("overlaps core colour batches so the rendered trail remains continuous", () => {
    const context = createMockContext();
    const trail = createTrail(32);

    for (let sequence = 0; sequence < 20; sequence += 1) {
      addPoint(trail, {
        x: sequence * 10,
        y: sequence * 5,
        time: 1_500 + sequence * 10,
        hue: sequence * 10,
        sequence,
      });
    }

    render(context, trail, {
      glow: 0,
    });

    /*
     * CORE_COLOUR_BATCH_SIZE is 8, so the expected core batches are:
     *
     * 0 -> 8
     * 8 -> 16
     * 16 -> 19
     *
     * The repeated boundary coordinates demonstrate that adjacent batches
     * share their endpoint rather than leaving a missing segment.
     */
    expect(context.moveTo).toHaveBeenCalledWith(0, 0);
    expect(context.moveTo).toHaveBeenCalledWith(80, 40);
    expect(context.moveTo).toHaveBeenCalledWith(160, 80);

    expect(context.lineTo).toHaveBeenCalledWith(80, 40);
    expect(context.lineTo).toHaveBeenCalledWith(160, 80);
    expect(context.lineTo).toHaveBeenCalledWith(190, 95);
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

/**
 * Create a populated trail containing consecutive sequence numbers.
 *
 * Used by chunking tests where absolute sequence boundaries matter.
 */
function createSequentialTrail(
  startSequence: number,
  count: number,
): TrailBuffer {
  if (!Number.isInteger(startSequence) || startSequence < 0) {
    throw new RangeError("Start sequence must be a non-negative integer.");
  }

  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError("Trail point count must be a non-negative integer.");
  }

  const trail = new TrailBuffer(Math.max(1, count));

  for (let offset = 0; offset < count; offset += 1) {
    const sequence = startSequence + offset;

    trail.push({
      x: sequence,
      y: sequence,
      hue: 0,
      time: sequence,
      sequence,
    });
  }

  return trail;
}

describe("getTrailChunks", () => {
  it("returns no chunks for an empty trail", () => {
    const trail = new TrailBuffer(10);

    expect(getTrailChunks(trail, 32)).toEqual([]);
  });

  it("returns no chunks for a single point", () => {
    const trail = createSequentialTrail(0, 1);

    expect(getTrailChunks(trail, 32)).toEqual([]);
  });

  it("returns one chunk when the trail fits inside one bucket", () => {
    const trail = createSequentialTrail(0, 10);

    expect(getTrailChunks(trail, 32)).toEqual([
      {
        start: 0,
        end: 9,
      },
    ]);
  });

  it("overlaps adjacent chunks by one point", () => {
    const trail = createSequentialTrail(0, 70);

    const chunks = getTrailChunks(trail, 32);

    expect(chunks.length).toBeGreaterThan(1);

    for (let index = 1; index < chunks.length; index += 1) {
      expect(chunks[index].start).toBe(chunks[index - 1].end);
    }
  });

  it("covers the complete trail without gaps", () => {
    const trail = createSequentialTrail(0, 70);

    const chunks = getTrailChunks(trail, 32);

    expect(chunks[0].start).toBe(0);

    expect(chunks[chunks.length - 1].end).toBe(trail.length - 1);

    for (let index = 1; index < chunks.length; index += 1) {
      expect(chunks[index].start).toBe(chunks[index - 1].end);
    }
  });

  it("respects absolute sequence buckets when the retained trail starts mid-bucket", () => {
    const trail = createSequentialTrail(20, 50);

    const chunks = getTrailChunks(trail, 32);

    /*
     * Sequence 20 starts part-way through bucket 0.
     * The first boundary occurs at sequence 32.
     *
     * Buffer index:
     * sequence 20 -> 0
     * sequence 32 -> 12
     */
    expect(chunks[0]).toEqual({
      start: 0,
      end: 12,
    });

    expect(chunks[1].start).toBe(12);
  });

  it("rejects a zero chunk size", () => {
    const trail = createSequentialTrail(0, 10);

    expect(() => {
      getTrailChunks(trail, 0);
    }).toThrow(RangeError);
  });

  it("rejects a negative chunk size", () => {
    const trail = createSequentialTrail(0, 10);

    expect(() => {
      getTrailChunks(trail, -1);
    }).toThrow(RangeError);
  });

  it("rejects a non-integer chunk size", () => {
    const trail = createSequentialTrail(0, 10);

    expect(() => {
      getTrailChunks(trail, 2.5);
    }).toThrow(RangeError);
  });
});
