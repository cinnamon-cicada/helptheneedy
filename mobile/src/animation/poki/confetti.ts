import { BOX, CONFETTI_COLORS } from './dims';
import { TAU, clamp01, createRandom, lerp, smoothstep } from './math';

/**
 * Confetti as closed-form projectiles with air drag:
 *   x(u) = x0 + vx/k · (1 − e^{−ku})
 *   y(u) = y0 + (vy + g/k)/k · (1 − e^{−ku}) − (g/k) · u
 * so any moment (including after a skip) can be computed directly.
 * Landing is precomputed once per piece.
 */

export type ConfettiKind = 'flake' | 'curl';

export type Particle = {
  kind: ConfettiKind;
  color: string;
  x0: number;
  y0: number;
  z0: number;
  vx: number;
  vy: number;
  vz: number;
  k: number;
  g: number;
  flutter: number;
  flutterFreq: number;
  phase: number;
  spin: [number, number, number];
  rot0: [number, number, number];
  size: number;
  /** Seconds after the burst when it lands, or Infinity. */
  landAt: number;
  /** Fell back into the open box rather than onto the floor. */
  intoBox: boolean;
  /** Stays on the floor around the gift after the burst. */
  keep: boolean;
};

export type ParticleFrame = {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  scale: number;
};

export const CONFETTI_FLAKES = 64;
export const CONFETTI_CURLS = 7;

const FLOOR = 0.006;
const MAX_KEEP = 14;

function rawPosition(p: Particle, u: number) {
  const e = 1 - Math.exp(-p.k * u);
  const wobble = p.flutter * Math.sin(p.phase + u * p.flutterFreq) * e;
  return {
    x: p.x0 + (p.vx / p.k) * e + wobble,
    y: p.y0 + ((p.vy + p.g / p.k) / p.k) * e - (p.g / p.k) * u,
    z: p.z0 + (p.vz / p.k) * e + wobble * 0.6,
  };
}

const overBox = (x: number, z: number) => Math.abs(x) < BOX.w / 2 - 0.04 && Math.abs(z) < BOX.d / 2 - 0.04;

export function createConfetti(flakes = CONFETTI_FLAKES, curls = CONFETTI_CURLS, seed = 7): Particle[] {
  const rand = createRandom(seed);
  const pieces: Particle[] = [];
  for (let i = 0; i < flakes + curls; i++) {
    const kind: ConfettiKind = i < flakes ? 'flake' : 'curl';
    const angle = rand() * TAU;
    // Bias a little toward the camera so the burst opens up in front.
    const speed = (kind === 'curl' ? 1.1 : 1.4) + rand() * 2.6;
    const p: Particle = {
      kind,
      color:
        kind === 'curl'
          ? CONFETTI_COLORS[Math.floor(rand() * 6)]
          : CONFETTI_COLORS[Math.floor(rand() * CONFETTI_COLORS.length)],
      x0: (rand() - 0.5) * 0.7,
      y0: BOX.h - 0.05,
      z0: (rand() - 0.5) * 0.6,
      vx: Math.cos(angle) * speed,
      vy: 3.8 + rand() * 2.8,
      vz: Math.sin(angle) * speed * 0.8 + 0.5,
      k: kind === 'curl' ? 2.2 + rand() * 0.4 : 2.8 + rand() * 0.8,
      g: kind === 'curl' ? 6 : 7,
      flutter: 0.06 + rand() * 0.08,
      flutterFreq: 7 + rand() * 4,
      phase: rand() * TAU,
      spin: [(rand() - 0.5) * 14, (rand() - 0.5) * 10, (rand() - 0.5) * 14],
      rot0: [rand() * TAU, rand() * TAU, rand() * TAU],
      size: kind === 'curl' ? 0.9 + rand() * 0.4 : 0.75 + rand() * 0.6,
      landAt: Infinity,
      intoBox: false,
      keep: false,
    };

    for (let u = 0.05; u < 5; u += 1 / 120) {
      const pos = rawPosition(p, u);
      const vyDown = rawPosition(p, u + 0.01).y < pos.y;
      if (vyDown && overBox(pos.x, pos.z) && pos.y <= BOX.h) {
        p.landAt = u;
        p.intoBox = true;
        break;
      }
      if (pos.y <= FLOOR) {
        p.landAt = u;
        break;
      }
    }
    pieces.push(p);
  }

  // A handful stay scattered around the gift; the rest fade once landed.
  let kept = 0;
  for (const p of pieces) {
    if (kept >= MAX_KEEP || p.intoBox || !Number.isFinite(p.landAt)) continue;
    const pos = rawPosition(p, p.landAt);
    const r = Math.hypot(pos.x, pos.z);
    if (r > 0.85 && r < 1.55 && pos.z > -0.5 && pos.x > -1.25) {
      p.keep = true;
      kept++;
    }
  }
  return pieces;
}

/** Pose of one piece `u` seconds after the burst (u < 0: not yet emitted). */
export function particleAt(p: Particle, u: number, out: ParticleFrame) {
  if (u <= 0) {
    out.scale = 0;
    return out;
  }
  const landed = u >= p.landAt;
  const tFlight = landed ? p.landAt : u;
  const pos = rawPosition(p, tFlight);
  out.x = pos.x;
  out.y = landed ? (p.intoBox ? pos.y : FLOOR) : pos.y;
  out.z = pos.z;

  const airRx = p.rot0[0] + p.spin[0] * tFlight;
  const airRy = p.rot0[1] + p.spin[1] * tFlight;
  const airRz = p.rot0[2] + p.spin[2] * tFlight;
  // Flakes settle flat on the floor; curls just stop where they land.
  const flat = landed && p.kind === 'flake' ? smoothstep(0, 0.12, u - p.landAt) : 0;
  out.rx = lerp(airRx, -Math.PI / 2, flat);
  out.ry = lerp(airRy, 0, flat);
  out.rz = airRz;

  let scale = p.size * clamp01(u / 0.06);
  if (landed && p.intoBox) scale *= 1 - clamp01((u - p.landAt) / 0.12);
  else if (landed && !p.keep) scale *= 1 - smoothstep(0.4, 0.75, u - p.landAt);
  else if (!landed && u > 4) scale *= 1 - clamp01((u - 4) / 0.3);
  out.scale = scale;
  return out;
}
