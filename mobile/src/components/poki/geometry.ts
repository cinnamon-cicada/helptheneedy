import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { noise3 } from '../../animation/poki/math';

type Disposable = { dispose: () => void };

/**
 * Creates three.js resources once and disposes every geometry, material
 * and texture in the result when the component unmounts.
 */
export function useThreeResources<T extends Record<string, unknown>>(factory: () => T): T {
  const [resources] = useState(factory);
  useEffect(
    () => () => {
      for (const value of Object.values(resources)) {
        const list = Array.isArray(value) ? value : [value];
        for (const item of list) {
          if (item && typeof (item as Disposable).dispose === 'function') (item as Disposable).dispose();
        }
      }
    },
    [resources],
  );
  return resources;
}

/** Welds seams so normals come out smooth after deforming. */
export function smoothWelded(geometry: THREE.BufferGeometry) {
  geometry.deleteAttribute('uv');
  geometry.deleteAttribute('normal');
  const welded = mergeVertices(geometry, 1e-4);
  geometry.dispose();
  welded.computeVertexNormals();
  return welded;
}

/** Pushes vertices along their normals by a little noise: hand-made, not machined. */
export function wobble(geometry: THREE.BufferGeometry, amount: number, frequency = 6, seed = 0) {
  const pos = geometry.attributes.position;
  const nrm = geometry.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = noise3(x * frequency + seed, y * frequency - seed, z * frequency + seed * 0.5) * amount;
    pos.setXYZ(i, x + nrm.getX(i) * n, y + nrm.getY(i) * n, z + nrm.getZ(i) * n);
  }
  pos.needsUpdate = true;
  return geometry;
}

/**
 * Inverted-hull outline: a slightly inflated copy drawn back-face only. The
 * thickness wanders a little along the surface, like an ink line.
 */
export function outlineOf(geometry: THREE.BufferGeometry, thickness: number, seed = 3) {
  const hull = geometry.clone();
  const pos = hull.attributes.position;
  const nrm = hull.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = thickness * (1 + 0.45 * noise3(x * 9 + seed, y * 9, z * 9 - seed));
    pos.setXYZ(i, x + nrm.getX(i) * t, y + nrm.getY(i) * t, z + nrm.getZ(i) * t);
  }
  pos.needsUpdate = true;
  return hull;
}

/** Applies a position transform to every vertex (normals are left as they are). */
export function deform(geometry: THREE.BufferGeometry, fn: (v: THREE.Vector3) => void) {
  const pos = geometry.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    fn(v);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geometry.computeBoundingSphere();
  return geometry;
}

export function inkMaterial(color: string) {
  return new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
}

export function clayMaterial(color: string, roughness = 0.7) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
}

/** A smooth contact shadow evaluated per pixel, without low-resolution RGBA textures. */
export function shadowMaterial(color: string, opacity: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      shadowColor: { value: new THREE.Color(color) },
      shadowOpacity: { value: opacity },
    },
    vertexShader: `
      varying vec2 shadowUv;
      void main() {
        shadowUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 shadowColor;
      uniform float shadowOpacity;
      varying vec2 shadowUv;
      void main() {
        float radius = min(1.0, length(shadowUv - 0.5) * 2.0);
        float alpha = pow(1.0 - radius, 1.8) * shadowOpacity;
        gl_FragColor = vec4(shadowColor, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
  });
}
