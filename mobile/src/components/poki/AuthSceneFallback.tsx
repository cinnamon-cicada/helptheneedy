import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import { PALETTE } from '../../animation/poki/dims';
import type { MascotSignals } from '../../animation/poki/signals';
import type { StageLayout } from './MascotAnimationController';

type Props = { stage: StageLayout; signals: MascotSignals; reducedMotion: boolean };

const VIEW_W = 300;
const VIEW_H = 200;
/** Mascot box in view units, standing on the floor right of the gift. */
const MASCOT_BOX = { x: 226, y: 140, size: 32 };

/**
 * Lightweight 2D stand-in for devices without WebGL: the opened gift and the
 * mascot, drawn as vectors. The mascot still reacts to the form.
 */
export function AuthSceneFallback({ stage, signals, reducedMotion }: Props) {
  const [bow, setBow] = useState(false);
  const lift = useSharedValue(0);
  const tilt = useSharedValue(0);
  const squash = useSharedValue(1);

  const width = Math.min(stage.width, stage.height * (VIEW_W / VIEW_H));
  const height = width * (VIEW_H / VIEW_W);
  const unit = width / VIEW_W;

  useEffect(
    () =>
      signals.subscribe((kind) => {
        if (kind === 'signup') setBow(true);
        if (reducedMotion) return;
        if (kind === 'success' || kind === 'signup') {
          lift.set(withSequence(withTiming(-14 * unit, { duration: 220, easing: Easing.out(Easing.quad) }), withSpring(0)));
          squash.set(withSequence(withTiming(0.88, { duration: 90 }), withSpring(1)));
        } else if (kind === 'fail') {
          squash.set(withSequence(withTiming(0.9, { duration: 260 }), withTiming(0.9, { duration: 500 }), withSpring(1)));
          tilt.set(withSequence(withTiming(-6, { duration: 200 }), withTiming(6, { duration: 260 }), withSpring(0)));
        } else {
          tilt.set(withSequence(withTiming(8, { duration: 220 }), withTiming(8, { duration: 700 }), withSpring(0)));
        }
      }),
    [signals, reducedMotion, lift, tilt, squash, unit],
  );

  const mascotStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { rotate: `${tilt.value}deg` }, { scaleY: squash.value }],
  }));

  return (
    <View
      style={[styles.stage, { top: stage.centerY - height / 2, height }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={{ width, height }}>
        <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
          <Ellipse cx={152} cy={172} rx={86} ry={8} fill={PALETTE.shadow} opacity={0.14} />
          {/* Lid leaning on the left, bow facing out. */}
          <G transform="rotate(-72 86 120)">
            <Rect x={36} y={110} width={104} height={18} rx={1} fill={PALETTE.ivory} stroke={PALETTE.ink} strokeWidth={2} />
            <Rect x={88} y={110} width={14} height={18} fill={PALETTE.ribbon} />
            <Ellipse cx={86} cy={103} rx={12} ry={7} fill={PALETTE.ribbon} stroke={PALETTE.ink} strokeWidth={1.6} />
            <Ellipse cx={102} cy={104} rx={10} ry={6} fill={PALETTE.ribbon} stroke={PALETTE.ink} strokeWidth={1.6} />
          </G>
          {/* Open box in three-quarter view. */}
          <Path d="M206 96 L221 83 L221 156 L206 170 Z" fill="#F1E4CC" stroke={PALETTE.ink} strokeWidth={2} strokeLinejoin="miter" />
          <Path d="M96 96 L111 83 L221 83 L206 96 Z" fill={PALETTE.inside} stroke={PALETTE.ink} strokeWidth={2} strokeLinejoin="miter" />
          <Path d="M104 93 L113 86 L214 86 L205 93 Z" fill={PALETTE.insideDeep} />
          <Rect x={96} y={96} width={110} height={74} rx={1.5} fill={PALETTE.ivory} stroke={PALETTE.ink} strokeWidth={2} />
          <Rect x={150} y={97} width={15} height={72} fill={PALETTE.ribbon} />
          <Path d="M210 92 L216 87 L216 160 L210 166 Z" fill={PALETTE.ribbonDeep} />
          {/* Loose ribbon draped over the front. */}
          <Path d="M122 96 C121 120 124 150 122 166 C126 172 136 174 140 168" stroke={PALETTE.ribbonDeep} strokeWidth={6} fill="none" strokeLinecap="round" />
          {/* A few settled pieces of confetti. */}
          <Rect x={62} y={164} width={6} height={4} rx={1} fill="#F5C85C" transform="rotate(20 65 166)" />
          <Rect x={236} y={176} width={6} height={4} rx={1} fill="#F29B65" transform="rotate(-30 239 178)" />
          <Rect x={182} y={180} width={5} height={4} rx={1} fill="#93ABC6" transform="rotate(15 184 182)" />
          <Rect x={90} y={182} width={6} height={4} rx={1} fill="#EAA647" transform="rotate(-12 93 184)" />
          <Rect x={262} y={166} width={5} height={4} rx={1} fill="#9DB8A0" transform="rotate(40 264 168)" />
        </Svg>

        <Animated.View
          style={[
            styles.mascot,
            {
              left: MASCOT_BOX.x * unit,
              top: MASCOT_BOX.y * unit,
              width: MASCOT_BOX.size * unit,
              height: MASCOT_BOX.size * unit,
            },
            mascotStyle,
          ]}
        >
          <Svg width="100%" height="100%" viewBox="0 0 60 60">
            <Line x1={25} y1={46} x2={24} y2={57} stroke={PALETTE.mascotShade} strokeWidth={2.6} strokeLinecap="round" />
            <Line x1={35} y1={46} x2={36} y2={57} stroke={PALETTE.mascotShade} strokeWidth={2.6} strokeLinecap="round" />
            <Path d="M33 20 C35 13 38 9 42 5 C41 11 41 16 39 21 Z" fill={PALETTE.mascot} stroke={PALETTE.ink} strokeWidth={1.6} strokeLinejoin="round" />
            <Path
              d="M30 17 C40 17 46 24 45.5 33 C45 42 38 48 29.5 47.5 C21 47 14.5 41 15 32 C15.5 23 21 17 30 17 Z"
              fill={PALETTE.mascot}
              stroke={PALETTE.ink}
              strokeWidth={1.6}
            />
            <Circle cx={25} cy={30.5} r={1.7} fill={PALETTE.eye} />
            <Circle cx={34} cy={30} r={1.7} fill={PALETTE.eye} />
            {bow ? (
              <G>
                <Ellipse cx={36} cy={10} rx={4} ry={2.6} fill="#F29B65" transform="rotate(-25 36 10)" />
                <Ellipse cx={44} cy={9} rx={3.6} ry={2.4} fill="#F29B65" transform="rotate(25 44 9)" />
                <Circle cx={40} cy={10} r={1.6} fill="#F29B65" />
              </G>
            ) : null}
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  mascot: { position: 'absolute', transformOrigin: 'bottom' },
});
