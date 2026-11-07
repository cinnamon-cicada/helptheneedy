import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNavigation, useBottomNavSpace } from '../components/BottomNavigation';
import { ProfileStats } from '../components/ProfileStats';
import { WishlistDeck } from '../components/WishlistDeck';
import { mockPeople } from '../data/mockPeople';
import { mockRequests } from '../data/mockRequests';
import { useDemo } from '../demo/DemoProvider';
import { colors, fonts, radius } from '../theme';

const IMAGE_INSET = 8;

/** Someone else's profile, opened from the friends page or a request card. */
export function UserProfileScreen() {
  const { avatarForUser } = useDemo();
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
                source={{ uri: avatarForUser(person.id, person.avatarUrl) }}
                style={styles.image}
                contentFit="cover"
                transition={200}
                accessibilityLabel={person.displayName}
              />
            </View>
            <View style={styles.stats}>
              <ProfileStats profile={person} />
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
    borderColor: 'transparent',
  },
  name: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    fontSize: 28,
    fontFamily: fonts.display,
    letterSpacing: -0.5,
    color: colors.text,
  },
  imageWrap: {
    marginHorizontal: IMAGE_INSET,
    borderRadius: radius.card - IMAGE_INSET,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
    backgroundColor: colors.orangeSoft,
  },
  image: { width: '100%', aspectRatio: 1 },
  stats: { paddingHorizontal: 4, paddingTop: 18 },
  wishlistTitle: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 4,
    fontSize: 20,
    fontFamily: fonts.display,
    letterSpacing: -0.3,
    color: colors.text,
  },
  missing: { marginTop: 48, fontSize: 15, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
});
