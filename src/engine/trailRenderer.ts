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
const CORE_CHUNK_SIZE = 32;

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
  let glowStart = 0;

  while (glowStart < trail.length - 1) {
    const glowFirst = trail.getUnchecked(glowStart);

    const bucket = Math.floor(glowFirst.sequence / GLOW_CHUNK_SIZE);

    let glowEnd = glowStart + 1;

    while (
      glowEnd < trail.length - 1 &&
      Math.floor(trail.getUnchecked(glowEnd).sequence / GLOW_CHUNK_SIZE) ===
        bucket
    ) {
      glowEnd += 1;
    }

    const midpointIndex = Math.floor((glowStart + glowEnd) / 2);
    const midpoint = trail.getUnchecked(midpointIndex);

    const brightness = getBrightness(midpoint.time);
    const widthFactor = getWidthFactor(midpoint.time);

    const glowHue =
      palette === "solid" ? 195 : palette === "gradient" ? 240 : midpoint.hue;

    if (brightness > 0 && widthFactor > 0 && glowStrength > 0) {
      const broadWidth = Math.max(1.5, (6 + 34 * glowStrength) * widthFactor);

      const broadOpacity = 0.025 * glowStrength * brightness;

      const innerWidth = Math.max(1.2, (2.5 + 10 * glowStrength) * widthFactor);

      const innerOpacity = 0.075 * glowStrength * brightness;

      context.strokeStyle = `hsla(${glowHue} 100% 60% / ${broadOpacity})`;
      context.lineWidth = broadWidth;

      drawChunk(context, trail, glowStart, glowEnd);

      context.strokeStyle = `hsla(${glowHue} 100% 68% / ${innerOpacity})`;
      context.lineWidth = innerWidth;

      drawChunk(context, trail, glowStart, glowEnd);
    }

    glowStart = glowEnd;
  }
}

function renderCore(
  context: CanvasRenderingContext2D,
  trail: TrailBuffer,
  palette: TrailPalette,
  glowStrength: number,
  getBrightness: (time: number) => number,
): void {
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

    const gradient = context.createLinearGradient(
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

      gradient.addColorStop(
        clamp(localPosition, 0, 1),
        getTrailColour(palette, point, localPosition, brightness),
      );
    }

    context.strokeStyle = gradient;
    context.lineWidth = 1.2 + 0.35 * glowStrength;

    drawChunk(context, trail, coreStart, coreEnd);

    coreStart = coreEnd;
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
  localPosition: number,
  brightness: number,
): string {
  switch (palette) {
    case "neon-rainbow":
      return `hsla(${point.hue} 100% 72% / ${0.82 * brightness})`;

    case "rainbow":
      return `hsla(${point.hue} 85% 58% / ${0.9 * brightness})`;

    case "gradient": {
      const startHue = 195;
      const endHue = 285;

      const gradientHue = startHue + (endHue - startHue) * localPosition;

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
