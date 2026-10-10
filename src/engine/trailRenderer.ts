import { TrailBuffer, type TrailPoint } from "./TrailBuffer";

export type TrailPalette = "neon-rainbow" | "rainbow" | "gradient" | "solid";

export interface TrailRenderSettings {
  palette: TrailPalette;
  trailLifetime: number;
  glow: number;
  width: number;
  height: number;
}

interface TrailRenderOptions {
  context: CanvasRenderingContext2D;
  trail: TrailBuffer;
  now: number;
  settings: TrailRenderSettings;
}

const GLOW_CHUNK_SIZE = 64;

interface TrailChunk {
  start: number;
  end: number;
}

/**
 * Split a trail into stable sequence-based chunks.
 *
 * Adjacent chunks deliberately overlap by one point. This guarantees that
 * every pair of consecutive trail points is included in at least one drawn
 * path, preventing visible gaps between independently stroked chunks.
 *
 * Sequence numbers are used rather than buffer indices so chunk boundaries
 * remain stable as old points expire from the circular buffer.
 */
export function getTrailChunks(
  trail: TrailBuffer,
  chunkSize: number,
): TrailChunk[] {
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
    throw new RangeError("Trail chunk size must be a positive integer.");
  }

  if (trail.length < 2) {
    return [];
  }

  const chunks: TrailChunk[] = [];

  let start = 0;

  while (start < trail.length - 1) {
    const first = trail.getUnchecked(start);

    const bucket = Math.floor(first.sequence / chunkSize);

    let end = start + 1;

    /*
     * Find the first point belonging to the next sequence bucket.
     */
    while (end < trail.length) {
      const point = trail.getUnchecked(end);

      if (Math.floor(point.sequence / chunkSize) !== bucket) {
        break;
      }

      end += 1;
    }

    /*
     * `end` currently points at the first point of the next bucket,
     * or one past the end of the trail.
     *
     * Include that next-bucket point in this chunk so the following
     * chunk begins at exactly the same point.
     */
    const inclusiveEnd = Math.min(end, trail.length - 1);

    chunks.push({
      start,
      end: inclusiveEnd,
    });

    if (inclusiveEnd >= trail.length - 1) {
      break;
    }

    /*
     * Deliberately overlap the final point.
     */
    start = inclusiveEnd;
  }

  return chunks;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Render the currently retained simulation trail.
 *
 * The renderer deliberately knows nothing about how trail points were
 * produced. Any simulation capable of producing TrailPoint values can
 * use it.
 */
export function renderTrail({
  context,
  trail,
  now,
  settings,
}: TrailRenderOptions): void {
  const trailLifetimeMs = Math.max(1, settings.trailLifetime * 1000);

  const cutoff = now - trailLifetimeMs;

  trail.discardBefore(cutoff);

  context.clearRect(0, 0, settings.width, settings.height);

  if (trail.length < 2) {
    return;
  }

  const glowAmount = clamp(settings.glow / 200, 0, 1);

  const glowStrength =
    settings.palette === "rainbow"
      ? Math.pow(glowAmount, 0.8) * 0.25
      : Math.pow(glowAmount, 0.8);

  const inverseLifetime = 1 / trailLifetimeMs;

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

  context.lineCap = "round";
  context.lineJoin = "round";

  // Glow rendering...
  renderGlow(
    context,
    trail,
    settings.palette,
    glowStrength,
    getBrightness,
    getWidthFactor,
  );

  // Core rendering...
  renderCore(context, trail, settings.palette, glowStrength, getBrightness);
}

function renderGlow(
  context: CanvasRenderingContext2D,
  trail: TrailBuffer,
  palette: TrailPalette,
  glowStrength: number,
  getBrightness: (time: number) => number,
  getWidthFactor: (time: number) => number,
): void {
  const chunks = getTrailChunks(trail, GLOW_CHUNK_SIZE);

  for (const chunk of chunks) {
    const midpointIndex = Math.floor((chunk.start + chunk.end) / 2);

    const midpoint = trail.getUnchecked(midpointIndex);

    const brightness = getBrightness(midpoint.time);

    const widthFactor = getWidthFactor(midpoint.time);

    const glowHue =
      palette === "solid" ? 195 : palette === "gradient" ? 240 : midpoint.hue;

    if (brightness <= 0 || widthFactor <= 0 || glowStrength <= 0) {
      continue;
    }

    const broadWidth = Math.max(1.5, (6 + 34 * glowStrength) * widthFactor);

    const broadOpacity = 0.025 * glowStrength * brightness;

    const innerWidth = Math.max(1.2, (2.5 + 10 * glowStrength) * widthFactor);

    const innerOpacity = 0.075 * glowStrength * brightness;

    context.strokeStyle = `hsla(${glowHue} 100% 60% / ${broadOpacity})`;

    context.lineWidth = broadWidth;

    drawChunk(context, trail, chunk.start, chunk.end);

    context.strokeStyle = `hsla(${glowHue} 100% 68% / ${innerOpacity})`;

    context.lineWidth = innerWidth;

    drawChunk(context, trail, chunk.start, chunk.end);
  }
}

const CORE_COLOUR_BATCH_SIZE = 8;

function renderCore(
  context: CanvasRenderingContext2D,
  trail: TrailBuffer,
  palette: TrailPalette,
  glowStrength: number,
  getBrightness: (time: number) => number,
): void {
  if (trail.length < 2) {
    return;
  }

  context.lineWidth = 1.2 + 0.35 * glowStrength;

  let start = 0;

  while (start < trail.length - 1) {
    const end = Math.min(start + CORE_COLOUR_BATCH_SIZE, trail.length - 1);

    const midpointIndex = Math.floor((start + end) / 2);

    const midpoint = trail.getUnchecked(midpointIndex);

    const brightness = getBrightness(midpoint.time);

    if (brightness > 0) {
      const trailPosition =
        trail.length <= 1 ? 0 : midpointIndex / (trail.length - 1);

      context.strokeStyle = getTrailColour(
        palette,
        midpoint,
        trailPosition,
        brightness,
      );

      drawChunk(context, trail, start, end);
    }

    start = end;
  }
}

function drawChunk(
  context: CanvasRenderingContext2D,
  trail: TrailBuffer,
  start: number,
  end: number,
): void {
  const first = trail.getUnchecked(start);

  context.beginPath();
  context.moveTo(first.x, first.y);

  for (let i = start + 1; i <= end; i += 1) {
    const point = trail.getUnchecked(i);

    context.lineTo(point.x, point.y);
  }

  context.stroke();
}

function getTrailColour(
  palette: TrailPalette,
  point: TrailPoint,
  trailPosition: number,
  brightness: number,
): string {
  switch (palette) {
    case "neon-rainbow":
      return `hsla(${point.hue} 100% 72% / ${0.82 * brightness})`;

    case "rainbow":
      return `hsla(${point.hue} 85% 58% / ${0.9 * brightness})`;

    case "gradient": {
      const startHue = 285;
      const endHue = 195;

      const gradientHue = startHue + (endHue - startHue) * trailPosition;

      return `hsla(${gradientHue} 100% 72% / ${0.82 * brightness})`;
    }

    case "solid":
      return `hsla(195 100% 72% / ${0.82 * brightness})`;

    default: {
      const exhaustiveCheck: never = palette;

      throw new Error(`Unsupported palette: ${exhaustiveCheck}`);
    }
  }
}
