const MAX_UINT32 = 0xffffffff;

/**
 * Generate a non-zero unsigned 32-bit seed.
 *
 * Seed zero is reserved by URL state to mean "use application defaults",
 * so newly generated random configurations must use the range
 * 1..2^32-1.
 */
export function createSeed(): number {
  const values = new Uint32Array(1);

  do {
    crypto.getRandomValues(values);
  } while (values[0] === 0);

  const seed = values[0];

  if (!Number.isInteger(seed) || seed < 1 || seed > MAX_UINT32) {
    throw new Error(
      "Unable to generate a valid non-zero unsigned 32-bit seed.",
    );
  }

  return seed;
}
