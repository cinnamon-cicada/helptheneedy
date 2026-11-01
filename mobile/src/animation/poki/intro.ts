import { BOX, LID_CLOSED_Y, LID_REST, MASCOT, ROPE_GAP, DRAG_Z } from './dims';
import {
  TAU,
  clamp01,
  easeInCubic,
  easeOutBack,
  easeOutCubic,
  hop,
  lerp,
  progress,
  pulse,
  ring,
  smoothstep,
} from './math';
import type { MascotPose } from './pose';
import { INTRO } from './timeline';

/**
 * Scripted intro choreography. Everything is a pure function of time, so
 * skipping ahead or dropping frames always lands on a consistent pose.
 */

/** Uneven heaves: each lurches the box forward and then friction stops it. */
const PULLS = [
  { at: 0.0, dur: 0.34, amount: 0.24 },
  { at: 0.42, dur: 0.24, amount: 0.13 },
  { at: 0.72, dur: 0.2, amount: 0.09 },
  // Slip between these two.
  { at: 1.1, dur: 0.2, amount: 0.12 },
  // Breather, then the big final heave that lands it dead centre.
  { at: 1.5, dur: 0.35, amount: 0.42 },
] as const;

const SLIP = { at: 0.92, dur: 0.2 };
const BREATHER = { at: 1.3, dur: 0.22 };

function dragProgress(t: number) {
  let p = 0;
  for (const pull of PULLS) p += pull.amount * easeOutCubic(progress(t, pull.at, pull.dur));
  return p;
}

/** How hard the box is lurching right now, 0–1. */
function lurch(t: number) {
  let l = 0;
  for (const pull of PULLS) l += pulse(progress(t, pull.at, pull.dur)) * Math.min(1, pull.amount / 0.2);
  return l;
}

/** Rope tension: builds while the mascot winds up and drops as the box gives. */
function tension(t: number) {
  let k = 0;
  for (const pull of PULLS) {
    const v = smoothstep(pull.at - 0.22, pull.at, t) * (1 - smoothstep(pull.at, pull.at + pull.dur * 0.6, t));
    k = Math.max(k, v);
  }
  return k;
}

export function introBoxX(t: number, startX: number) {
  return lerp(startX, 0, dragProgress(Math.min(t, INTRO.dragEnd)));
}

/** Mascot x while dragging: ahead of the box by the rope, plus wind-up and slip. */
function dragMascotX(t: number, startX: number) {
  const base = introBoxX(t, startX) + BOX.w / 2 + ROPE_GAP + MASCOT.bodyR;
  const slip = pulse(progress(t, SLIP.at, SLIP.dur));
  return base + 0.05 * tension(t) - 0.06 * slip;
}

const DRAG_YAW = -0.9; // facing the box, turned three-quarters toward the camera
const END_X = BOX.w / 2 + ROPE_GAP + MASCOT.bodyR;

export function introMascotPose(t: number, startX: number, out: MascotPose) {
  out.z = DRAG_Z;
  out.y = 0;
  out.yaw = DRAG_YAW;
  out.roll = 0;
  out.tumble = 0;
  out.tumbleRoll = 0;
  out.sx = out.sy = out.sz = 1;
  out.legSwing = 0;
  out.legLift = 0;
  out.arms = 1;
  out.eyeScale = 1;
  out.hornBend = 0;

  if (t < INTRO.dragEnd) {
    const x = dragMascotX(t, startX);
    const speed = Math.abs(x - dragMascotX(t - 0.03, startX)) / 0.03;
    const moving = clamp01(speed * 2.5);
    const k = tension(t);
    const slip = pulse(progress(t, SLIP.at, SLIP.dur));
    const rest = pulse(progress(t, BREATHER.at, BREATHER.dur));
    const heave = smoothstep(1.35, 1.5, t) * (1 - smoothstep(1.62, 1.78, t));

    // Walking backwards with tiny uneven steps, and digging in under tension.
    const phase = x * 40 + Math.sin(t * 7) * 0.6;
    out.x = x;
    out.y = 0.012 * Math.abs(Math.sin(phase)) * moving;
    out.legSwing = 0.55 * Math.sin(phase) * moving + 0.25 * Math.sin(t * 26) * k * (1 - moving);
    out.legLift = 0.9 * slip;
    out.pitch = -(0.3 + 0.28 * k) * (1 - rest * 0.9) + 0.3 * rest - 0.6 * slip;
    out.roll = 0.035 * Math.sin(t * 70) * heave + 0.04 * Math.sin(phase * 0.5) * moving;
    out.sy = 1 - 0.1 * k + 0.03 * rest * Math.sin(t * 20);
    out.sz = 1 + 0.12 * k;
    out.sx = 1 + 0.03 * k;
    return out;
  }

  out.x = END_X;

  if (t < INTRO.anticipate) {
    // Exhausted: hunched over, panting.
    const e = smoothstep(INTRO.dragEnd, INTRO.dragEnd + 0.13, t);
    out.pitch = lerp(-0.3, 0.32, e);
    out.sy = 1 + 0.05 * Math.sin(t * 16) * e;
    return out;
  }

  if (t < INTRO.burst) {
    // Straightens up and tilts its head at the box: something's happening.
    const a = smoothstep(INTRO.anticipate, INTRO.anticipate + 0.15, t);
    out.pitch = lerp(0.32, 0.02, a);
    out.roll = 0.16 * a;
    out.yaw = lerp(DRAG_YAW, -1.2, a);
    out.sy = 1 + 0.03 * Math.sin(t * 16) * (1 - a);
    return out;
  }

  // Startled by the burst: jumps back, lands, topples onto its back.
  const u = t - INTRO.burst;
  out.arms = 0;
  const startle = pulse(progress(u, 0, 0.12));
  const jump = progress(u, 0.08, 0.4);
  const land = pulse(progress(u, 0.48, 0.14));
  const topple = easeInCubic(progress(u, 0.6, 0.25));

  out.eyeScale = 1 + 0.6 * smoothstep(0, 0.05, u);
  out.x = END_X + 0.4 * easeOutCubic(jump);
  out.y = 0.36 * hop(jump) + (MASCOT.lyingCenterY - MASCOT.centerY) * topple;
  out.yaw = lerp(-1.2, -0.6, easeOutCubic(jump));
  out.roll = 0.16 * (1 - jump);
  out.pitch = -0.45 * pulse(jump);
  out.legSwing = 0.8 * Math.sin(u * 42) * pulse(jump);
  out.legLift = 0.45 * topple;
  out.sy = (1 + 0.28 * startle) * (1 - 0.25 * land);
  out.sx = out.sz = (1 - 0.12 * startle) * (1 + 0.15 * land);
  out.tumble = -1.75 * topple - 0.22 * ring(u - 0.85, 11, 3.5);
  return out;
}

/** Where the mascot is when the intro hands over to the idle behaviours. */
export function introEndPose(out: MascotPose) {
  return introMascotPose(INTRO.revealEnd, 0, out);
}

export type BoxPose = {
  x: number;
  rotZ: number;
  sx: number;
  sy: number;
  sz: number;
  /** 0–1 squash of the bow loops. */
  bowBounce: number;
};

export function introBoxPose(t: number, startX: number, out: BoxPose) {
  out.x = introBoxX(t, startX);
  out.rotZ = 0;
  out.sx = out.sy = out.sz = 1;
  out.bowBounce = 0;

  if (t < INTRO.dragEnd) {
    const l = lurch(t);
    // Tips onto its leading edge as it lurches, then thuds back down.
    out.rotZ = -0.05 * l;
    out.bowBounce = 0.6 * l;
    out.sy = 1 - 0.025 * pulse(progress(t % 0.4, 0.3, 0.1));
    return out;
  }
  if (t < INTRO.anticipate) {
    const v = t - INTRO.dragEnd;
    out.sy = 1 - 0.04 * ring(v, 20, 8);
    out.bowBounce = 0.4 * ring(v, 18, 6);
    return out;
  }
  if (t < INTRO.burst) {
    // Gathering itself: squashes and trembles.
    const a = easeInCubic(progress(t, INTRO.anticipate, INTRO.burst - INTRO.anticipate));
    out.sy = 1 - 0.11 * a;
    out.sx = out.sz = 1 + 0.05 * a;
    out.x += 0.012 * Math.sin(t * 95) * a;
    out.bowBounce = 0.3 * a;
    return out;
  }
  const u = t - INTRO.burst;
  out.sy = 1 + 0.14 * ring(u + 0.06, 24, 6);
  out.sx = out.sz = 1 - 0.05 * ring(u + 0.06, 24, 6);
  out.x += 0.035 * ring(u, 55, 7);
  out.rotZ = 0.03 * ring(u, 30, 5);
  return out;
}

export type LidPose = { x: number; y: number; z: number; rotX: number; rotY: number; rotZ: number; bowBounce: number };

/** Sits on the box until the burst, then flips off and leans on the box's left side. */
export function introLidPose(t: number, box: BoxPose, out: LidPose) {
  if (t < INTRO.burst) {
    const h = LID_CLOSED_Y * box.sy;
    out.x = box.x - Math.sin(box.rotZ) * h;
    out.y = Math.cos(box.rotZ) * h;
    out.z = 0;
    out.rotX = 0;
    out.rotY = 0;
    out.rotZ = box.rotZ;
    out.bowBounce = box.bowBounce;
    return out;
  }
  const u = t - INTRO.burst;
  const p = progress(u, 0, 0.62);
  const settle = u - 0.62;
  out.x = lerp(0, LID_REST.x, p);
  out.y = lerp(LID_CLOSED_Y, LID_REST.y, p) + 1.25 * hop(p);
  out.z = lerp(0, LID_REST.z, p);
  out.rotX = 0.35 * pulse(p);
  out.rotY = lerp(0, LID_REST.rotY, p);
  out.rotZ = lerp(0, LID_REST.rotZ + TAU, easeOutCubic(p)) - 0.12 * ring(settle, 16, 6);
  out.bowBounce = Math.max(0, 1 - u * 1.5) * Math.abs(Math.sin(u * 22)) + 0.5 * Math.abs(ring(settle, 14, 5));
  return out;
}

/**
 * Unrolling of the loose ribbon after the burst: 0 = still curled up and
 * hidden, 1 = fully draped. Per-segment staggering happens in the renderer.
 */
export function ribbonUnroll(t: number) {
  return progress(t - INTRO.burst, 0.15, 0.6);
}

export function ribbonSegmentProgress(unroll: number, index: number) {
  return easeOutBack(clamp01(unroll * 1.6 - index * 0.12), 1.4);
}

/** How taut the rope is, and whether it still exists. */
export function ropeState(t: number) {
  if (t >= INTRO.burst) return { visible: false, sag: 0 };
  if (t >= INTRO.dragEnd) return { visible: true, sag: 0.09 };
  return { visible: true, sag: 0.03 * (1 - tension(t)) };
}
