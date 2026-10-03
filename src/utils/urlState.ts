const MAX_SEED = 0xffffffff;

/**
 * Parse a seed from the current URL.
 *
 * Invalid, negative, non-integer, and out-of-range values are rejected.
 */
export function getSeedFromUrl(): number | null {
  const params = new URLSearchParams(window.location.search);

  const rawSeed = params.get("seed");

  if (rawSeed === null) {
    return null;
  }

  const seed = Number(rawSeed);

  if (!Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) {
    return null;
  }

  return seed;
}

/**
 * Update the seed in the URL without reloading the page.
 */
export function setSeedInUrl(seed: number): void {
  if (!Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) {
    throw new RangeError("Seed must be an unsigned 32-bit integer.");
  }

  const url = new URL(window.location.href);

  url.searchParams.set("seed", String(seed));

  window.history.pushState({}, "", url);
}

/**
 * Return a shareable URL for the current seed.
 *
 * `origin` and `pathname` are taken from the current page, so this works
 * both locally and on GitHub Pages.
 */
export function getShareUrl(seed: number): string {
  if (!Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) {
    throw new RangeError("Seed must be an unsigned 32-bit integer.");
  }

  const url = new URL(window.location.href);

  url.searchParams.set("seed", String(seed));

  return url.toString();
}
