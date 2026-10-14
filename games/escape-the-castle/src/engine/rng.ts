// Seeded, deterministic RNG. The engine never calls Math.random(); callers pass
// one of these in so tests and bug reports are reproducible.

export type RNG = () => number; // returns a float in [0, 1)

// mulberry32 — small, fast, good enough for a game.
export function createRng(seed: number): RNG {
  let a = seed >>> 0;
  return function rng(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Uniform float in [min, max).
export function randRange(rng: RNG, min: number, max: number): number {
  return min + rng() * (max - min);
}

// Random integer in [0, n).
export function randInt(rng: RNG, n: number): number {
  return Math.floor(rng() * n);
}

// Pick a random element.
export function pick<T>(rng: RNG, arr: readonly T[]): T {
  return arr[randInt(rng, arr.length)];
}
