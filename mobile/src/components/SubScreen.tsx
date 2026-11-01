import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, ICON_STROKE, radius, shadow } from '../theme';

/** Title and back button shared by the screens pushed from Profile. */
export function SubScreen({ title, children }: { title: string; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [styles.back, pressed && { transform: [{ scale: 0.94 }] }]}
        >
          <ChevronLeft size={22} color={colors.text} strokeWidth={ICON_STROKE} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {children}
      </ScrollView>
    </View>
  );
}

/** Card for content that isn't built yet. */
export function PlaceholderCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  back: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center' },
  spacer: { width: 42 },
  content: { paddingHorizontal: 20, paddingTop: 12 },
  card: {
    padding: 20,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadow.layer,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardBody: { marginTop: 6, fontSize: 14.5, lineHeight: 20, color: colors.textMuted },
});
