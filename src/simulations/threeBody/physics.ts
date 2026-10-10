/** Dimensionless Newtonian three-body dynamics with softened acceleration. */
export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
}
export type Bodies = [Body, Body, Body];
export type Family = "figure-eight" | "hierarchical" | "chaotic";

/** Initial states are curated; figure-eight constants are a known periodic orbit. */
export function initialBodies(
  family: Family,
  scale = 1,
  velocityFactor = 1,
): Bodies {
  if (
    !Number.isFinite(scale) ||
    scale <= 0 ||
    !Number.isFinite(velocityFactor) ||
    velocityFactor <= 0
  ) {
    throw new RangeError(
      "Scale and velocity factor must be finite and positive",
    );
  }
  let bodies: Bodies;
  switch (family) {
    case "figure-eight":
      bodies = [
        {
          x: -0.97000436,
          y: 0.24308753,
          vx: 0.466203685,
          vy: 0.43236573,
          mass: 1,
        },
        {
          x: 0.97000436,
          y: -0.24308753,
          vx: 0.466203685,
          vy: 0.43236573,
          mass: 1,
        },
        { x: 0, y: 0, vx: -0.93240737, vy: -0.86473146, mass: 1 },
      ];
      break;
    case "hierarchical":
      // Close equal-mass binary and a distant circumbinary companion.
      bodies = [
        { x: -0.4, y: 0, vx: 0, vy: -0.790569415, mass: 1 },
        { x: 0.4, y: 0, vx: 0, vy: 0.790569415, mass: 1 },
        { x: 0, y: 4, vx: -0.7, vy: 0, mass: 0.3 },
      ];
      break;
    case "chaotic":
      bodies = [
        { x: -1, y: -0.2, vx: 0.18, vy: 0.37, mass: 1 },
        { x: 1.1, y: 0, vx: -0.12, vy: -0.32, mass: 1.2 },
        { x: 0, y: 1.3, vx: -0.25, vy: 0.08, mass: 0.8 },
      ];
      break;
    default: {
      const neverFamily: never = family;
      throw new Error(`Unknown family: ${String(neverFamily)}`);
    }
  }
  // Similarity scaling: v scales as 1/sqrt(length) for unchanged G and mass.
  return bodies.map((body) => ({
    ...body,
    x: body.x * scale,
    y: body.y * scale,
    vx: (body.vx * velocityFactor) / Math.sqrt(scale),
    vy: (body.vy * velocityFactor) / Math.sqrt(scale),
  })) as Bodies;
}

function accelerations(bodies: Bodies, softening: number): [number, number][] {
  const result: [number, number][] = [
    [0, 0],
    [0, 0],
    [0, 0],
  ];
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      const dx = bodies[j].x - bodies[i].x;
      const dy = bodies[j].y - bodies[i].y;
      const r2 = dx * dx + dy * dy + softening * softening;
      const inverseR3 = 1 / (r2 * Math.sqrt(r2));
      result[i][0] += dx * bodies[j].mass * inverseR3;
      result[i][1] += dy * bodies[j].mass * inverseR3;
      result[j][0] -= dx * bodies[i].mass * inverseR3;
      result[j][1] -= dy * bodies[i].mass * inverseR3;
    }
  }
  return result;
}

/** Symplectic velocity-Verlet step; returns new state without mutating input. */
export function advanceBodies(
  bodies: Bodies,
  dt: number,
  softening = 0.015,
): Bodies {
  if (
    !Number.isFinite(dt) ||
    dt < 0 ||
    dt > 0.05 ||
    !Number.isFinite(softening) ||
    softening <= 0
  ) {
    throw new RangeError("Invalid integration step or softening");
  }
  const before = accelerations(bodies, softening);
  const next = bodies.map((body, i) => ({
    ...body,
    x: body.x + body.vx * dt + 0.5 * before[i][0] * dt * dt,
    y: body.y + body.vy * dt + 0.5 * before[i][1] * dt * dt,
  })) as Bodies;
  const after = accelerations(next, softening);
  next.forEach((body, i) => {
    body.vx += 0.5 * (before[i][0] + after[i][0]) * dt;
    body.vy += 0.5 * (before[i][1] + after[i][1]) * dt;
    if (![body.x, body.y, body.vx, body.vy].every(Number.isFinite)) {
      throw new Error("Three-body integration produced non-finite state");
    }
  });
  return next;
}

export function centreOfMass(bodies: Bodies): { x: number; y: number } {
  const mass = bodies.reduce((sum, body) => sum + body.mass, 0);
  return {
    x: bodies.reduce((sum, body) => sum + body.mass * body.x, 0) / mass,
    y: bodies.reduce((sum, body) => sum + body.mass * body.y, 0) / mass,
  };
}
