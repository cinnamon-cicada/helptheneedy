import { Canvas } from '@react-three/fiber/native';
import { StyleSheet } from 'react-native';

import { colors } from '../../theme';

export { useFrame, useThree } from '@react-three/fiber/native';

export type Canvas3DProps = {
  children: React.ReactNode;
  frameloop: 'always' | 'demand' | 'never';
  onCreated: () => void;
};

/** Native canvas (expo-gl). Orthographic and untonemapped so brand colours stay true. */
export function Canvas3D({ children, frameloop, onCreated }: Canvas3DProps) {
  return (
    <Canvas
      style={styles.fill}
      orthographic
      flat
      gl={{ alpha: false, antialias: true, precision: 'highp' }}
      frameloop={frameloop}
      camera={{ zoom: 100, position: [0, 0, 30], near: 0.1, far: 100 }}
      onCreated={({ gl, scene, camera }) => {
        // Present a white frame immediately instead of an uninitialized GL surface.
        gl.setClearColor(colors.white, 1);
        gl.render(scene, camera);
        onCreated();
      }}
    >
      {children}
    </Canvas>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1, backgroundColor: colors.white } });
