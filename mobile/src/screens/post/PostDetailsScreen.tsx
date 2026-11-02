import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TextField } from '../../components/auth/fields';
import { CATEGORY_ORDER } from '../../components/FilterBottomSheet';
import { MentionInput, MultilineField } from '../../components/post/MentionInput';
import { PhotoStage } from '../../components/post/PhotoStage';
import { Chip, PrimaryButton } from '../../components/ui';
import { mockPeople } from '../../data/mockPeople';
import {
  DESCRIPTION_MAX,
  type DetailsErrors,
  INSTRUCTIONS_MAX,
  TITLE_MAX,
  extractHashtags,
  extractMentions,
  handleFor,
  isComplete,
  missingRequired,
  parsePriceToCents,
  validateDraft,
} from '../../post/details';
import { useMyPosts } from '../../post/MyPostsContext';
import { usePostDraft } from '../../post/PostDraftContext';
import type { MyPost } from '../../post/types';
import { colors, fonts, radius } from '../../theme';
import { formatCents } from '../../utils/format';

/** "title, price and category" */
function listOf(items: string[]) {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

/** Friends are mutual follows, as in ARCHITECTURE.md. */
const FRIENDS = mockPeople.filter((p) => p.isFollowing && p.followsMe);

/** Shrinks the photo to a strip (still holding the back button) while the keyboard is up. */
function usePhotoHeight(full: number, collapsed: number) {
  const value = useSharedValue(full);
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subs = [Keyboard.addListener(show, () => setKeyboard(true)), Keyboard.addListener(hide, () => setKeyboard(false))];
    return () => subs.forEach((s) => s.remove());
  }, []);
  useEffect(() => {
    value.set(withTiming(keyboard ? collapsed : full, { duration: 220, easing: Easing.out(Easing.cubic) }));
  }, [keyboard, full, collapsed, value]);
  return useAnimatedStyle(() => ({ height: value.value }));
}

/** Step 2: the photo pinned in the top third, the wish details scrolling below. */
export function PostDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { draft, setDetails } = usePostDraft();
  const { addPost } = useMyPosts();
  const [errors, setErrors] = useState<DetailsErrors>({});
  const [attempted, setAttempted] = useState(false);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const d = draft.details;

  const cents = useMemo(() => parsePriceToCents(d.price), [d.price]);
  // Posting needs only the required fields; gift instructions stay optional.
  const complete = isComplete(d);
  const missing = missingRequired(d);
  const photoStyle = usePhotoHeight(Math.round(height / 3), insets.top + 84);

  // Reached without a photo (for example a reload): start the flow again.
  if (!draft.photo) return <Redirect href="/post" />;
  const photo = draft.photo;

  const update = (patch: Partial<typeof d>) => {
    setDetails(patch);
    // After the first attempt, errors update live as fields are fixed.
    if (attempted) setErrors(validateDraft({ ...d, ...patch }));
  };

  const submit = () => {
    setAttempted(true);
    // A draft can be saved with empty fields, but nothing entered may be invalid.
    const found = validateDraft(d);
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      scroll.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    const byHandle = new Map(FRIENDS.map((f) => [handleFor(f.displayName).toLowerCase(), f.id]));
    const post: MyPost = {
      id: `post-${Date.now()}`,
      photo,
      filter: draft.edits.filter,
      overlays: draft.edits.overlays,
      title: d.title.trim() || 'Untitled wish',
      amountCents: cents,
      category: d.category,
      description: d.description.trim(),
      hashtags: extractHashtags(d.description),
      mentionIds: extractMentions(d.description).flatMap((m) => byHandle.get(m.toLowerCase()) ?? []),
      status: complete ? 'open' : 'draft',
      createdAt: Date.now(),
    };
    addPost(post);
    router.replace({ pathname: '/post/published', params: { id: post.id } });
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        {/* Centre-cropped preview; the full photo is kept for the post. */}
        <Animated.View style={photoStyle}>
          <PhotoStage
            photo={photo}
            filter={draft.edits.filter}
            overlays={draft.edits.overlays}
            fit="cover"
            style={styles.flex}
            accessibilityLabel="Your photo, cropped to fit the preview"
          />
        </Animated.View>
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          style={styles.sheet}
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.form}>
            <TextField
              label="Title"
              value={d.title}
              onChangeText={(title) => update({ title })}
              error={errors.title}
              placeholder="What are you wishing for?"
              maxLength={TITLE_MAX}
              returnKeyType="next"
            />
            <TextField
              label="Price (USD)"
              value={d.price}
              onChangeText={(price) => update({ price })}
              error={errors.price}
              hint={cents !== null && !errors.price ? `${formatCents(cents)} · between $1 and $10,000` : 'Between $1 and $10,000'}
              placeholder="25.00"
              keyboardType="decimal-pad"
              inputMode="decimal"
            />
            <View style={styles.group}>
              <Text style={styles.groupLabel} nativeID="category-label">
                Category
              </Text>
              <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabelledBy="category-label">
                {CATEGORY_ORDER.map((c) => (
                  <Chip key={c} label={c} selected={d.category === c} onPress={() => update({ category: c })} />
                ))}
              </View>
              {errors.category ? <Text style={styles.error}>{errors.category}</Text> : null}
            </View>
            <MentionInput
              label="Description"
              value={d.description}
              onChangeText={(description) => update({ description })}
              friends={FRIENDS}
              error={errors.description}
              placeholder="Tell people about your wish. #matcha @Alex"
              maxLength={DESCRIPTION_MAX}
            />
            <MultilineField
              label="How to receive gifts (optional)"
              value={d.giftInstructions}
              onChangeText={(giftInstructions) => update({ giftInstructions })}
              error={errors.giftInstructions}
              hint="Only people you match with see this."
              placeholder="For example: send to my Venmo @alex-r"
              maxLength={INSTRUCTIONS_MAX}
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
          {complete ? null : (
            <Text style={styles.missing} accessibilityLiveRegion="polite">
              To post, add a {missing.length > 0 ? listOf(missing) : 'valid price'}.
            </Text>
          )}
          <PrimaryButton label={complete ? 'Post wish' : 'Save as draft'} onPress={submit} />
        </View>
      </KeyboardAvoidingView>

      <Pressable
        onPress={() => router.back()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Back to photo"
        style={({ pressed }) => [styles.back, { top: insets.top + 10 }, pressed && { transform: [{ scale: 0.94 }] }]}
      >
        <ChevronLeft size={24} color={colors.white} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  flex: { flex: 1 },
  // The form overlaps the photo slightly with rounded corners.
  sheet: {
    marginTop: -24,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: colors.white,
  },
  scroll: { paddingBottom: 24 },
  form: { paddingTop: 24, paddingHorizontal: 20, gap: 18 },
  group: { gap: 9 },
  groupLabel: { fontSize: 13.5, fontFamily: fonts.semibold, color: colors.text, letterSpacing: 0.1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  error: { fontSize: 12.5, lineHeight: 17, fontFamily: fonts.medium, color: colors.error },
  missing: { marginBottom: 8, fontSize: 12.5, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
  footer: {
    paddingTop: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  back: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(20, 14, 10, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
