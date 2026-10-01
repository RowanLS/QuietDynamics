import type { Palette } from "../../types/simulation";
import type {
  DoublePendulumParameters,
  DoublePendulumState,
} from "./simulation";

export interface PendulumPosition {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Converts pendulum angles into screen coordinates.
 *
 * All coordinates are expressed in the canvas backing-buffer
 * coordinate system. This avoids mixing CSS pixels and device pixels.
 */
export function getPositions(
  canvas: HTMLCanvasElement,
  state: DoublePendulumState,
  parameters: DoublePendulumParameters,
): PendulumPosition {
  const width = canvas.width;
  const height = canvas.height;

  const scale = Math.min(width, height) * 0.115;

  const x0 = width * 0.5;
  const y0 = height * 0.5;

  const x1 =
    x0 +
    Math.sin(state.theta1) *
      currentParameters.l1 *
      scale;

  const y1 =
    y0 +
    Math.cos(state.theta1) *
      currentParameters.l1 *
      scale;

  const x2 =
    x1 +
    Math.sin(state.theta2) *
      currentParameters.l2 *
      scale;

  const y2 =
    y1 +
    Math.cos(state.theta2) *
      currentParameters.l2 *
      scale;

  return {
    x0,
    y0,
    x1,
    y1,
    x2,
    y2,
  };
}

/**
 * Render one frame of the double pendulum.
 */
export function renderDoublePendulum(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  state: DoublePendulumState,
  parameters: DoublePendulumParameters,
  palette: Palette,
): void {
  const width = canvas.width;
  const height = canvas.height;

  context.fillStyle = palette.background;
  context.fillRect(0, 0, width, height);

  const position = getPositions(
    canvas,
    state,
    parameters,
  );

  const [colour1, colour2] = palette.colours;

  context.lineCap = "round";
  context.lineJoin = "round";

  context.strokeStyle = "rgba(235, 242, 248, 0.64)";
  context.lineWidth = 1.4;

  context.beginPath();
  context.moveTo(position.x0, position.y0);
  context.lineTo(position.x1, position.y1);
  context.lineTo(position.x2, position.y2);
  context.stroke();

  context.fillStyle = colour1;
  context.beginPath();
  context.arc(
    position.x1,
    position.y1,
    8 + currentParameters.m1,
    0,
    Math.PI * 2,
  );
  context.fill();

  context.fillStyle = colour2;
  context.beginPath();
  context.arc(
    position.x2,
    position.y2,
    9 + currentParameters.m2,
    0,
    Math.PI * 2,
  );
  context.fill();

  context.fillStyle = "rgba(255,255,255,0.84)";
  context.beginPath();
  context.arc(
    position.x0,
    position.y0,
    3,
    0,
    Math.PI * 2,
  );
  context.fill();
}
