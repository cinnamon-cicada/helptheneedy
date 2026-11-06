import { Image } from 'expo-image';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, fonts, radius, shadow, spring } from '../theme';
import type { GiftRequest } from '../types';
import { formatCents } from '../utils/format';
import { CardStackLayer, LAYER_POSES, type Rect } from './CardStackLayer';
import type { TileRect } from './ProfileShortcutCard';
import { RequestCardWindow } from './RequestCardWindow';

const INFO_HEIGHT = 78;
const IMAGE_INSET = 8;
const ENTER_POSE = LAYER_POSES[1];

/** The Discover deck without gifting: swiping either way shows the next wish, and tapping opens the full card. */
export function WishlistDeck({ requests }: { requests: GiftRequest[] }) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const noExpand = useSharedValue(0);
  const [open, setOpen] = useState<{ request: GiftRequest; origin: TileRect } | null>(null);
  // Stays true until the window has shrunk back, so the deck card doesn't show twice.
  const [windowShown, setWindowShown] = useState(false);

  if (requests.length === 0) return <Text style={styles.empty}>Nothing here yet</Text>;

  const front = requests[index % requests.length];
  const layerCount = Math.min(2, requests.length - 1);

  // Leaves room on the left and top for the rear layers to peek out.
  const cardWidth = width - 48;
  const rect: Rect = { left: 32, top: 26, width: cardWidth, height: Math.round(cardWidth * 0.62) + INFO_HEIGHT };

  return (
    <View
      style={{ height: rect.top + rect.height + 8 }}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 ? (
        <>
          {layerCount >= 2 ? <CardStackLayer depth={2} rect={rect} expand={noExpand} /> : null}
          {layerCount >= 1 ? <CardStackLayer depth={1} rect={rect} expand={noExpand} /> : null}
          <WishCard
            key={front.id}
            request={front}
            rect={rect}
            swipeable={requests.length > 1}
            hidden={windowShown}
            onSwiped={() => setIndex((i) => i + 1)}
            onOpen={(origin) => {
              setOpen({ request: front, origin });
              setWindowShown(true);
            }}
          />
        </>
      ) : null}
      <RequestCardWindow
        request={open?.request ?? null}
        origin={open?.origin ?? null}
        onClose={() => setOpen(null)}
        onClosed={() => setWindowShown(false)}
      />
    </View>
  );
}

function WishCard({
  request,
  rect,
  swipeable,
  hidden,
  onSwiped,
  onOpen,
}: {
  request: GiftRequest;
  rect: Rect;
  swipeable: boolean;
  hidden: boolean;
  onSwiped: () => void;
  onOpen: (origin: TileRect) => void;
}) {
  const ref = useRef<ComponentRef<typeof Pressable>>(null);
  const { width: screenWidth } = useWindowDimensions();
  const translateX = useSharedValue(0);
  // 0 → 1 as the card moves forward from the second deck position.
  const enter = useSharedValue(swipeable ? 0 : 1);
  const swipeThreshold = screenWidth * 0.28;

  useEffect(() => {
    enter.set(withSpring(1, spring.settle));
  }, [enter]);

  // Only horizontal drags count, so the page still scrolls over the deck.
  const pan = usePanGesture({
    enabled: swipeable,
    activeOffsetX: [-12, 12],
    failOffsetY: [-12, 12],
    onUpdate: (e) => {
      'worklet';
      translateX.set(e.translationX);
    },
    onDeactivate: (e) => {
      'worklet';
      if (Math.abs(e.translationX) > swipeThreshold || Math.abs(e.velocityX) > 900) {
        const direction = e.translationX < 0 ? -1 : 1;
        translateX.set(withTiming(direction * screenWidth * 1.5, { duration: 260 }, (finished) => {
          if (finished) scheduleOnRN(onSwiped);
        }));
      } else {
        translateX.set(withSpring(0, spring.settle));
      }
    },
  });

  const cardStyle = useAnimatedStyle(() => {
    const n = 1 - enter.value; // 1 while still sitting in the second deck slot
    const rotate = interpolate(translateX.value, [-screenWidth, 0, screenWidth], [-14, 0, 14], Extrapolation.CLAMP);
    return {
      transform: [
        { translateX: translateX.value + ENTER_POSE.x * n },
        { translateY: ENTER_POSE.y * n },
        { rotate: `${rotate + ENTER_POSE.rotate * n}deg` },
        { scale: 1 - (1 - ENTER_POSE.scale) * n },
      ],
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, rect, cardStyle, hidden && { opacity: 0 }]}>
        <Pressable
          ref={ref}
          style={styles.fill}
          onPress={() => ref.current?.measureInWindow((x, y, width, height) => onOpen({ x, y, width, height }))}
          accessibilityRole="button"
          accessibilityLabel={`Open ${request.title}`}
        >
          <View style={styles.imageWrap}>
            <Image
              source={{ uri: request.imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
              accessibilityLabel={request.title}
            />
          </View>
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {request.title}
            </Text>
            <Text style={styles.amount}>{formatCents(request.amountCents)}</Text>
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  empty: { paddingHorizontal: 18, paddingTop: 8, fontSize: 15, fontFamily: fonts.regular, color: colors.textMuted },
  card: {
    position: 'absolute',
    zIndex: 10,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadow.card,
  },
  fill: { flex: 1 },
  imageWrap: {
    flex: 1,
    margin: IMAGE_INSET,
    marginBottom: 0,
    borderRadius: radius.card - IMAGE_INSET,
    overflow: 'hidden',
    backgroundColor: colors.orangeSoft,
  },
  info: { height: INFO_HEIGHT, paddingHorizontal: 16, justifyContent: 'center' },
  title: { fontSize: 18, fontFamily: fonts.display, letterSpacing: -0.3, color: colors.text },
  amount: {
    marginTop: 4,
    fontSize: 16,
    fontFamily: fonts.bold,
    color: colors.orangeText,
    fontVariant: ['tabular-nums'],
  },
});
