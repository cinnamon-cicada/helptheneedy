import { Canvas } from '@react-three/fiber';

import type { Canvas3DProps } from './Canvas3D';

export { useFrame, useThree } from '@react-three/fiber';

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Web canvas. Throws without WebGL so the error boundary shows the 2D fallback. */
export function Canvas3D({ children, frameloop, onCreated }: Canvas3DProps) {
  if (!hasWebGL()) throw new Error('WebGL is not available');
  return (
    <Canvas
      style={{ position: 'absolute', inset: 0 }}
      orthographic
      flat
      dpr={[1, 2]}
      frameloop={frameloop}
      camera={{ zoom: 100, position: [0, 0, 30], near: 0.1, far: 100 }}
      onCreated={() => onCreated()}
    >
      {children}
    </Canvas>
  );
}
