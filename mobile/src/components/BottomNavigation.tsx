import { type Href, router } from 'expo-router';
import { CirclePlus, type LucideIcon, Search, Trophy, User, Users } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, ICON_STROKE, radius, shadow } from '../theme';

export type TabKey = 'discover' | 'people' | 'post' | 'ranks' | 'profile';

const TABS: { key: TabKey; label: string; Icon: LucideIcon }[] = [
  { key: 'discover', label: 'Discover', Icon: Search },
  { key: 'people', label: 'People', Icon: Users },
  { key: 'post', label: 'Post', Icon: CirclePlus },
  { key: 'ranks', label: 'Ranks', Icon: Trophy },
  { key: 'profile', label: 'Profile', Icon: User },
];

// Post isn't built yet, so that tab does nothing.
const ROUTES: Partial<Record<TabKey, Href>> = {
  discover: '/',
  people: '/friends',
  ranks: '/ranks',
  profile: '/profile',
};

export const NAV_HEIGHT = 66;
export const NAV_MARGIN = 12;

/** Height the nav takes from the bottom of the screen, including safe area. */
export function useBottomNavSpace() {
  const insets = useSafeAreaInsets();
  return NAV_HEIGHT + Math.max(insets.bottom, NAV_MARGIN) + 6;
}

export function BottomNavigation({ active }: { active: TabKey }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, NAV_MARGIN) }]}
      pointerEvents="box-none"
    >
      <View style={styles.bar} accessibilityRole="tablist">
        {TABS.map(({ key, label, Icon }) => {
          const isActive = key === active;
          const color = isActive ? colors.orange : colors.text;
          return (
            <Pressable
              key={key}
              onPress={() => {
                const route = ROUTES[key];
                if (route) router.navigate(route);
              }}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: isActive }}
              style={({ pressed }) => [styles.item, pressed && { transform: [{ scale: 0.94 }] }]}
            >
              <Icon size={23} color={color} strokeWidth={isActive ? ICON_STROKE + 0.35 : ICON_STROKE} />
              <Text style={[styles.label, { color }, isActive && styles.labelActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
  },
  bar: {
    height: NAV_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadow.nav,
    paddingHorizontal: 6,
  },
  item: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: { fontSize: 11, fontWeight: '500' },
  labelActive: { fontWeight: '700' },
});
