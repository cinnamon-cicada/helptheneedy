import { Image } from 'expo-image';
import { Bookmark, Gift, X } from 'lucide-react-native';
import { useImperativeHandle } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { useCardGestures } from '../animation/useCardGestures';
import { colors, fonts, ICON_STROKE, radius, shadow } from '../theme';
import type { GiftRequest } from '../types';
import { formatCents } from '../utils/format';
import { LAYER_POSES, type Rect } from './CardStackLayer';
import { ExpandedCardContent } from './ExpandedCardContent';
import { PhotoStage } from './post/PhotoStage';

/** Height of the info block under the image in the collapsed card. */
export const INFO_HEIGHT = 128;
/** Inset between the card edge and the image. */
export const IMAGE_INSET = 8;

export type CardGeometry = {
  collapsed: Rect;
  expanded: Rect;
  imageCollapsed: number;
  imageExpanded: number;
  /** Drag distance that fully expands the card. */
  expandDistance: number;
};

export type GiftRequestCardHandle = {
  returnToCenter: () => void;
  flyOutRight: (onDone: () => void) => void;
  collapse: () => void;
};

type Props = {
  ref?: React.Ref<GiftRequestCardHandle>;
  request: GiftRequest;
  geometry: CardGeometry;
  screenWidth: number;
  expand: SharedValue<number>;
  isExpanded: SharedValue<boolean>;
  expanded: boolean;
  heartOn: boolean;
  sparkleOn: boolean;
  onSkip: () => void;
  onGiftIntent: () => void;
  onExpandedChange: (expanded: boolean) => void;
  onToggleSave: () => void;
  onAvatarPress: () => void;
  onToggleHeart: () => void;
  onToggleSparkle: () => void;
  onToggleCommentLike: (commentId: string) => void;
  onAddComment: (text: string) => void;
};

const ENTER_POSE = LAYER_POSES[1];

export function GiftRequestCard({
  ref,
  request,
  geometry,
  screenWidth,
  expand,
  isExpanded,
  expanded,
  heartOn,
  sparkleOn,
  onSkip,
  onGiftIntent,
  onExpandedChange,
  onToggleSave,
  onAvatarPress,
  onToggleHeart,
  onToggleSparkle,
  onToggleCommentLike,
  onAddComment,
}: Props) {
  const { pan, expandCard, translateX, translateY, enter, returnToCenter, flyOutRight, collapse } =
    useCardGestures({
      screenWidth,
      expandDistance: geometry.expandDistance,
      expand,
      isExpanded,
      onSkip,
      onGiftIntent,
      onExpandedChange,
    });

  useImperativeHandle(ref, () => ({ returnToCenter, flyOutRight, collapse }), [
    returnToCenter,
    flyOutRight,
    collapse,
  ]);

  const { collapsed: c, expanded: x } = geometry;

  const containerStyle = useAnimatedStyle(() => {
    const e = expand.value;
    const n = 1 - enter.value; // 1 while still sitting in the second deck slot
    const rotate = interpolate(
      translateX.value,
      [-screenWidth, 0, screenWidth],
      [-14, 0, 14],
      Extrapolation.CLAMP,
    );
    return {
      left: interpolate(e, [0, 1], [c.left, x.left], Extrapolation.CLAMP),
      top: interpolate(e, [0, 1], [c.top, x.top], Extrapolation.CLAMP),
      width: interpolate(e, [0, 1], [c.width, x.width], Extrapolation.CLAMP),
      height: interpolate(e, [0, 1], [c.height, x.height], Extrapolation.CLAMP),
      transform: [
        { translateX: translateX.value + ENTER_POSE.x * n },
        { translateY: translateY.value + ENTER_POSE.y * n },
        { rotate: `${rotate + ENTER_POSE.rotate * n}deg` },
        { scale: 1 - (1 - ENTER_POSE.scale) * n },
      ],
    };
  });

  const imageStyle = useAnimatedStyle(() => ({
    height: interpolate(
      expand.value,
      [0, 1],
      [geometry.imageCollapsed, geometry.imageExpanded],
      Extrapolation.CLAMP,
    ),
  }));

  const revealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expand.value, [0.25, 0.75], [0, 1], Extrapolation.CLAMP),
  }));

  const expandedSectionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expand.value, [0.15, 0.7], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(expand.value, [0, 1], [-28, 0], Extrapolation.CLAMP) },
    ],
  }));

  const skipIndicatorStyle = useAnimatedStyle(() => {
    const p = interpolate(translateX.value, [-130, -24], [1, 0], Extrapolation.CLAMP);
    return { opacity: p, transform: [{ scale: 0.8 + p * 0.2 }, { rotate: `${-8 * p}deg` }] };
  });

  const giftIndicatorStyle = useAnimatedStyle(() => {
    const p = interpolate(translateX.value, [24, 130], [0, 1], Extrapolation.CLAMP);
    return { opacity: p, transform: [{ scale: 0.8 + p * 0.2 }, { rotate: `${8 * p}deg` }] };
  });

  const { recipient } = request;

  return (
    <Animated.View style={[styles.shadowWrap, containerStyle]}>
      <View style={styles.card}>
        <GestureDetector gesture={pan}>
          <View collapsable={false}>
            {/* The image toggles expansion without replacing the card or its content. */}
            <Pressable
              onPress={expanded ? collapse : expandCard}
              accessibilityRole="button"
              accessibilityLabel={`${expanded ? 'Collapse' : 'Open'} ${request.title}`}
              accessibilityState={{ expanded }}
            >
              <Animated.View style={[styles.imageWrap, imageStyle]}>
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  {request.postPhoto ? (
                    <PhotoStage
                      {...request.postPhoto}
                      fit="cover"
                      style={StyleSheet.absoluteFill}
                      accessibilityLabel={request.title}
                    />
                  ) : (
                    <Image
                      source={{ uri: request.imageUrl }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      transition={200}
                      accessibilityLabel={request.title}
                    />
                  )}
                </View>
                {request.isMine ? (
                  <View pointerEvents="none" style={styles.mine}>
                    <Text style={styles.mineText}>Your wish</Text>
                  </View>
                ) : null}
                <Animated.View pointerEvents="none" style={[styles.grabber, revealStyle]} />
                <Animated.View pointerEvents="none" style={[styles.indicator, styles.skipIndicator, skipIndicatorStyle]}>
                  <X size={30} color={colors.skip} strokeWidth={2.25} />
                </Animated.View>
                {/* Your own wish can't be gifted, so a right swipe just moves past it. */}
                {request.isMine ? null : (
                  <Animated.View pointerEvents="none" style={[styles.indicator, styles.giftIndicator, giftIndicatorStyle]}>
                    <Gift size={28} color={colors.orange} strokeWidth={2} />
                  </Animated.View>
                )}
              </Animated.View>
            </Pressable>

            <View style={[styles.info, !expanded && styles.infoCollapsed]}>
              <View style={styles.recipientRow}>
                <Pressable
                  onPress={onAvatarPress}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${recipient.displayName}'s profile`}
                  style={styles.recipient}
                >
                  <Image
                    source={{ uri: recipient.avatarUrl }}
                    style={styles.avatar}
                    contentFit="cover"
                    transition={150}
                  />
                  <Text style={styles.name} numberOfLines={1}>
                    {recipient.displayName}
                    {recipient.age ? <Text style={styles.age}>, {recipient.age}</Text> : null}
                  </Text>
                </Pressable>
                {/* Category only shows once the card is expanded. */}
                <Animated.View
                  style={[styles.badge, revealStyle]}
                  accessibilityElementsHidden={!expanded}
                  importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
                >
                  <Text style={styles.badgeText}>{request.category}</Text>
                </Animated.View>
              </View>

              <Text style={styles.title} numberOfLines={expanded ? 2 : 1} onPress={expanded ? undefined : expandCard}>
                {request.title}
              </Text>

              <View style={styles.amountRow}>
                <Text style={styles.amount} onPress={expanded ? undefined : expandCard}>
                  {formatCents(request.amountCents)}
                </Text>
                {request.isMine ? null : (
                <Pressable
                  onPress={onToggleSave}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={request.saved ? 'Remove from saved' : 'Save request'}
                  accessibilityState={{ selected: request.saved }}
                  style={({ pressed }) => [styles.bookmark, pressed && { transform: [{ scale: 0.88 }] }]}
                >
                  <Bookmark
                    size={22}
                    strokeWidth={ICON_STROKE}
                    color={request.saved ? colors.orange : colors.text}
                    fill={request.saved ? colors.orange : 'transparent'}
                  />
                </Pressable>
                )}
              </View>
            </View>
          </View>
        </GestureDetector>

        {/* Mounted at zero height while collapsed so it can slide out during the drag. */}
        <Animated.View
          style={[styles.expandedSection, expandedSectionStyle]}
          pointerEvents={expanded ? 'auto' : 'none'}
          accessibilityElementsHidden={!expanded}
          importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
        >
          <ExpandedCardContent
            request={request}
            heartOn={heartOn}
            sparkleOn={sparkleOn}
            onToggleHeart={onToggleHeart}
            onToggleSparkle={onToggleSparkle}
            onToggleCommentLike={onToggleCommentLike}
            onAddComment={onAddComment}
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    position: 'absolute',
    borderRadius: radius.card,
    boxShadow: shadow.card,
    zIndex: 10,
  },
  card: {
    flex: 1,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  imageWrap: {
    margin: IMAGE_INSET,
    marginBottom: 0,
    borderRadius: radius.card - IMAGE_INSET,
    overflow: 'hidden',
    backgroundColor: colors.orangeSoft,
  },
  grabber: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 253, 249, 0.85)',
  },
  indicator: {
    position: 'absolute',
    top: 18,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  skipIndicator: {
    right: 18,
    backgroundColor: 'rgba(253, 232, 236, 0.94)',
    borderColor: 'rgba(229, 86, 107, 0.35)',
  },
  mine: {
    position: 'absolute',
    top: 14,
    left: 14,
    paddingHorizontal: 12,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 253, 249, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(234, 166, 71, 0.45)',
    justifyContent: 'center',
  },
  mineText: { fontSize: 13, fontFamily: fonts.bold, color: colors.orangeText },
  giftIndicator: {
    left: 18,
    backgroundColor: 'rgba(255, 250, 244, 0.95)',
    borderColor: 'rgba(234, 166, 71, 0.45)',
  },
  info: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
  },
  infoCollapsed: { height: INFO_HEIGHT },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 30,
  },
  recipient: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.orangeSoft,
    outlineColor: 'rgba(53, 37, 29, 0.08)',
    outlineWidth: 1,
    outlineOffset: -1,
  },
  name: { fontSize: 15, fontFamily: fonts.semibold, color: colors.text },
  age: { fontFamily: fonts.regular, color: colors.textMuted },
  badge: {
    paddingHorizontal: 10,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.orangeSoft,
    justifyContent: 'center',
  },
  badgeText: { fontSize: 12, fontFamily: fonts.semibold, color: colors.orangeText },
  title: {
    marginTop: 10,
    fontSize: 22,
    lineHeight: 27,
    fontFamily: fonts.display,
    letterSpacing: -0.4,
    color: colors.text,
  },
  amountRow: {
    marginTop: 4,
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amount: {
    fontSize: 19,
    fontFamily: fonts.bold,
    color: colors.orangeText,
    fontVariant: ['tabular-nums'],
  },
  bookmark: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  expandedSection: { flex: 1 },
});
