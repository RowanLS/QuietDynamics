/**
 * State of the Lorenz dynamical system.
 *
 * The state contains the three coordinates of the trajectory in phase space.
 */
export interface LorenzState {
  x: number;
  y: number;
  z: number;
}

/**
 * Parameters of the Lorenz system:
 *
 *   dx/dt = sigma * (y - x)
 *   dy/dt = x * (rho - z) - y
 *   dz/dt = x * y - beta * z
 */
export interface LorenzParameters {
  sigma: number;
  rho: number;
  beta: number;
}

/**
 * Validate a Lorenz state.
 *
 * All state components must be finite real numbers.
 */
function validateState(state: LorenzState): void {
  if (
    !Number.isFinite(state.x) ||
    !Number.isFinite(state.y) ||
    !Number.isFinite(state.z)
  ) {
    throw new RangeError("Lorenz state must contain finite values.");
  }
}

/**
 * Validate Lorenz parameters.
 *
 * sigma, rho, and beta must be finite and strictly positive.
 */
function validateParameters(parameters: LorenzParameters): void {
  const { sigma, rho, beta } = parameters;

  if (
    !Number.isFinite(sigma) ||
    !Number.isFinite(rho) ||
    !Number.isFinite(beta)
  ) {
    throw new RangeError("Lorenz parameters must be finite values.");
  }

  if (sigma <= 0 || rho <= 0 || beta <= 0) {
    throw new RangeError(
      "Lorenz parameters sigma, rho, and beta must be greater than zero.",
    );
  }
}

/**
 * Return the time derivatives of a Lorenz state.
 *
 * This is a pure function: neither argument is mutated.
 */
export function derivatives(
  state: LorenzState,
  parameters: LorenzParameters,
): LorenzState {
  validateState(state);
  validateParameters(parameters);

  const { x, y, z } = state;
  const { sigma, rho, beta } = parameters;

  return {
    x: sigma * (y - x),
    y: x * (rho - z) - y,
    z: x * y - beta * z,
  };
}

/**
 * Integrate a Lorenz state forward using classical fourth-order
 * Runge-Kutta (RK4).
 *
 * The returned state is a new object and the input state is never mutated.
 */
export function integrateRK4(
  state: LorenzState,
  parameters: LorenzParameters,
  timestep: number,
): LorenzState {
  validateState(state);
  validateParameters(parameters);

  if (!Number.isFinite(timestep) || timestep < 0) {
    throw new RangeError("Lorenz timestep must be finite and non-negative.");
  }

  if (timestep === 0) {
    return { ...state };
  }

  const k1 = derivatives(state, parameters);

  const k2State: LorenzState = {
    x: state.x + 0.5 * timestep * k1.x,
    y: state.y + 0.5 * timestep * k1.y,
    z: state.z + 0.5 * timestep * k1.z,
  };

  const k2 = derivatives(k2State, parameters);

  const k3State: LorenzState = {
    x: state.x + 0.5 * timestep * k2.x,
    y: state.y + 0.5 * timestep * k2.y,
    z: state.z + 0.5 * timestep * k2.z,
  };

  const k3 = derivatives(k3State, parameters);

  const k4State: LorenzState = {
    x: state.x + timestep * k3.x,
    y: state.y + timestep * k3.y,
    z: state.z + timestep * k3.z,
  };

  const k4 = derivatives(k4State, parameters);

  return {
    x: state.x + (timestep / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x),

    y: state.y + (timestep / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y),

    z: state.z + (timestep / 6) * (k1.z + 2 * k2.z + 2 * k3.z + k4.z),
  };
}

/**
 * Return whether a Lorenz state contains only finite values.
 *
 * This is useful for defensive checks in the animation loop without
 * throwing from a hot path.
 */
export function isFiniteState(state: LorenzState): boolean {
  return (
    Number.isFinite(state.x) &&
    Number.isFinite(state.y) &&
    Number.isFinite(state.z)
  );
}
