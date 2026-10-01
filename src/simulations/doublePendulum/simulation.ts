import type {
  ParameterDefinition,
  RandomSource,
  SimulationDefinition,
} from "../../types/simulation";
import { rk4 } from "../../engine/Integrators";

export interface DoublePendulumState {
  theta1: number;
  theta2: number;
  omega1: number;
  omega2: number;
}

export interface DoublePendulumParameters extends Record<string, number> {
  m1: number;
  m2: number;
  l1: number;
  l2: number;
  g: number;
}

const parameters: ParameterDefinition[] = [
  {
    id: "m1",
    label: "Mass 1",
    min: 0.2,
    max: 3,
    step: 0.01,
    defaultValue: 1,
  },
  {
    id: "m2",
    label: "Mass 2",
    min: 0.2,
    max: 3,
    step: 0.01,
    defaultValue: 1.37,
  },
  {
    id: "l1",
    label: "Length 1",
    min: 0.4,
    max: 2.2,
    step: 0.01,
    defaultValue: 1,
  },
  {
    id: "l2",
    label: "Length 2",
    min: 0.4,
    max: 2.2,
    step: 0.01,
    defaultValue: 1,
  },
  {
    id: "g",
    label: "Gravity",
    min: 1,
    max: 20,
    step: 0.01,
    defaultValue: 9.81,
    unit: "m/s²",
  },
];

function derivative(
  state: DoublePendulumState,
  p: DoublePendulumParameters,
): DoublePendulumState {
  const { theta1, theta2, omega1, omega2 } = state;
  const { m1, m2, l1, l2, g } = p;

  const delta = theta1 - theta2;

  const denominator1 =
    l1 *
    (
      2 * m1 +
      m2 -
      m2 * Math.cos(2 * delta)
    );

  const denominator2 =
    l2 *
    (
      2 * m1 +
      m2 -
      m2 * Math.cos(2 * delta)
    );

  const angularAcceleration1 =
    (
      -g * (2 * m1 + m2) * Math.sin(theta1)
      - m2 * g * Math.sin(theta1 - 2 * theta2)
      - 2 *
        Math.sin(delta) *
        m2 *
        (
          omega2 ** 2 * l2 +
          omega1 ** 2 * l1 * Math.cos(delta)
        )
    ) /
    denominator1;

  const angularAcceleration2 =
    (
      2 *
      Math.sin(delta) *
      (
        omega1 ** 2 * l1 * (m1 + m2) +
        g * (m1 + m2) * Math.cos(theta1) +
        omega2 ** 2 * l2 * m2 * Math.cos(delta)
      )
    ) /
    denominator2;

  return {
    theta1: omega1,
    theta2: omega2,
    omega1: angularAcceleration1,
    omega2: angularAcceleration2,
  };
}

/*
function createState(
  _parameters: DoublePendulumParameters,
  random: RandomSource,
): DoublePendulumState {
  // Generate an interesting but generally well-behaved initial configuration.
  const randomAngle = () => -Math.PI + random.next() * Math.PI * 2;

  return {
    theta1: randomAngle(),
    theta2: randomAngle(),
    omega1: 0,
    omega2: 0,
  };
}
*/

function createState(
  _parameters: DoublePendulumParameters,
  _random: RandomSource,
): DoublePendulumState {
  return {
    theta1: 1.9,
    theta2: 1.15,
    omega1: 0,
    omega2: 0,
  };
}

function step(
  state: DoublePendulumState,
  parameters: DoublePendulumParameters,
  dt: number,
): DoublePendulumState {
  const vector = [
    state.theta1,
    state.theta2,
    state.omega1,
    state.omega2,
  ];

  const next = rk4(vector, dt, (value) =>
    derivative(
      {
        theta1: value[0],
        theta2: value[1],
        omega1: value[2],
        omega2: value[3],
      },
      parameters,
    ),
  );

  const nextState: DoublePendulumState = {
    theta1: next[0],
    theta2: next[1],
    omega1: next[2],
    omega2: next[3],
  };

  if (
    !Number.isFinite(nextState.theta1) ||
    !Number.isFinite(nextState.theta2) ||
    !Number.isFinite(nextState.omega1) ||
    !Number.isFinite(nextState.omega2)
  ) {
    // Recover gracefully from an invalid numerical state.
    return {
      theta1: state.theta1,
      theta2: state.theta2,
      omega1: 0,
      omega2: 0,
    };
  }

  return nextState;
}

export const doublePendulum: SimulationDefinition<
  DoublePendulumState,
  DoublePendulumParameters
> = {
  id: "double-pendulum",
  name: "Double Pendulum",
  description:
    "Deterministic chaos from a simple mechanical system.",
  parameters,
  createState,
  step,
};
