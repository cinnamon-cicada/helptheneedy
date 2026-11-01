import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNavigation, useBottomNavSpace } from '../components/BottomNavigation';
import { ProfileStats } from '../components/ProfileStats';
import { WishlistDeck } from '../components/WishlistDeck';
import { mockPeople } from '../data/mockPeople';
import { mockRequests } from '../data/mockRequests';
import { colors, radius, shadow } from '../theme';

const IMAGE_INSET = 8;

/** Someone else's profile, opened from the friends page or a request card. */
export function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const navSpace = useBottomNavSpace();

  const person = mockPeople.find((p) => p.id === id);
  const wishlist = (person?.wishlistIds ?? []).flatMap((wishId) =>
    mockRequests.filter((r) => r.id === wishId),
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: navSpace + 16, paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {person ? (
          <View style={styles.card}>
            <Text style={styles.name} accessibilityRole="header" numberOfLines={1}>
              {person.displayName}
            </Text>
            <View style={styles.imageWrap}>
              <Image
                source={{ uri: person.avatarUrl }}
                style={styles.image}
                contentFit="cover"
                transition={200}
                accessibilityLabel={person.displayName}
              />
            </View>
            <View style={styles.stats}>
              <ProfileStats profile={person} />
              <Text style={styles.disclaimer}>Reported by members, not verified.</Text>
            </View>
            <Text style={styles.wishlistTitle}>Wishlist</Text>
            <WishlistDeck requests={wishlist} />
          </View>
        ) : (
          <Text style={styles.missing}>Profile not found</Text>
        )}
      </ScrollView>
      <BottomNavigation active="people" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  card: {
    paddingBottom: 20,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadow.card,
  },
  name: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: colors.text,
  },
  imageWrap: {
    marginHorizontal: IMAGE_INSET,
    borderRadius: radius.card - IMAGE_INSET,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.orangeSoft,
  },
  image: { width: '100%', aspectRatio: 1 },
  stats: { paddingHorizontal: 4, paddingTop: 18 },
  disclaimer: { marginTop: 10, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  wishlistTitle: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 4,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.text,
  },
  missing: { marginTop: 48, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
});
