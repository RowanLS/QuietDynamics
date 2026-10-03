/**
 * Pure mathematical model for a double pendulum.
 *
 * This module intentionally has no React or Canvas dependencies so that
 * the equations and numerical integration can be tested independently.
 */

export interface DoublePendulumState {
  theta1: number;
  theta2: number;
  omega1: number;
  omega2: number;
}

export interface DoublePendulumParameters {
  m1: number;
  m2: number;
  l1: number;
  l2: number;
  gravity: number;
}

/**
 * Validate a double-pendulum parameter set.
 *
 * Masses, lengths, and gravity must be finite and strictly positive.
 */
function validateParameters(parameters: DoublePendulumParameters): void {
  const { m1, m2, l1, l2, gravity } = parameters;

  const values = [
    ["m1", m1],
    ["m2", m2],
    ["l1", l1],
    ["l2", l2],
    ["gravity", gravity],
  ] as const;

  for (const [name, value] of values) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`${name} must be a finite positive number.`);
    }
  }
}

/**
 * Validate a state vector.
 */
function validateState(state: DoublePendulumState): void {
  const values = [
    ["theta1", state.theta1],
    ["theta2", state.theta2],
    ["omega1", state.omega1],
    ["omega2", state.omega2],
  ] as const;

  for (const [name, value] of values) {
    if (!Number.isFinite(value)) {
      throw new RangeError(`${name} must be finite.`);
    }
  }
}

/**
 * Compute d(state)/dt for the double pendulum.
 *
 * Angles are measured from the downward vertical.
 *
 * The returned values are:
 *
 *   dtheta1/dt
 *   dtheta2/dt
 *   domega1/dt
 *   domega2/dt
 */
export function derivatives(
  state: DoublePendulumState,
  parameters: DoublePendulumParameters,
): DoublePendulumState {
  validateState(state);
  validateParameters(parameters);

  const { theta1, theta2, omega1, omega2 } = state;

  const { m1, m2, l1, l2, gravity } = parameters;

  const delta = theta1 - theta2;

  const sinDelta = Math.sin(delta);

  const cosDelta = Math.cos(delta);

  const denominator = 2 * m1 + m2 - m2 * Math.cos(2 * delta);

  const domega1 =
    (-gravity * (2 * m1 + m2) * Math.sin(theta1) -
      m2 * gravity * Math.sin(theta1 - 2 * theta2) -
      2 *
        sinDelta *
        m2 *
        (omega2 * omega2 * l2 + omega1 * omega1 * l1 * cosDelta)) /
    (l1 * denominator);

  const domega2 =
    (2 *
      sinDelta *
      (omega1 * omega1 * l1 * (m1 + m2) +
        gravity * (m1 + m2) * Math.cos(theta1) +
        omega2 * omega2 * l2 * m2 * cosDelta)) /
    (l2 * denominator);

  return {
    theta1: omega1,
    theta2: omega2,
    omega1: domega1,
    omega2: domega2,
  };
}

/**
 * Add a scaled state derivative to a state.
 */
function addScaledState(
  state: DoublePendulumState,
  derivative: DoublePendulumState,
  scale: number,
): DoublePendulumState {
  return {
    theta1: state.theta1 + derivative.theta1 * scale,

    theta2: state.theta2 + derivative.theta2 * scale,

    omega1: state.omega1 + derivative.omega1 * scale,

    omega2: state.omega2 + derivative.omega2 * scale,
  };
}

/**
 * Integrate one timestep using classical fourth-order Runge-Kutta.
 *
 * A new state object is returned; the input state is never mutated.
 */
export function integrateRK4(
  state: DoublePendulumState,
  parameters: DoublePendulumParameters,
  dt: number,
): DoublePendulumState {
  validateState(state);
  validateParameters(parameters);

  if (!Number.isFinite(dt) || dt < 0) {
    throw new RangeError("dt must be a finite non-negative number.");
  }

  /*
   * A zero timestep is a useful and well-defined identity operation.
   */
  if (dt === 0) {
    return {
      ...state,
    };
  }

  const k1 = derivatives(state, parameters);

  const k2State = addScaledState(state, k1, dt * 0.5);

  const k2 = derivatives(k2State, parameters);

  const k3State = addScaledState(state, k2, dt * 0.5);

  const k3 = derivatives(k3State, parameters);

  const k4State = addScaledState(state, k3, dt);

  const k4 = derivatives(k4State, parameters);

  return {
    theta1:
      state.theta1 +
      ((k1.theta1 + 2 * k2.theta1 + 2 * k3.theta1 + k4.theta1) * dt) / 6,

    theta2:
      state.theta2 +
      ((k1.theta2 + 2 * k2.theta2 + 2 * k3.theta2 + k4.theta2) * dt) / 6,

    omega1:
      state.omega1 +
      ((k1.omega1 + 2 * k2.omega1 + 2 * k3.omega1 + k4.omega1) * dt) / 6,

    omega2:
      state.omega2 +
      ((k1.omega2 + 2 * k2.omega2 + 2 * k3.omega2 + k4.omega2) * dt) / 6,
  };
}

/**
 * Calculate total mechanical energy.
 *
 * The zero of potential energy is chosen at the lowest possible
 * configuration. The exact zero is arbitrary; only conservation matters.
 */
export function totalEnergy(
  state: DoublePendulumState,
  parameters: DoublePendulumParameters,
): number {
  validateState(state);
  validateParameters(parameters);

  const { theta1, theta2, omega1, omega2 } = state;

  const { m1, m2, l1, l2, gravity } = parameters;

  /*
   * Kinetic energy:
   *
   * T1 = 1/2 m1 l1² omega1²
   *
   * T2 = 1/2 m2 [
   *        l1² omega1² +
   *        l2² omega2² +
   *        2 l1 l2 omega1 omega2 cos(theta1-theta2)
   *      ]
   */
  const kineticEnergy =
    0.5 * m1 * l1 * l1 * omega1 * omega1 +
    0.5 *
      m2 *
      (l1 * l1 * omega1 * omega1 +
        l2 * l2 * omega2 * omega2 +
        2 * l1 * l2 * omega1 * omega2 * Math.cos(theta1 - theta2));

  /*
   * Potential energy measured relative to the lowest configuration.
   */
  const potentialEnergy =
    -(m1 + m2) * gravity * l1 * Math.cos(theta1) -
    m2 * gravity * l2 * Math.cos(theta2) +
    (m1 + m2) * gravity * l1 +
    m2 * gravity * l2;

  return kineticEnergy + potentialEnergy;
}
