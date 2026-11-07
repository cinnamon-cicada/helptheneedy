import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useDemo } from '../demo/DemoProvider';
import { colors, fonts, radius } from '../theme';
import type { Comment, GiftRequest } from '../types';
import { formatCents } from '../utils/format';
import { ExpandedCardContent } from './ExpandedCardContent';
import type { TileRect } from './ProfileShortcutCard';

const MARGIN = 16;
const IMAGE_INSET = 8;
/** Height under the image in a collapsed wishlist card; keeps its image size on the first frame. */
const ORIGIN_INFO_HEIGHT = 78;
const TIMING = { duration: 300, easing: Easing.out(Easing.cubic) };

type Props = {
  request: GiftRequest | null;
  /** Where the card grows from and shrinks back into, in window coordinates. */
  origin: TileRect | null;
  onClose: () => void;
  /** Called once the closing animation has finished. */
  onClosed?: () => void;
};

/** The full request card, grown out of whatever was tapped and shrunk back into it when closed. */
export function RequestCardWindow({ request, origin, onClose, onClosed }: Props) {
  const insets = useSafeAreaInsets();
  const screen = useWindowDimensions();
  const visible = request !== null;
  const progress = useSharedValue(0);
  // Kept after closing so the exit animation still has content and a target.
  const [shown, setShown] = useState({ request, origin });

  if (visible && (shown.request?.id !== request.id || shown.origin !== origin)) setShown({ request, origin });

  const finishClose = useCallback(() => {
    setShown({ request: null, origin: null });
    onClosed?.();
  }, [onClosed]);

  useEffect(() => {
    if (visible) {
      progress.set(withTiming(1, TIMING));
    } else {
      progress.set(
        withTiming(0, TIMING, (finished) => {
          if (finished) scheduleOnRN(finishClose);
        }),
      );
    }
  }, [visible, progress, finishClose]);

  const from = shown.origin ?? { x: 0, y: 0, width: 0, height: 0 };
  const width = screen.width - MARGIN * 2;
  const top = insets.top + MARGIN;
  const height = screen.height - top - Math.max(insets.bottom, MARGIN) - MARGIN;
  const imageHeight = Math.round((width - IMAGE_INSET * 2) * 0.62);
  const fromImageHeight = Math.max(from.height - ORIGIN_INFO_HEIGHT - IMAGE_INSET, 0);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const windowStyle = useAnimatedStyle(() => ({
    left: interpolate(progress.value, [0, 1], [from.x, MARGIN]),
    top: interpolate(progress.value, [0, 1], [from.y, top]),
    width: interpolate(progress.value, [0, 1], [from.width, width]),
    height: interpolate(progress.value, [0, 1], [from.height, height]),
  }));
  const imageStyle = useAnimatedStyle(() => ({
    height: interpolate(progress.value, [0, 1], [fromImageHeight, imageHeight]),
  }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0.35, 1], [0, 1], 'clamp') }));

  if (!shown.request) return null;

  return (
    // A modal so the window covers the whole screen wherever it's opened from.
    <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
        <Animated.View style={[styles.scrim, scrimStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View style={[styles.window, windowStyle]} accessibilityViewIsModal accessibilityLabel={shown.request.title}>
          <Animated.View style={[styles.imageWrap, imageStyle]}>
            <Image
              source={{ uri: shown.request.imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={200}
              accessibilityLabel={shown.request.title}
            />
          </Animated.View>
          {/* Fixed to the final size so text doesn't reflow while the window grows. */}
          <Animated.View style={[{ width, height: height - imageHeight - IMAGE_INSET }, contentStyle]}>
            <CardBody key={shown.request.id} initial={shown.request} />
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Info and details, with reactions and comments kept locally for this prototype. */
function CardBody({ initial }: { initial: GiftRequest }) {
  const { profile: me, currentUserId, avatarForUser } = useDemo();
  const [request, setRequest] = useState(initial);
  const [mine, setMine] = useState({ hearts: false, sparkles: false });

  const toggle = (kind: 'hearts' | 'sparkles') => {
    const wasOn = mine[kind];
    setMine({ ...mine, [kind]: !wasOn });
    setRequest((r) => ({ ...r, reactions: { ...r.reactions, [kind]: r.reactions[kind] + (wasOn ? -1 : 1) } }));
  };

  const toggleCommentLike = (commentId: string) =>
    setRequest((r) => ({
      ...r,
      comments: r.comments.map((cm) =>
        cm.id === commentId ? { ...cm, likedByMe: !cm.likedByMe, likes: cm.likes + (cm.likedByMe ? -1 : 1) } : cm,
      ),
    }));

  const addComment = (text: string) => {
    const comment: Comment = {
      id: `local-${Date.now()}`,
      username: me.username,
      authorId: currentUserId,
      avatarUrl: '',
      text: text.trim(),
      minutesAgo: 0,
      likes: 0,
      likedByMe: false,
    };
    setRequest((r) => ({ ...r, comments: [comment, ...r.comments] }));
  };

  const { recipient } = request;

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.body}>
      <View style={styles.info}>
        <View style={styles.recipientRow}>
          <View style={styles.recipient}>
            <Image source={{ uri: avatarForUser(recipient.id, recipient.avatarUrl) }} style={styles.avatar} contentFit="cover" transition={150} />
            <Text style={styles.name} numberOfLines={1}>
              {recipient.displayName}
              {recipient.age ? <Text style={styles.age}>, {recipient.age}</Text> : null}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{request.category}</Text>
          </View>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {request.title}
        </Text>
        <Text style={styles.amount}>{formatCents(request.amountCents)}</Text>
      </View>
      <ExpandedCardContent
        request={request}
        heartOn={mine.hearts}
        sparkleOn={mine.sparkles}
        onToggleHeart={() => toggle('hearts')}
        onToggleSparkle={() => toggle('sparkles')}
        onToggleCommentLike={toggleCommentLike}
        onAddComment={addComment}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  window: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  imageWrap: {
    margin: IMAGE_INSET,
    marginBottom: 0,
    borderRadius: radius.card - IMAGE_INSET,
    overflow: 'hidden',
    backgroundColor: colors.orangeSoft,
  },
  body: { flex: 1 },
  info: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12 },
  recipientRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 30 },
  recipient: { flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.orangeSoft },
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
  amount: {
    marginTop: 4,
    fontSize: 19,
    fontFamily: fonts.bold,
    color: colors.orangeText,
    fontVariant: ['tabular-nums'],
  },
});
