import { StyleSheet } from 'react-native';
import Animated, {
  type SharedValue,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { colors, radius, shadow } from '../theme';

export type Rect = { left: number; top: number; width: number; height: number };

/** Offsets for each rear layer: farther back = farther left, higher, more tilted. */
export const LAYER_POSES = [
  { x: 0, y: 0, rotate: 0, scale: 1 },
  { x: -18, y: -12, rotate: -2.5, scale: 0.975 },
  { x: -34, y: -22, rotate: -5, scale: 0.95 },
] as const;

const LAYER_COLORS = [colors.card, colors.layerPeach, colors.layerYellow];

type Props = {
  depth: 1 | 2;
  rect: Rect;
  /** Card expansion progress; rear layers tuck away as the card expands. */
  expand: SharedValue<number>;
};

/** A plain rear card that gives the deck its staggered, physical look. */
export function CardStackLayer({ depth, rect, expand }: Props) {
  const pose = LAYER_POSES[depth];

  const style = useAnimatedStyle(() => {
    const e = expand.value;
    return {
      opacity: interpolate(e, [0, 0.5], [1, 0], 'clamp'),
      transform: [
        { translateX: pose.x * (1 - e) },
        { translateY: pose.y * (1 - e) },
        { rotate: `${pose.rotate * (1 - e)}deg` },
        { scale: pose.scale },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.layer,
        rect,
        { backgroundColor: LAYER_COLORS[depth], zIndex: 3 - depth },
        style,
      ]}
    >
      {/* A faint cream wash keeps the layer soft rather than saturated. */}
      <Animated.View style={styles.sheen} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(242, 155, 101, 0.45)',
    boxShadow: shadow.layer,
    overflow: 'hidden',
  },
  sheen: {
    ...StyleSheet.absoluteFill,
    margin: 10,
    borderRadius: radius.card - 8,
    backgroundColor: 'rgba(255, 253, 249, 0.22)',
  },
});
