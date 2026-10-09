/**
 * Fail loudly when a supposedly exhaustive discriminated union gains a value
 * that a switch has not yet handled.
 */
export function assertNever(value: never, message = "Unexpected value"): never {
  throw new Error(`${message}: ${String(value)}`);
}
