/* eslint-disable react/no-unknown-property -- three.js elements (mesh, group…) take three.js props */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { BehaviorScheduler, staticPose } from '../../animation/poki/behaviors';
import {
  CAMERA,
  FOCUS_Y,
  GIFT_EXTENT,
  LID_REST,
  PALETTE,
  ROPE_KNOT,
  STAGE_EXTENT,
} from '../../animation/poki/dims';
import {
  type BoxPose,
  type LidPose,
  introBoxPose,
  introEndPose,
  introLidPose,
  introMascotPose,
  ribbonUnroll,
  ropeState,
} from '../../animation/poki/intro';
import { clamp01, dampTo, easeOutBack, easeOutCubic, lerp, progress } from '../../animation/poki/math';
import { copyPose, restPose } from '../../animation/poki/pose';
import { REACTION_DURATION, applyReaction } from '../../animation/poki/reactions';
import type { MascotReaction, MascotSignals } from '../../animation/poki/signals';
import { INTRO, type IntroClock } from '../../animation/poki/timeline';
import { useFrame, useThree } from './Canvas3D';
import { clayMaterial, useThreeResources } from './geometry';
import { GiftBox, type GiftBoxHandle } from './GiftBox';
import { GiftExplosion, type GiftExplosionHandle } from './GiftExplosion';
import { PokiMascot, type PokiMascotHandle } from './PokiMascot';

/** The gift area in canvas pixels, from the screen layout. */
export type StageLayout = { centerY: number; width: number; height: number };

type Props = {
  clock: IntroClock;
  signals: MascotSignals;
  stage: StageLayout;
  reducedMotion: boolean;
};

const CAMERA_DIR = new THREE.Vector3(
  Math.sin(CAMERA.azimuth) * Math.cos(CAMERA.elevation),
  Math.sin(CAMERA.elevation),
  Math.cos(CAMERA.azimuth) * Math.cos(CAMERA.elevation),
);
/** Long enough after the burst that every intro animation has settled. */
const SETTLED_T = INTRO.revealEnd + 30;

function introZoom(width: number, height: number) {
  return Math.min((width * 0.62) / GIFT_EXTENT.w, (height * 0.36) / GIFT_EXTENT.h);
}

function stageZoom(stage: StageLayout, max: number) {
  return Math.min((stage.width * 0.94) / STAGE_EXTENT.w, (stage.height * 0.92) / STAGE_EXTENT.h, max);
}

function createSim() {
  return {
    pose: restPose(),
    base: restPose(),
    box: {} as BoxPose,
    lid: {} as LidPose,
    scheduler: null as BehaviorScheduler | null,
    reaction: null as { kind: MascotReaction; t: number } | null,
    pokeAge: 99,
    time: 0,
    blinkIn: 2.5,
    bowTarget: 0,
    bowAge: 0,
    zoom: 0,
    shift: 0,
    confettiMoving: true,
    hand: new THREE.Vector3(),
    knot: new THREE.Vector3(),
    mid: new THREE.Vector3(),
    dir: new THREE.Vector3(),
  };
}
type Sim = ReturnType<typeof createSim>;

/** Points a unit-height cylinder from `a` to `b`. */
function span(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, dir: THREE.Vector3) {
  dir.subVectors(b, a);
  const len = dir.length();
  mesh.position.addVectors(a, b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, dir.normalize());
  mesh.scale.set(1, len, 1);
}

/**
 * The single frame loop for the auth scene. It reads the shared intro clock,
 * runs the intro choreography and then the idle behaviour scheduler, layers
 * form reactions on top, and moves the camera between the intro framing and
 * the gift area above the form.
 */
export function MascotAnimationController({ clock, signals, stage, reducedMotion }: Props) {
  const mascot = useRef<PokiMascotHandle>(null);
  const gift = useRef<GiftBoxHandle>(null);
  const explosion = useRef<GiftExplosionHandle>(null);
  const ropeA = useRef<THREE.Mesh>(null);
  const ropeB = useRef<THREE.Mesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  const stageRef = useRef(stage);

  const res = useThreeResources(() => ({
    rope: new THREE.CylinderGeometry(0.0075, 0.0075, 1, 6),
    ropeMat: clayMaterial(PALETTE.rope, 0.85),
  }));

  const simRef = useRef<Sim | null>(null);

  useEffect(() => {
    stageRef.current = stage;
    invalidate();
  }, [stage, invalidate]);

  useEffect(
    () =>
      signals.subscribe((kind) => {
        const sim = (simRef.current ??= createSim());
        if (kind === 'signup') sim.bowTarget = 1;
        // A passing glance never cuts a bigger reaction short.
        if (kind === 'glance' && sim.reaction && sim.reaction.kind !== 'glance') return;
        sim.reaction = { kind, t: 0 };
        invalidate();
      }),
    [signals, invalidate],
  );

  useFrame((state, rawDelta) => {
    const sim = (simRef.current ??= createSim());
    const dt = Math.min(rawDelta, 1 / 20);
    sim.time += dt;
    const t = reducedMotion ? SETTLED_T : clock.elapsed();
    const { size, camera } = state;
    const st = stageRef.current;

    // --- Camera: centred on the gift, then up into the gift area ----------
    const zIntro = introZoom(size.width, size.height);
    const zStage = stageZoom(st, zIntro);
    const shiftStage = size.height / 2 - st.centerY;
    let zoom: number;
    let shift: number;
    if (t < INTRO.revealStart) {
      zoom = zIntro;
      shift = 0;
    } else if (t < INTRO.revealEnd) {
      // Ease-out: the gift starts rising at once, so the form never covers it.
      const k = easeOutCubic(progress(t, INTRO.revealStart, INTRO.revealEnd - INTRO.revealStart));
      zoom = lerp(zIntro, zStage, k);
      shift = lerp(0, shiftStage, k);
    } else if (reducedMotion || sim.zoom === 0) {
      zoom = zStage;
      shift = shiftStage;
    } else {
      // Login ↔ signup resizes the gift area; glide rather than jump.
      zoom = dampTo(sim.zoom, zStage, 9, dt);
      shift = dampTo(sim.shift, shiftStage, 9, dt);
    }
    sim.zoom = zoom;
    sim.shift = shift;
    camera.position.set(CAMERA_DIR.x * CAMERA.distance, FOCUS_Y + CAMERA_DIR.y * CAMERA.distance, CAMERA_DIR.z * CAMERA.distance);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, FOCUS_Y, 0);
    camera.translateY(-shift / zoom);
    camera.zoom = zoom;
    camera.updateProjectionMatrix();

    // The mascot starts just off the left edge, the box further behind it.
    const halfWorld = size.width / 2 / zIntro / Math.cos(CAMERA.azimuth);
    const startX = -Math.min(halfWorld + 1.35, 4.5);

    // --- Gift -------------------------------------------------------------
    introBoxPose(t, startX, sim.box);
    introLidPose(t, sim.box, sim.lid);
    const g = gift.current;
    if (g) {
      g.applyBox(sim.box);
      const airborne = t < INTRO.burst ? 1 : clamp01((sim.lid.y - LID_REST.y) / 1.0);
      g.applyLid(sim.lid, airborne);
      g.setOpen(t >= INTRO.burst);
      sim.pokeAge += dt;
      const sway = reducedMotion ? 0 : 0.45 * Math.exp(-2.2 * sim.pokeAge) + 0.03;
      g.applyRibbon(ribbonUnroll(t), sway, sim.time);
    }
    if (explosion.current && sim.confettiMoving) {
      sim.confettiMoving = explosion.current.apply(t - INTRO.burst);
    }

    // --- Mascot -----------------------------------------------------------
    const pose = sim.pose;
    if (reducedMotion) {
      copyPose(staticPose(), pose);
    } else if (t < INTRO.revealEnd) {
      introMascotPose(t, startX, pose);
    } else {
      if (!sim.scheduler) {
        sim.scheduler = new BehaviorScheduler(introEndPose(restPose()));
        sim.scheduler.update(0, sim.base);
      }
      // Reactions pause the behaviour where it is, then let it carry on.
      if (!sim.reaction && sim.scheduler.update(dt, sim.base) === 'ribbonPoke') sim.pokeAge = 0;
      copyPose(sim.base, pose);
      if (sim.reaction) {
        applyReaction(sim.reaction.kind, sim.reaction.t, pose);
        sim.reaction.t += dt;
        if (sim.reaction.t > REACTION_DURATION[sim.reaction.kind]) sim.reaction = null;
      }
    }
    if (!sim.scheduler || reducedMotion) sim.reaction = null;

    if (!reducedMotion) {
      // Breathing and the occasional blink keep it alive between actions.
      pose.sy *= 1 + 0.012 * Math.sin(sim.time * 2.4);
      sim.blinkIn -= dt;
      if (sim.blinkIn < 0) {
        pose.eyeScale *= 0.12;
        if (sim.blinkIn < -0.11) sim.blinkIn = 2 + Math.random() * 3.5;
      }
    }

    const m = mascot.current;
    if (m) {
      m.apply(pose);
      if (sim.bowTarget > 0) sim.bowAge += dt;
      m.setBow(reducedMotion ? sim.bowTarget : sim.bowTarget * easeOutBack(progress(sim.bowAge, 0.35, 0.4), 2.2));
    }

    // --- Rope -------------------------------------------------------------
    const rope = ropeState(t);
    if (ropeA.current && ropeB.current) {
      ropeA.current.visible = ropeB.current.visible = rope.visible && !reducedMotion;
      if (rope.visible && m) {
        const b = sim.box;
        const c = Math.cos(b.rotZ);
        const s = Math.sin(b.rotZ);
        sim.knot.set(b.x + ROPE_KNOT.x * c - ROPE_KNOT.y * b.sy * s, ROPE_KNOT.x * s + ROPE_KNOT.y * b.sy * c, ROPE_KNOT.z);
        m.handWorld(sim.hand);
        sim.mid.addVectors(sim.hand, sim.knot).multiplyScalar(0.5);
        sim.mid.y -= rope.sag;
        span(ropeA.current, sim.knot, sim.mid, sim.dir);
        span(ropeB.current, sim.mid, sim.hand, sim.dir);
      }
    }
  });

  return (
    <group>
      <GiftBox ref={gift} />
      <GiftExplosion ref={explosion} />
      <PokiMascot ref={mascot} />
      <mesh ref={ropeA} geometry={res.rope} material={res.ropeMat} visible={false} />
      <mesh ref={ropeB} geometry={res.rope} material={res.ropeMat} visible={false} />
    </group>
  );
}
