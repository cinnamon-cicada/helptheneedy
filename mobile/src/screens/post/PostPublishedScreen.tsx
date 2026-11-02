import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhotoStage } from '../../components/post/PhotoStage';
import { RichText } from '../../components/post/RichText';
import { PrimaryButton, TextButton } from '../../components/ui';
import { useMyPosts } from '../../post/MyPostsContext';
import { usePostDraft } from '../../post/PostDraftContext';
import { colors, fonts, radius, shadow } from '../../theme';
import { formatCents } from '../../utils/format';

/** The wish card as others will see it, right after posting. */
export function PostPublishedScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { posts } = useMyPosts();
  const { reset } = usePostDraft();
  const post = posts.find((p) => p.id === id);

  // The post is saved; clear the draft for next time.
  useEffect(() => {
    reset();
  }, [reset]);

  if (!post) return <Redirect href="/" />;
  const isDraft = post.status === 'draft';

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.title} accessibilityRole="header">
          {isDraft ? 'Saved as a draft' : 'Your wish card is ready'}
        </Text>
        <Text style={styles.subtitle}>
          {isDraft
            ? 'Add the missing details to post it. Drafts are only visible to you.'
            : "It's at the front of your Discover deck. This is how others will see it."}
        </Text>

        <View style={styles.card}>
          <PhotoStage
            photo={post.photo}
            filter={post.filter}
            overlays={post.overlays}
            fit="cover"
            style={styles.photo}
            accessibilityLabel={`Photo for ${post.title}`}
          />
          <View style={styles.body}>
            <View style={styles.row}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {post.title}
              </Text>
              <View style={[styles.badge, isDraft && styles.badgeDraft]}>
                <Text style={[styles.badgeText, isDraft && styles.badgeTextDraft]}>{isDraft ? 'Draft' : 'In Discover'}</Text>
              </View>
            </View>
            {post.amountCents !== null ? <Text style={styles.amount}>{formatCents(post.amountCents)}</Text> : null}
            {post.category ? <Text style={styles.category}>{post.category}</Text> : null}
            {post.description ? <RichText text={post.description} style={styles.description} /> : null}
          </View>
        </View>

        <Text style={styles.note}>Saved on this device for now, so only you can see it until posting to poki is connected.</Text>

        <PrimaryButton label={isDraft ? 'Done' : 'See it in Discover'} onPress={() => router.dismissTo('/')} />
        <View style={styles.secondary}>
          <TextButton label="View my posts" onPress={() => router.dismissTo('/profile')} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 20, gap: 16, width: '100%', maxWidth: 520, alignSelf: 'center' },
  title: { fontSize: 26, fontFamily: fonts.display, color: colors.text, textAlign: 'center' },
  subtitle: { marginTop: -8, fontSize: 14.5, lineHeight: 21, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
  card: {
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadow.card,
    overflow: 'hidden',
  },
  photo: { aspectRatio: 4 / 5, maxHeight: 420, backgroundColor: colors.orangeSoft },
  body: { padding: 18, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardTitle: { flex: 1, fontSize: 21, fontFamily: fonts.display, color: colors.text },
  badge: { paddingHorizontal: 10, height: 26, borderRadius: radius.pill, backgroundColor: colors.orangeSoft, justifyContent: 'center' },
  badgeDraft: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  badgeText: { fontSize: 12, fontFamily: fonts.semibold, color: colors.orangeText },
  badgeTextDraft: { color: colors.textMuted },
  amount: { fontSize: 20, fontFamily: fonts.bold, color: colors.orangeText, fontVariant: ['tabular-nums'] },
  category: { fontSize: 13, fontFamily: fonts.medium, color: colors.textMuted },
  description: { marginTop: 4, fontSize: 15, lineHeight: 22, fontFamily: fonts.regular, color: colors.text },
  note: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.textFaint, textAlign: 'center' },
  secondary: { alignItems: 'center', marginTop: -6 },
});
