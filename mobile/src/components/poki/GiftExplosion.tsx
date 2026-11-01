/* eslint-disable react/no-unknown-property -- three.js elements (mesh, group…) take three.js props */
import { useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';

import {
  CONFETTI_CURLS,
  CONFETTI_FLAKES,
  type Particle,
  type ParticleFrame,
  createConfetti,
  particleAt,
} from '../../animation/poki/confetti';
import { useThreeResources } from './geometry';

export type GiftExplosionHandle = {
  /** `u` is seconds since the burst. Returns false once nothing moves any more. */
  apply: (u: number) => boolean;
};

/** A short curling streamer, built once and shared by every instance. */
function curlGeometry() {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const a = t * Math.PI * 2.6;
    points.push(new THREE.Vector3(Math.cos(a) * 0.035 * (1 - t * 0.3), t * 0.2 - 0.1, Math.sin(a) * 0.035));
  }
  const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 40, 0.0085, 5, false);
  tube.scale(1, 1, 0.45);
  return tube;
}

type Sim = {
  flakes: Particle[];
  curls: Particle[];
  settleAt: number;
  lastU: number;
  painted: boolean;
  frame: ParticleFrame;
  obj: THREE.Object3D;
  color: THREE.Color;
};

function createSim(): Sim {
  const pieces = createConfetti();
  return {
    flakes: pieces.filter((p) => p.kind === 'flake'),
    curls: pieces.filter((p) => p.kind === 'curl'),
    settleAt: Math.max(...pieces.map((p) => (Number.isFinite(p.landAt) ? p.landAt : 4.3))) + 0.8,
    lastU: -1,
    painted: false,
    frame: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, scale: 0 },
    obj: new THREE.Object3D(),
    color: new THREE.Color(),
  };
}

function write(sim: Sim, mesh: THREE.InstancedMesh | null, list: Particle[], u: number) {
  if (!mesh) return;
  if (!sim.painted) {
    list.forEach((p, i) => mesh.setColorAt(i, sim.color.set(p.color)));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  list.forEach((p, i) => {
    particleAt(p, u, sim.frame);
    sim.obj.position.set(sim.frame.x, sim.frame.y, sim.frame.z);
    sim.obj.rotation.set(sim.frame.rx, sim.frame.ry, sim.frame.rz);
    sim.obj.scale.setScalar(Math.max(sim.frame.scale, 1e-4));
    sim.obj.updateMatrix();
    mesh.setMatrixAt(i, sim.obj.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.visible = u > 0;
}

/** Confetti and streamers bursting out of the gift, then settling around it. */
export function GiftExplosion({ ref }: { ref?: React.Ref<GiftExplosionHandle> }) {
  const res = useThreeResources(() => ({
    flakeGeo: new THREE.PlaneGeometry(0.048, 0.072),
    curlGeo: curlGeometry(),
    material: new THREE.MeshStandardMaterial({ roughness: 0.75, side: THREE.DoubleSide }),
  }));
  const flakeMesh = useRef<THREE.InstancedMesh>(null);
  const curlMesh = useRef<THREE.InstancedMesh>(null);
  const simRef = useRef<Sim | null>(null);

  useImperativeHandle(ref, () => ({
    apply(u) {
      const sim = (simRef.current ??= createSim());
      const settled = u > sim.settleAt;
      // Nothing moves once everything has landed: stop rewriting matrices.
      if (settled && sim.lastU > sim.settleAt) return false;
      sim.lastU = u;
      write(sim, flakeMesh.current, sim.flakes, u);
      write(sim, curlMesh.current, sim.curls, u);
      sim.painted = true;
      return !settled;
    },
  }));

  return (
    <group>
      <instancedMesh
        ref={flakeMesh}
        args={[res.flakeGeo, res.material, CONFETTI_FLAKES]}
        frustumCulled={false}
        visible={false}
      />
      <instancedMesh
        ref={curlMesh}
        args={[res.curlGeo, res.material, CONFETTI_CURLS]}
        frustumCulled={false}
        visible={false}
      />
    </group>
  );
}
