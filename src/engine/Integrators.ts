/**
 * Performs one fourth-order Runge-Kutta integration step.
 *
 * This is useful for continuous dynamical systems. The derivative function must return a vector
 * with the same length as the state vector.
 */
export function rk4(
  state: number[],
  dt: number,
  derivative: (state: number[]) => number[],
): number[] {
  const k1 = derivative(state);

  const k2 = derivative(
    state.map((value, index) => value + k1[index] * dt / 2),
  );

  const k3 = derivative(
    state.map((value, index) => value + k2[index] * dt / 2),
  );

  const k4 = derivative(
    state.map((value, index) => value + k3[index] * dt),
  );

  return state.map(
    (value, index) =>
      value +
      (dt / 6) *
        (
          k1[index] +
          2 * k2[index] +
          2 * k3[index] +
          k4[index]
        ),
  );
}
