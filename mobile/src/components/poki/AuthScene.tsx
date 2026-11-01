/* eslint-disable react/no-unknown-property -- three.js elements (mesh, group…) take three.js props */
import { Component, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import type { MascotSignals } from '../../animation/poki/signals';
import type { IntroClock } from '../../animation/poki/timeline';
import { colors } from '../../theme';
import { AuthSceneFallback } from './AuthSceneFallback';
import { Canvas3D } from './Canvas3D';
import { MascotAnimationController, type StageLayout } from './MascotAnimationController';

export type { StageLayout };

type Props = {
  clock: IntroClock;
  signals: MascotSignals;
  stage: StageLayout;
  reducedMotion: boolean;
  /** Called once if 3D can't run, so the screen can skip the intro. */
  onFallback: () => void;
};

/** If the GL context never comes up, fall back rather than show a blank stage. */
const CREATE_TIMEOUT_MS = 5000;

class SceneErrorBoundary extends Component<{ onError: () => void; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function useAppActive() {
  const [active, setActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}

/**
 * Full-screen 3D layer behind the auth UI. It never takes touches, renders
 * only while the app is visible, and only on demand under reduced motion.
 */
export function AuthScene({ clock, signals, stage, reducedMotion, onFallback }: Props) {
  const [failed, setFailed] = useState(false);
  const created = useRef(false);
  const active = useAppActive();

  useEffect(() => {
    if (!active || failed) return;
    const id = setTimeout(() => {
      if (!created.current) setFailed(true);
    }, CREATE_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [active, failed]);

  useEffect(() => {
    if (failed) onFallback();
  }, [failed, onFallback]);

  if (failed) {
    return <AuthSceneFallback stage={stage} signals={signals} reducedMotion={reducedMotion} />;
  }

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <SceneErrorBoundary onError={() => setFailed(true)}>
        <Canvas3D
          frameloop={!active ? 'never' : reducedMotion ? 'demand' : 'always'}
          onCreated={() => {
            created.current = true;
          }}
        >
          <color attach="background" args={[colors.white]} />
          {/* Soft studio light: warm sky, beige bounce, one gentle key and a rim. */}
          <hemisphereLight args={['#FFF8EE', '#EAD6BC', 2.1]} />
          <directionalLight position={[-3, 6, 5]} intensity={1.45} color="#FFF4E4" />
          <directionalLight position={[4, 2.5, -4]} intensity={0.45} color="#FFE6CC" />
          <MascotAnimationController clock={clock} signals={signals} stage={stage} reducedMotion={reducedMotion} />
        </Canvas3D>
      </SceneErrorBoundary>
    </View>
  );
}
