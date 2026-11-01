import { Canvas } from '@react-three/fiber/native';
import { StyleSheet } from 'react-native';

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
      frameloop={frameloop}
      camera={{ zoom: 100, position: [0, 0, 30], near: 0.1, far: 100 }}
      onCreated={() => onCreated()}
    >
      {children}
    </Canvas>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
