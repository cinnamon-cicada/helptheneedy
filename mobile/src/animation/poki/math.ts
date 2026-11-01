export const TAU = Math.PI * 2;

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
export const clamp01 = (x: number) => clamp(x, 0, 1);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 0→1 progress of `t` through the window starting at `start` lasting `dur`. */
export const progress = (t: number, start: number, dur: number) => clamp01((t - start) / dur);

export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const easeInCubic = (t: number) => t * t * t;
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOutBack = (t: number, s = 1.70158) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2;

/** 0 → 1 → 0 over t in [0, 1]. */
export const pulse = (t: number) => Math.sin(Math.PI * clamp01(t));
/** Parabolic hop height, 0 at both ends and 1 at the middle. */
export const hop = (t: number) => {
  const c = clamp01(t);
  return 4 * c * (1 - c);
};
/** Ringing that starts at 0, like a plucked spring settling. */
export const ring = (t: number, freq: number, decay: number) =>
  t <= 0 ? 0 : Math.exp(-decay * t) * Math.sin(freq * t);

/** Frame-rate independent exponential approach. */
export const dampTo = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export function shortestAngle(from: number, to: number) {
  let d = (to - from) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
export const lerpAngle = (from: number, to: number, t: number) => from + shortestAngle(from, to) * t;

/** Yaw that points the mascot's face (+z) along (dx, dz). */
export const yawToward = (dx: number, dz: number) => Math.atan2(dx, dz);

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Smooth 1D value noise in [-1, 1]; deterministic for a given input. */
export function noise1(x: number) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i), hash(i + 1), u) * 2 - 1;
}

/** Cheap 3D value-ish noise in [-1, 1], used to make geometry hand-made. */
export function noise3(x: number, y: number, z: number) {
  return (
    noise1(x * 1.7 + y * 3.1 + z * 0.7) * 0.5 +
    noise1(y * 2.3 - z * 1.9 + 11.3) * 0.3 +
    noise1(z * 2.9 + x * 1.3 + 37.1) * 0.2
  );
}

/** Small seeded PRNG (mulberry32) so confetti looks the same every load. */
export function createRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
