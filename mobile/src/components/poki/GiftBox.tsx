/* eslint-disable react/no-unknown-property -- three.js elements (mesh, group…) take three.js props */
import { useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import { BOX, LID, PALETTE, RIBBON } from '../../animation/poki/dims';
import type { BoxPose, LidPose } from '../../animation/poki/intro';
import { ribbonSegmentProgress } from '../../animation/poki/intro';
import { lerp } from '../../animation/poki/math';
import {
  clayMaterial,
  deform,
  inkMaterial,
  outlineOf,
  shadowMaterial,
  useThreeResources,
  wobble,
} from './geometry';

export type GiftBoxHandle = {
  applyBox: (pose: BoxPose) => void;
  applyLid: (pose: LidPose, airborne: number) => void;
  /** Shows the open top once the lid is off. */
  setOpen: (open: boolean) => void;
  /** unroll: 0–1 after the burst; sway: lateral swing in radians. */
  applyRibbon: (unroll: number, sway: number, time: number) => void;
};

const BAND = 0.17;
const BAND_X = 0.08;
const BAND_Z = -0.06;
const INK = 0.013;

/** Tapers toward the top and leans a hair: a hand-folded box, not a render. */
function boxShape(v: THREE.Vector3) {
  const k = v.y / BOX.h;
  v.x = v.x * (1 - 0.035 * k) + 0.012 * k;
  v.z *= 1 - 0.03 * k;
}

const TOP_W = BOX.w * (1 - 0.035);
const TOP_D = BOX.d * (1 - 0.03);

/** Draped ribbon's resting bends: down the front face, onto the floor, a curl. */
const RIBBON_ANGLES = [-0.018, 0, 0, 0, -1.28, -0.55];
const RIBBON_CURLED = 1.15;

function createResources() {
  const body = new RoundedBoxGeometry(BOX.w, BOX.h, BOX.d, 5, BOX.radius);
  body.translate(0, BOX.h / 2, 0);
  const bodyInk = outlineOf(body, INK, 4);
  deform(body, boxShape);
  deform(bodyInk, boxShape);
  wobble(body, 0.001, 3, 2.1);

  const bandFront = new THREE.BoxGeometry(BAND, BOX.h - 0.006, BOX.d + 0.016, 1, 6, 1);
  bandFront.translate(BAND_X, BOX.h / 2 - 0.003, 0);
  deform(bandFront, boxShape);
  const bandSide = new THREE.BoxGeometry(BOX.w + 0.016, BOX.h - 0.006, BAND, 1, 6, 1);
  bandSide.translate(0, BOX.h / 2 - 0.003, BAND_Z);
  deform(bandSide, boxShape);

  // The open top: a shaded floor inside the rim, darker under the front wall.
  const insideW = TOP_W - 0.19;
  const insideD = TOP_D - 0.19;
  const inside = new THREE.PlaneGeometry(insideW, insideD, 1, 6);
  inside.rotateX(-Math.PI / 2);
  inside.translate(0.012, BOX.h + 0.008, 0);
  const deep = new THREE.Color(PALETTE.insideDeep);
  const light = new THREE.Color(PALETTE.inside);
  const colors: number[] = [];
  const pos = inside.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const c = deep.clone().lerp(light, 1 - (pos.getZ(i) / insideD + 0.5));
    colors.push(c.r, c.g, c.b);
  }
  inside.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const lid = new RoundedBoxGeometry(LID.w, LID.h, LID.d, 4, LID.radius);
  deform(lid, (v) => {
    // A slightly uneven lid: one corner sits just above the others.
    v.y += 0.002 * (v.x / LID.w) * (v.z / LID.d) * 4;
  });
  const lidInk = outlineOf(lid, INK, 6);
  wobble(lid, 0.001, 3, 4.2);
  const lidBandA = new THREE.BoxGeometry(BAND, LID.h + 0.014, LID.d + 0.014);
  lidBandA.translate(BAND_X, 0, 0);
  const lidBandB = new THREE.BoxGeometry(LID.w + 0.014, LID.h + 0.014, BAND);
  lidBandB.translate(0, 0, BAND_Z);

  const loop = new THREE.TorusGeometry(0.12, 0.034, 12, 32);
  const loopInk = outlineOf(loop, 0.008, 7);
  const knot = new THREE.SphereGeometry(0.05, 16, 12);
  knot.scale(1, 0.8, 0.9);
  const tail = new THREE.BoxGeometry(0.075, 0.012, 0.26);
  tail.translate(0, 0, 0.13);

  const segments = RIBBON.segments.map((len) => {
    const g = new THREE.BoxGeometry(RIBBON.width, len + 0.004, 0.012);
    g.translate(0, -len / 2, 0);
    return g;
  });

  const shadowGeo = new THREE.PlaneGeometry(1, 1);
  shadowGeo.rotateX(-Math.PI / 2);

  return {
    body,
    bodyInk,
    bandFront,
    bandSide,
    inside,
    lid,
    lidInk,
    lidBandA,
    lidBandB,
    loop,
    loopInk,
    knot,
    tail,
    segments,
    shadowGeo,
    ivory: clayMaterial(PALETTE.ivory, 0.85),
    ribbon: clayMaterial(PALETTE.ribbon, 0.55),
    ribbonDeep: clayMaterial(PALETTE.ribbonDeep, 0.6),
    // Pulled toward the camera so the wobbly top surface never pokes through.
    insideMat: new THREE.MeshBasicMaterial({
      vertexColors: true,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    }),
    ink: inkMaterial(PALETTE.ink),
    boxShadow: shadowMaterial(PALETTE.shadow, 0.26),
    lidShadow: shadowMaterial(PALETTE.shadow, 0.2),
  };
}

/** An oversized ivory gift with a golden ribbon, a lid that pops, and a loose ribbon. */
export function GiftBox({ ref }: { ref?: React.Ref<GiftBoxHandle> }) {
  const res = useThreeResources(createResources);
  const box = useRef<THREE.Group>(null);
  const inside = useRef<THREE.Mesh>(null);
  const lid = useRef<THREE.Group>(null);
  const loops = useRef<THREE.Group>(null);
  const boxShadow = useRef<THREE.Mesh>(null);
  const lidShadow = useRef<THREE.Mesh>(null);
  const ribbon = useRef<THREE.Group>(null);
  const joints = useRef<(THREE.Group | null)[]>([]);

  useImperativeHandle(ref, () => ({
    applyBox(p) {
      if (!box.current) return;
      box.current.position.x = p.x;
      box.current.rotation.z = p.rotZ;
      box.current.scale.set(p.sx, p.sy, p.sz);
      boxShadow.current!.position.x = p.x;
    },
    applyLid(p, airborne) {
      if (!lid.current) return;
      lid.current.position.set(p.x, p.y, p.z);
      lid.current.rotation.set(p.rotX, p.rotY, p.rotZ);
      loops.current!.scale.set(1 + 0.12 * p.bowBounce, 1 - 0.28 * p.bowBounce, 1);
      // While closed the box's own shadow covers it; once it lands, it casts its own.
      lidShadow.current!.visible = airborne < 1;
      lidShadow.current!.position.set(p.x - 0.08, 0.003, p.z);
      res.lidShadow.uniforms.shadowOpacity.value = 0.2 * (1 - airborne);
    },
    setOpen(open) {
      if (inside.current) inside.current.visible = open;
    },
    applyRibbon(unroll, sway, time) {
      if (!ribbon.current) return;
      ribbon.current.visible = unroll > 0;
      joints.current.forEach((joint, i) => {
        if (!joint) return;
        const k = ribbonSegmentProgress(unroll, i);
        const rest = RIBBON_ANGLES[i];
        joint.rotation.x = lerp(i === 0 ? 0.6 : RIBBON_CURLED, rest, k);
        const swing = sway * ((i + 1) / RIBBON_ANGLES.length) * Math.sin(time * 7 + i * 0.6);
        // Hanging parts swing sideways; the parts on the floor wiggle in place.
        if (i < 4) joint.rotation.z = swing;
        else joint.rotation.y = swing * 1.5;
      });
    },
  }));

  // Builds the draped ribbon as a chain: each segment hangs off the previous.
  const chain = RIBBON.segments.reduceRight<React.ReactNode>(
    (child, len, i) => (
      <group
        ref={(g) => {
          joints.current[i] = g;
        }}
        position={[0, i === 0 ? 0 : -RIBBON.segments[i - 1], 0]}
      >
        <mesh geometry={res.segments[i]} material={res.ribbonDeep} />
        {child}
      </group>
    ),
    null,
  );

  return (
    <group>
      <mesh
        ref={boxShadow}
        geometry={res.shadowGeo}
        material={res.boxShadow}
        position={[0, 0.002, 0.08]}
        scale={[2.0, 1, 1.75]}
        renderOrder={-1}
      />
      <mesh
        ref={lidShadow}
        geometry={res.shadowGeo}
        material={res.lidShadow}
        scale={[0.75, 1, 1.5]}
        visible={false}
        renderOrder={-1}
      />

      <group ref={box}>
        <mesh geometry={res.body} material={res.ivory} />
        <mesh geometry={res.bodyInk} material={res.ink} />
        <mesh geometry={res.bandFront} material={res.ribbon} />
        <mesh geometry={res.bandSide} material={res.ribbonDeep} />
        <mesh ref={inside} geometry={res.inside} material={res.insideMat} visible={false} />
        <group ref={ribbon} position={[RIBBON.anchor.x, RIBBON.anchor.y, RIBBON.anchor.z]} visible={false}>
          {chain}
        </group>
      </group>

      <group ref={lid}>
        <mesh geometry={res.lid} material={res.ivory} />
        <mesh geometry={res.lidInk} material={res.ink} />
        <mesh geometry={res.lidBandA} material={res.ribbon} />
        <mesh geometry={res.lidBandB} material={res.ribbonDeep} />
        <group position={[BAND_X, LID.h / 2 + 0.02, BAND_Z]}>
          <group ref={loops}>
            {/* Two loops of different sizes, tipped outward at different angles. */}
            <group position={[-0.12, 0.08, 0]} rotation={[0, 0.35, 0.55]}>
              <mesh geometry={res.loop} material={res.ribbon} scale={[1, 0.72, 0.6]} />
              <mesh geometry={res.loopInk} material={res.ink} scale={[1, 0.72, 0.6]} />
            </group>
            <group position={[0.105, 0.07, 0.01]} rotation={[0, -0.4, -0.68]}>
              <mesh geometry={res.loop} material={res.ribbon} scale={[0.86, 0.66, 0.6]} />
              <mesh geometry={res.loopInk} material={res.ink} scale={[0.86, 0.66, 0.6]} />
            </group>
          </group>
          <mesh geometry={res.knot} material={res.ribbonDeep} position={[0, 0.02, 0]} />
          <mesh geometry={res.tail} material={res.ribbonDeep} position={[-0.02, 0, 0.02]} rotation={[0.08, 0.5, 0]} />
          <mesh geometry={res.tail} material={res.ribbon} position={[0.02, 0, 0.02]} rotation={[0.05, -0.38, 0]} scale={[1, 1, 0.85]} />
        </group>
      </group>
    </group>
  );
}
