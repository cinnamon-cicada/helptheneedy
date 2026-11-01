import { BOX, FACE_CAMERA_YAW, PATH } from './dims';
import {
  TAU,
  clamp,
  easeInCubic,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  hop,
  lerp,
  lerpAngle,
  progress,
  pulse,
  ring,
  shortestAngle,
  smoothstep,
  yawToward,
} from './math';
import { type MascotPose, copyPose, restPose, settlePose } from './pose';

/**
 * Idle exploration after the intro. Each behaviour is built as a sequence
 * of steps; every step starts from the exact pose the previous one ended
 * on, so transitions never pop. The scheduler picks the next behaviour
 * with weights and never repeats the same one twice in a row.
 */

export type BehaviorName = 'recover' | 'wander' | 'peek' | 'climb' | 'slide' | 'hide' | 'ribbon' | 'pause';
export type BehaviorEvent = 'ribbonPoke';

type Step = {
  dur: number;
  run: (t: number, from: MascotPose, out: MascotPose) => void;
};

export type Plan = {
  name: BehaviorName;
  duration: number;
  steps: Step[];
  offsets: number[];
  starts: MascotPose[];
  end: MascotPose;
  events: { at: number; type: BehaviorEvent }[];
};

type Pt = readonly [number, number];

const WALK_SPEED = 0.5;
const SIT_DROP = 0.06;
const RIM_X = BOX.w / 2 - 0.05;
const WALL_X = BOX.w / 2 + 0.15;

// --- Path around the gift -------------------------------------------------

const rxFor = (cos: number) => (cos < 0 ? PATH.rxLeft : PATH.rxRight);

export function ellipsePoint(a: number): Pt {
  const c = Math.cos(a);
  return [c * rxFor(c), Math.sin(a) * PATH.rz];
}

export function ellipseAngle(x: number, z: number) {
  return Math.atan2(z / PATH.rz, x / rxFor(x));
}

/** Points along the ellipse from a0 to a1 (unwrapped, either direction). */
function arc(a0: number, a1: number): Pt[] {
  const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / 0.16));
  const pts: Pt[] = [];
  for (let i = 1; i <= n; i++) pts.push(ellipsePoint(lerp(a0, a1, i / n)));
  return pts;
}

// --- Plan builder ---------------------------------------------------------

class PlanBuilder {
  private steps: Step[] = [];
  private starts: MascotPose[] = [];
  private events: { at: number; type: BehaviorEvent }[] = [];
  private time = 0;
  pose: MascotPose;

  constructor(start: MascotPose) {
    this.pose = copyPose(start, restPose());
  }

  add(dur: number, run: Step['run'], event?: { at: number; type: BehaviorEvent }) {
    if (dur <= 0) return this;
    if (event) this.events.push({ at: this.time + event.at, type: event.type });
    this.steps.push({ dur, run });
    this.starts.push(this.pose);
    const end = restPose();
    run(dur, this.pose, end);
    this.pose = end;
    this.time += dur;
    return this;
  }

  /** Turns on the spot with little shuffling steps. */
  turnTo(yaw: number) {
    const delta = Math.abs(shortestAngle(this.pose.yaw, yaw));
    if (delta < 0.05) return this;
    const dur = 0.16 + delta * 0.2;
    return this.add(dur, (t, from, out) => {
      settlePose(from, out);
      const p = easeInOutCubic(t / dur);
      out.yaw = lerpAngle(from.yaw, yaw, p);
      out.legSwing = 0.35 * Math.sin(t * 30) * pulse(t / dur);
      out.y = from.y + 0.01 * Math.abs(Math.sin(t * 30)) * pulse(t / dur);
    });
  }

  /** Waddles along a polyline at a slightly uneven pace. */
  walkTo(points: Pt[]) {
    const pts: Pt[] = [[this.pose.x, this.pose.z]];
    for (const p of points) {
      const last = pts[pts.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 0.01) pts.push(p);
    }
    if (pts.length < 2) return this;

    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const total = cum[cum.length - 1];
    const at = (s: number): Pt => {
      const d = clamp(s, 0, total);
      let i = 1;
      while (i < cum.length - 1 && cum[i] < d) i++;
      const k = (d - cum[i - 1]) / (cum[i] - cum[i - 1]);
      return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)];
    };

    this.turnTo(yawToward(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]));
    const dur = total / WALK_SPEED;
    const baseY = this.pose.y;
    return this.add(dur, (t, from, out) => {
      settlePose(from, out);
      const amp = smoothstep(0, 0.18, t) * (1 - smoothstep(dur - 0.18, dur, t));
      // Tiny legs: the pace stutters a little rather than gliding.
      const s = WALK_SPEED * t + 0.025 * Math.sin(t * 8.5) * amp;
      const [x, z] = at(s);
      const ahead = at(s + 0.06);
      const behind = at(s - 0.02);
      out.x = x;
      out.z = z;
      if (Math.hypot(ahead[0] - behind[0], ahead[1] - behind[1]) > 0.005) {
        out.yaw = yawToward(ahead[0] - behind[0], ahead[1] - behind[1]);
      } else {
        out.yaw = from.yaw;
      }
      const phase = s * 38;
      out.legSwing = 0.6 * Math.sin(phase) * amp;
      out.y = baseY + 0.016 * Math.abs(Math.sin(phase)) * amp;
      out.roll = 0.07 * Math.sin(phase) * amp;
      out.pitch = 0.06 * amp;
      out.sy = 1 - 0.03 * Math.abs(Math.cos(phase)) * amp;
    });
  }

  /** Stands still; `fn` layers motion on top and must return to rest by the end. */
  hold(dur: number, fn?: (t: number, out: MascotPose, from: MascotPose) => void) {
    return this.add(dur, (t, from, out) => {
      copyPose(from, out);
      fn?.(t, out, from);
    });
  }

  build(name: BehaviorName): Plan {
    const offsets: number[] = [];
    let acc = 0;
    for (const s of this.steps) {
      offsets.push(acc);
      acc += s.dur;
    }
    return {
      name,
      duration: Math.max(acc, 0.001),
      steps: this.steps,
      offsets,
      starts: this.starts,
      end: this.pose,
      events: this.events,
    };
  }
}

export function samplePlan(plan: Plan, t: number, out: MascotPose) {
  if (plan.steps.length === 0) return copyPose(plan.end, out);
  let i = plan.steps.length - 1;
  while (i > 0 && plan.offsets[i] > t) i--;
  const step = plan.steps[i];
  step.run(clamp(t - plan.offsets[i], 0, step.dur), plan.starts[i], out);
  return out;
}

// --- Behaviours -----------------------------------------------------------

type Rand = () => number;

const towardBox = (x: number, z: number) => yawToward(-x, -z);

/** Gets up after tumbling over in the explosion, and shakes it off. */
function recover(start: MascotPose) {
  const b = new PlanBuilder(start);
  const lyingY = start.y;
  const lyingTumble = start.tumble;
  const lyingLegs = start.legLift;
  b.add(1.15, (t, from, out) => {
    settlePose(from, out);
    const rock = 0.22 * Math.sin(t * 13) * (1 - progress(t, 0, 0.45));
    const up = easeOutBack(progress(t, 0.42, 0.35), 1.2);
    out.tumble = lerp(lyingTumble + rock, 0, up);
    out.y = lerp(lyingY, 0, up) + 0.07 * hop(progress(t, 0.5, 0.28));
    out.legLift = lerp(lyingLegs, 0, up);
    out.legSwing = 0.5 * Math.sin(t * 30) * (1 - progress(t, 0, 0.42));
    out.roll = 0.2 * ring(t - 0.8, 26, 7);
    out.hornBend = -0.25 * ring(t - 0.8, 22, 6);
    out.eyeScale = lerp(from.eyeScale, 1, progress(t, 0, 0.5));
  });
  b.turnTo(FACE_CAMERA_YAW);
  b.hold(0.7, (t, out) => {
    out.roll = 0.14 * pulse(t / 0.7);
  });
  return b.build('recover');
}

function wander(start: MascotPose, rand: Rand) {
  const b = new PlanBuilder(start);
  const a0 = ellipseAngle(start.x, start.z);
  let delta = (0.7 + rand() * 1.1) * (rand() < 0.5 ? -1 : 1);
  // Mostly stay on the visible front side.
  if (Math.sin(a0 + delta) < -0.25) delta = -delta;
  const a1 = a0 + delta;
  b.walkTo([ellipsePoint(a0), ...arc(a0, a1)]);
  b.turnTo(towardBox(b.pose.x, b.pose.z));
  b.hold(1.0, (t, out) => {
    // Inspects the box, head tilted.
    out.roll = 0.18 * pulse(t / 1.0);
    out.pitch = 0.1 * pulse(t / 1.0);
  });
  if (rand() < 0.4) {
    b.turnTo(FACE_CAMERA_YAW);
    b.hold(0.6);
  }
  return b.build('wander');
}

/** Stretches up on tiptoe beside the right wall, trying to see inside. */
function peek(start: MascotPose) {
  const b = new PlanBuilder(start);
  const a0 = ellipseAngle(start.x, start.z);
  const target = 0.3;
  const spot: Pt = [WALL_X, 0.32];
  b.walkTo([ellipsePoint(a0), ...arc(a0, a0 + shortestAngle(a0, target)), spot]);
  b.turnTo(-Math.PI / 2 + 0.3);
  b.add(1.7, (t, from, out) => {
    settlePose(from, out);
    const st = smoothstep(0, 0.3, t) * (1 - smoothstep(1.4, 1.7, t));
    out.sy = 1 + 0.28 * st;
    out.sx = out.sz = 1 - 0.1 * st;
    out.y = 0.02 * st + 0.06 * hop(progress(t, 0.45, 0.22)) + 0.05 * hop(progress(t, 0.8, 0.2));
    out.pitch = -0.1 * st;
    out.roll = 0.16 * pulse(progress(t, 1.0, 0.55));
    out.legSwing = 0.3 * Math.sin(t * 24) * (pulse(progress(t, 0.45, 0.22)) + pulse(progress(t, 0.8, 0.2)));
  });
  b.walkTo([ellipsePoint(target)]);
  return b.build('peek');
}

/** Scrambles up the right wall with a couple of slips and sits on the rim. */
const CLIMB_KEYS: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.22, 0.2],
  [0.5, 0.33],
  [0.62, 0.25],
  [0.95, 0.5],
  [1.25, 0.7],
  [1.38, 0.6],
  [1.75, 0.9],
  [2.05, 0.98],
];

function climbY(t: number) {
  for (let i = 1; i < CLIMB_KEYS.length; i++) {
    const [t1, y1] = CLIMB_KEYS[i];
    if (t <= t1) {
      const [t0, y0] = CLIMB_KEYS[i - 1];
      const k = (t - t0) / (t1 - t0);
      // Slipping drops fast; climbing eases in and out.
      return lerp(y0, y1, y1 < y0 ? easeInCubic(k) : easeInOutCubic(k));
    }
  }
  return CLIMB_KEYS[CLIMB_KEYS.length - 1][1];
}

function slipping(t: number) {
  return (t > 0.5 && t < 0.62) || (t > 1.25 && t < 1.38);
}

function climb(start: MascotPose, rand: Rand) {
  const b = new PlanBuilder(start);
  const a0 = ellipseAngle(start.x, start.z);
  const z = -0.05;
  b.walkTo([ellipsePoint(a0), ...arc(a0, a0 + shortestAngle(a0, -0.05)), [WALL_X, z]]);
  b.turnTo(-Math.PI / 2);

  const climbDur = 2.05;
  b.add(climbDur, (t, from, out) => {
    settlePose(from, out);
    const slip = slipping(t);
    out.y = climbY(t);
    out.pitch = 0.14 * smoothstep(0, 0.2, t);
    out.legSwing = (slip ? 1.1 : 0.8) * Math.sin(t * (slip ? 48 : 30));
    out.sy = 1 + 0.08 * Math.sin(t * 9);
    out.eyeScale = slip ? 1.35 : 1;
  });
  // Hauls itself over onto the rim.
  b.add(0.4, (t, from, out) => {
    settlePose(from, out);
    const p = easeOutCubic(t / 0.4);
    out.x = lerp(from.x, RIM_X, p);
    out.y = lerp(from.y, BOX.h, p) + 0.06 * hop(t / 0.4);
    out.pitch = lerp(0.14, 0, p);
    out.legSwing = 0.6 * Math.sin(t * 34) * (1 - p);
    out.sy = 1 - 0.12 * pulse(progress(t, 0.25, 0.15));
  });
  b.turnTo(1.0);
  b.add(0.35, (t, from, out) => {
    settlePose(from, out);
    const p = easeOutCubic(t / 0.35);
    out.legLift = 1.3 * p;
    out.y = from.y - SIT_DROP * p;
  });
  const sitDur = 2.0 + rand() * 0.8;
  b.hold(sitDur, (t, out) => {
    // Swings its legs, and leans over to peer down into the box.
    out.legSwing = 0.28 * Math.sin(t * 6);
    const look = pulse(progress(t, 0.6, 1.0));
    out.roll = 0.35 * look;
    out.pitch = 0.18 * look;
  });
  return b.build('climb');
}

/** Loses balance on the rim and slides down the outside wall on its bottom. */
function slide(start: MascotPose) {
  const b = new PlanBuilder(start);
  b.hold(0.7, (t, out) => {
    const k = t / 0.7;
    out.roll = -0.16 * Math.sin(t * 10) * k;
    out.eyeScale = 1 + 0.35 * smoothstep(0.5, 0.7, t);
  });
  const fromY = b.pose.y;
  const groundY = -SIT_DROP;
  b.add(0.55, (t, from, out) => {
    copyPose(from, out);
    out.roll = 0;
    const over = easeOutCubic(progress(t, 0, 0.15));
    const fall = progress(t, 0.08, 0.47) ** 2;
    out.x = lerp(RIM_X, WALL_X, over);
    out.y = lerp(fromY, groundY, fall);
    out.tumble = -0.35 * pulse(progress(t, 0, 0.25)) - 0.15 * fall;
    out.legSwing = 0.5 * Math.sin(t * 40);
  });
  b.add(0.3, (t, from, out) => {
    copyPose(from, out);
    out.tumble = lerp(from.tumble, 0, easeOutCubic(t / 0.3));
    out.sy = 1 - 0.22 * ring(t + 0.04, 22, 9);
    out.sx = out.sz = 1 + 0.12 * ring(t + 0.04, 22, 9);
    out.legSwing = 0;
  });
  b.hold(0.55, (t, out) => {
    // Dizzy little circles.
    const k = pulse(t / 0.55);
    out.roll = 0.1 * Math.sin(t * 9) * k;
    out.pitch = 0.1 * Math.cos(t * 9) * k;
  });
  b.add(0.35, (t, from, out) => {
    settlePose(from, out);
    const p = easeOutCubic(t / 0.35);
    out.legLift = lerp(1.3, 0, p);
    out.y = lerp(groundY, 0, p) + 0.05 * hop(t / 0.35);
    out.eyeScale = lerp(from.eyeScale, 1, p);
  });
  b.add(0.45, (t, from, out) => {
    settlePose(from, out);
    out.roll = 0.2 * ring(t, 26, 7);
    out.hornBend = -0.25 * ring(t, 22, 6);
  });
  return b.build('slide');
}

/** Disappears behind the box, then peeks out from the other side. */
function hide(start: MascotPose) {
  const b = new PlanBuilder(start);
  const a0 = ellipseAngle(start.x, start.z);
  // Go round through the left (increasing angle) to reach the back.
  let back = -Math.PI / 2 + TAU;
  while (back - a0 > TAU) back -= TAU;
  while (back < a0) back += TAU;
  b.walkTo([ellipsePoint(a0), ...arc(a0, back)]);
  b.hold(1.2);
  const peekSpot: Pt = [0.48, -0.88];
  b.walkTo([peekSpot]);
  b.turnTo(FACE_CAMERA_YAW);
  b.hold(1.5, (t, out) => {
    // Leans out from behind the box edge, looks around, ducks back.
    const lean = smoothstep(0, 0.35, t) * (1 - smoothstep(1.2, 1.5, t));
    out.roll = -0.42 * lean;
    out.yaw = FACE_CAMERA_YAW + 0.25 * Math.sin(t * 3) * lean;
    out.eyeScale = 1 + 0.25 * pulse(progress(t, 0.5, 0.4));
  });
  b.hold(0.25, (t, out) => {
    out.y = 0.05 * hop(t / 0.25);
  });
  // Round the back corner rather than cutting across it.
  b.walkTo([ellipsePoint(-0.75), ellipsePoint(-0.3)]);
  return b.build('hide');
}

/** Investigates the loose ribbon draped down the front: poke, startle, poke. */
function ribbon(start: MascotPose) {
  const b = new PlanBuilder(start);
  const a0 = ellipseAngle(start.x, start.z);
  const approach = 2.05;
  const spot: Pt = [-0.52, 0.86];
  b.walkTo([ellipsePoint(a0), ...arc(a0, a0 + shortestAngle(a0, approach)), spot]);
  const facing = 1.78;
  b.turnTo(facing);
  const fx = Math.sin(facing);
  const fz = Math.cos(facing);
  b.hold(0.45, (t, out) => {
    out.roll = 0.15 * pulse(t / 0.45);
  });
  const poke = (t: number, out: MascotPose) => {
    out.pitch = 0.38 * pulse(t / 0.5);
    out.sz = 1 + 0.12 * pulse(t / 0.5);
  };
  b.hold(0.5, poke);
  b.add(
    0.35,
    (t, from, out) => {
      settlePose(from, out);
      const p = easeOutCubic(t / 0.35);
      out.x = from.x - fx * 0.05 * p;
      out.z = from.z - fz * 0.05 * p;
      out.y = 0.06 * hop(t / 0.35);
      out.eyeScale = 1 + 0.4 * pulse(t / 0.35);
      out.sy = 1 + 0.1 * pulse(t / 0.35);
    },
    // The first poke lands as the startle starts.
    { at: 0, type: 'ribbonPoke' },
  );
  b.hold(0.6, (t, out) => {
    out.roll = -0.18 * pulse(t / 0.6);
  });
  b.add(0.4, (t, from, out) => {
    settlePose(from, out);
    const p = easeInOutCubic(t / 0.4);
    out.x = from.x + fx * 0.05 * p;
    out.z = from.z + fz * 0.05 * p;
  });
  b.add(0.5, (t, from, out) => {
    copyPose(from, out);
    poke(t, out);
  }, { at: 0.25, type: 'ribbonPoke' });
  b.hold(0.75, (t, out) => {
    // Pleased little bounces.
    const k = t / 0.75;
    out.y = 0.04 * hop(progress(k, 0, 0.45)) + 0.04 * hop(progress(k, 0.5, 0.45));
    out.sy = 1 - 0.08 * pulse(progress(k, 0.42, 0.12)) - 0.08 * pulse(progress(k, 0.92, 0.08));
  });
  return b.build('ribbon');
}

function pause(start: MascotPose, rand: Rand) {
  const b = new PlanBuilder(start);
  if (rand() < 0.6) b.turnTo(FACE_CAMERA_YAW);
  const dur = 1.2 + rand();
  b.hold(dur, (t, out, from) => {
    out.yaw = from.yaw + 0.35 * Math.sin(t * 1.6) * pulse(t / dur);
  });
  return b.build('pause');
}

// --- Scheduler ------------------------------------------------------------

const WEIGHTS: [BehaviorName, number][] = [
  ['wander', 3],
  ['peek', 2],
  ['climb', 2],
  ['hide', 1.5],
  ['ribbon', 1.5],
];

export class BehaviorScheduler {
  private plan: Plan;
  private t = 0;
  private history: BehaviorName[] = [];

  constructor(
    start: MascotPose,
    private rand: Rand = Math.random,
  ) {
    this.plan = recover(start);
  }

  get current() {
    return this.plan.name;
  }

  /** Advances by `dt` seconds and writes the pose. Returns any event that fired. */
  update(dt: number, out: MascotPose): BehaviorEvent | null {
    const prev = this.t;
    this.t += dt;
    let event: BehaviorEvent | null = null;
    for (const e of this.plan.events) {
      if (e.at > prev && e.at <= this.t) event = e.type;
    }
    while (this.t >= this.plan.duration) {
      this.t -= this.plan.duration;
      this.plan = this.next(this.plan.end);
    }
    samplePlan(this.plan, this.t, out);
    return event;
  }

  private next(end: MascotPose): Plan {
    const last = this.plan.name;
    this.history.push(last);
    if (last === 'climb') return slide(end);
    if (last !== 'pause' && last !== 'recover' && this.rand() < 0.45) return pause(end, this.rand);

    const previous = this.history.filter((n) => n !== 'pause').at(-1);
    const options = WEIGHTS.filter(([name]) => name !== previous);
    const total = options.reduce((sum, [, w]) => sum + w, 0);
    let pick = this.rand() * total;
    for (const [name, w] of options) {
      pick -= w;
      if (pick <= 0) return build(name, end, this.rand);
    }
    return build('wander', end, this.rand);
  }
}

function build(name: BehaviorName, start: MascotPose, rand: Rand): Plan {
  switch (name) {
    case 'wander':
      return wander(start, rand);
    case 'peek':
      return peek(start);
    case 'climb':
      return climb(start, rand);
    case 'slide':
      return slide(start);
    case 'hide':
      return hide(start);
    case 'ribbon':
      return ribbon(start);
    case 'pause':
      return pause(start, rand);
    case 'recover':
      return recover(start);
  }
}

/** For reduced motion: standing calmly beside the open gift. */
export function staticPose() {
  return restPose(1.0, 0.35, FACE_CAMERA_YAW);
}
