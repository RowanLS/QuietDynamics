const TAU = Math.PI * 2;

export interface PendulumWaveState {
  elapsedTime: number;
}

/**
 * Validate parameters that define a pendulum wave.
 */
export function validatePendulumWaveParameters(
  pendulumCount: number,
  baseOscillations: number,
  wavePeriod: number,
  amplitude: number,
): void {
  if (!Number.isInteger(pendulumCount) || pendulumCount < 2) {
    throw new RangeError(
      "Pendulum count must be an integer greater than or equal to 2.",
    );
  }

  if (!Number.isInteger(baseOscillations) || baseOscillations < 1) {
    throw new RangeError("Base oscillations must be a positive integer.");
  }

  if (!Number.isFinite(wavePeriod) || wavePeriod <= 0) {
    throw new RangeError("Wave period must be positive and finite.");
  }

  if (
    !Number.isFinite(amplitude) ||
    amplitude <= 0 ||
    amplitude >= Math.PI / 2
  ) {
    throw new RangeError(
      "Amplitude must be finite and between 0 and PI / 2 radians.",
    );
  }
}

/**
 * Return the angular position of one pendulum at the supplied elapsed time.
 *
 * Adjacent pendulums complete one additional oscillation during each complete
 * wave period. Consequently the whole array returns to its initial phase
 * relationship after wavePeriod seconds.
 */
export function getPendulumAngle(
  index: number,
  elapsedTime: number,
  baseOscillations: number,
  wavePeriod: number,
  amplitude: number,
): number {
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError("Pendulum index must be a non-negative integer.");
  }

  if (!Number.isFinite(elapsedTime) || elapsedTime < 0) {
    throw new RangeError("Elapsed time must be finite and non-negative.");
  }

  if (!Number.isInteger(baseOscillations) || baseOscillations < 1) {
    throw new RangeError("Base oscillations must be a positive integer.");
  }

  if (!Number.isFinite(wavePeriod) || wavePeriod <= 0) {
    throw new RangeError("Wave period must be positive and finite.");
  }

  if (!Number.isFinite(amplitude)) {
    throw new RangeError("Amplitude must be finite.");
  }

  const oscillationsPerWave = baseOscillations + index;
  const angularFrequency = (TAU * oscillationsPerWave) / wavePeriod;

  return amplitude * Math.sin(angularFrequency * elapsedTime);
}
