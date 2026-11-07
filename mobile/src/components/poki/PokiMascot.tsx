/* eslint-disable react/no-unknown-property -- three.js elements (mesh, group…) take three.js props */
import { useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';

import { MASCOT, PALETTE } from '../../animation/poki/dims';
import type { MascotPose } from '../../animation/poki/pose';
import {
  clayMaterial,
  deform,
  inkMaterial,
  outlineOf,
  shadowMaterial,
  smoothWelded,
  useThreeResources,
  wobble,
} from './geometry';

export type PokiMascotHandle = {
  apply: (pose: MascotPose) => void;
  /** 0–1: the little bow it earns on signup. */
  setBow: (scale: number) => void;
  /** Where the rope meets its hands, in world space. */
  handWorld: (target: THREE.Vector3) => THREE.Vector3;
};

const R = MASCOT.bodyR;
const HORN_H = 0.12;
const HIP_Y = -(MASCOT.centerY - MASCOT.legLen - 0.011);
const OUTLINE = 0.011;

function createResources() {
  // Nearly round, a touch flattened and bottom-heavy, with a hand-made wobble.
  const body = smoothWelded(new THREE.SphereGeometry(R, 40, 30));
  deform(body, (v) => {
    const below = Math.max(0, -v.y / R);
    v.x *= 1 + 0.05 * below;
    v.z *= 1 + 0.04 * below;
    v.y *= 0.95;
  });
  body.computeVertexNormals();
  wobble(body, 0.006, 7, 1.3);

  // One asymmetric horn, curving off to one side.
  const horn = smoothWelded(new THREE.ConeGeometry(0.042, HORN_H, 20, 8));
  deform(horn, (v) => {
    const k = (v.y + HORN_H / 2) / HORN_H;
    v.x += 0.035 * k * k;
  });
  horn.computeVertexNormals();

  const eye = new THREE.SphereGeometry(0.0145, 14, 10);
  const leg = new THREE.CylinderGeometry(0.0095, 0.0105, MASCOT.legLen, 8);
  leg.translate(0, -MASCOT.legLen / 2, 0);
  const foot = new THREE.SphereGeometry(0.019, 12, 8);
  foot.scale(1, 0.55, 1.35);
  const arm = new THREE.CapsuleGeometry(0.011, 0.05, 4, 8);
  arm.rotateX(Math.PI / 2);
  arm.translate(0, 0, 0.03);
  const bowLoop = new THREE.TorusGeometry(0.026, 0.009, 8, 18);
  const bowKnot = new THREE.SphereGeometry(0.012, 10, 8);
  const shadowGeo = new THREE.PlaneGeometry(1, 1);
  shadowGeo.rotateX(-Math.PI / 2);

  return {
    body,
    bodyInk: outlineOf(body, OUTLINE, 2),
    horn,
    hornInk: outlineOf(horn, OUTLINE * 0.8, 5),
    eye,
    leg,
    foot,
    arm,
    bowLoop,
    bowKnot,
    shadowGeo,
    clay: clayMaterial(PALETTE.mascot, 0.62),
    clayShade: clayMaterial(PALETTE.mascotShade, 0.7),
    eyeMat: clayMaterial(PALETTE.eye, 0.25),
    bowMat: clayMaterial('#F29B65', 0.55),
    ink: inkMaterial(PALETTE.ink),
    shadowMat: shadowMaterial(PALETTE.shadow, 0.3),
  };
}

/**
 * The poki mascot: a nearly round orange body, one off-centre horn, two dot
 * eyes, two short thin legs and no mouth. Personality comes from the pose.
 */
export function PokiMascot({ ref }: { ref?: React.Ref<PokiMascotHandle> }) {
  const res = useThreeResources(createResources);
  const root = useRef<THREE.Group>(null);
  const lift = useRef<THREE.Group>(null);
  const lean = useRef<THREE.Group>(null);
  const squash = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const horn = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Mesh>(null);
  const eyeR = useRef<THREE.Mesh>(null);
  const arms = useRef<THREE.Group>(null);
  const hipL = useRef<THREE.Group>(null);
  const hipR = useRef<THREE.Group>(null);
  const bow = useRef<THREE.Group>(null);
  const hand = useRef<THREE.Object3D>(null);
  const shadow = useRef<THREE.Mesh>(null);

  useImperativeHandle(ref, () => ({
    apply(p) {
      if (!root.current) return;
      root.current.position.set(p.x, 0, p.z);
      root.current.rotation.y = p.yaw;
      lift.current!.position.y = p.y;
      lean.current!.rotation.set(p.pitch, 0, p.roll);
      squash.current!.scale.set(p.sx, p.sy, p.sz);
      spin.current!.rotation.set(p.tumble, 0, p.tumbleRoll);
      horn.current!.rotation.z = -0.32 - p.hornBend * 0.6;
      // Scale each eye in place so wide eyes don't drift off the face.
      const round = Math.max(1, p.eyeScale * 0.9);
      eyeL.current!.scale.set(round, Math.max(0.12, p.eyeScale), round);
      eyeR.current!.scale.copy(eyeL.current!.scale);
      const a = Math.max(0.0001, p.arms);
      arms.current!.scale.setScalar(a);
      arms.current!.visible = p.arms > 0.01;
      hipL.current!.rotation.x = -p.legLift + p.legSwing;
      hipR.current!.rotation.x = -p.legLift - p.legSwing;
      // Shadow stays on the floor and fades as it hops; hidden when it is up on the box.
      const height = Math.max(0, p.y);
      const s = 1 / (1 + height * 2.5);
      shadow.current!.position.y = 0.004 - p.y;
      shadow.current!.scale.set(0.42 * s, 1, 0.36 * s);
      shadow.current!.visible = p.y < 0.5;
    },
    setBow(scale) {
      if (!bow.current) return;
      bow.current.visible = scale > 0.01;
      bow.current.scale.setScalar(Math.max(0.0001, scale));
    },
    handWorld(target) {
      return hand.current ? hand.current.getWorldPosition(target) : target;
    },
  }));

  return (
    <group ref={root}>
      <group ref={lift}>
        <mesh ref={shadow} geometry={res.shadowGeo} material={res.shadowMat} renderOrder={-1} />
        <group ref={lean}>
          <group ref={squash}>
            <group ref={spin} position={[0, MASCOT.centerY, 0]}>
              <mesh geometry={res.body} material={res.clay} />
              <mesh geometry={res.bodyInk} material={res.ink} />

              <group ref={horn} position={[0.035, R * 0.84, -0.005]} rotation={[0, 0, -0.32]}>
                <mesh geometry={res.horn} material={res.clay} position={[0, HORN_H / 2 - 0.018, 0]} />
                <mesh geometry={res.hornInk} material={res.ink} position={[0, HORN_H / 2 - 0.018, 0]} />
                <group ref={bow} position={[-0.005, 0.03, 0]} visible={false}>
                  <mesh geometry={res.bowLoop} material={res.bowMat} position={[-0.026, 0, 0]} rotation={[0, 0.4, 0.5]} scale={[1, 0.7, 1]} />
                  <mesh geometry={res.bowLoop} material={res.bowMat} position={[0.024, 0, 0]} rotation={[0, -0.4, -0.6]} scale={[0.9, 0.7, 1]} />
                  <mesh geometry={res.bowKnot} material={res.bowMat} />
                </group>
              </group>

              {/* Slightly uneven placement keeps the face from looking stamped on. */}
              <mesh ref={eyeL} geometry={res.eye} material={res.eyeMat} position={[-0.047, 0.026, R * 0.93]} />
              <mesh ref={eyeR} geometry={res.eye} material={res.eyeMat} position={[0.041, 0.02, R * 0.94]} />

              <group ref={arms} visible={false}>
                <mesh geometry={res.arm} material={res.clay} position={[-0.06, -0.035, R * 0.75]} rotation={[0.2, 0.55, 0]} />
                <mesh geometry={res.arm} material={res.clay} position={[0.06, -0.035, R * 0.75]} rotation={[0.2, -0.55, 0]} />
              </group>
              <object3D ref={hand} position={[0, -0.03, R + 0.05]} />

              <group ref={hipL} position={[-0.046, HIP_Y, 0.005]}>
                <mesh geometry={res.leg} material={res.clayShade} />
                <mesh geometry={res.foot} material={res.clayShade} position={[0, -MASCOT.legLen, 0.008]} />
              </group>
              <group ref={hipR} position={[0.044, HIP_Y, -0.004]}>
                <mesh geometry={res.leg} material={res.clayShade} />
                <mesh geometry={res.foot} material={res.clayShade} position={[0, -MASCOT.legLen, 0.008]} />
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
