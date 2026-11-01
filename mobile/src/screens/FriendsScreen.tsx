import { router } from 'expo-router';
import { MoreHorizontal, Search, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../components/Avatar';
import { BottomNavigation, useBottomNavSpace } from '../components/BottomNavigation';
import { BottomSheet } from '../components/BottomSheet';
import { mockPeople } from '../data/mockPeople';
import { colors, ICON_STROKE, radius } from '../theme';
import type { Person } from '../types';

export function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const navSpace = useBottomNavSpace();
  const [people, setPeople] = useState(mockPeople);
  const [query, setQuery] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  // Kept after the sheet closes so its exit animation still has content.
  const [menuPerson, setMenuPerson] = useState<Person | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? people.filter((p) => p.displayName.toLowerCase().includes(q)) : people;
  }, [people, query]);

  const openMenu = (person: Person) => {
    setMenuPerson(person);
    setMenuId(person.id);
  };

  // Someone leaves the list once neither of you follows the other.
  const update = (id: string, change: Partial<Person>) => {
    setPeople((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, ...change } : p))
        .filter((p) => p.isFollowing || p.followsMe),
    );
    setMenuId(null);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header} accessible accessibilityRole="header" accessibilityLabel="Friends">
        <Users size={44} color={colors.orange} strokeWidth={ICON_STROKE} />
      </View>

      <View style={styles.search}>
        <Search size={19} color={colors.textMuted} strokeWidth={ICON_STROKE} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search friends"
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={visible}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: navSpace + 8 }}
        ListEmptyComponent={<Text style={styles.empty}>No one found</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              onPress={() => router.push(`/user/${item.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`View ${item.displayName}'s profile`}
              style={({ pressed }) => [styles.person, pressed && { opacity: 0.7 }]}
            >
              <Avatar uri={item.avatarUrl} size={54} />
              <Text style={styles.name} numberOfLines={1}>
                {item.displayName}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => openMenu(item)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Options for ${item.displayName}`}
              style={({ pressed }) => [styles.more, pressed && { transform: [{ scale: 0.88 }] }]}
            >
              <MoreHorizontal size={22} color={colors.text} strokeWidth={ICON_STROKE} />
            </Pressable>
          </View>
        )}
      />

      <BottomNavigation active="people" />

      <BottomSheet
        visible={menuId !== null}
        onClose={() => setMenuId(null)}
        accessibilityLabel={`Options for ${menuPerson?.displayName ?? 'friend'}`}
      >
        {menuPerson?.isFollowing ? (
          <MenuAction label="Unfollow" onPress={() => update(menuPerson.id, { isFollowing: false })} />
        ) : null}
        {menuPerson?.followsMe ? (
          <MenuAction label="Remove as follower" onPress={() => update(menuPerson.id, { followsMe: false })} />
        ) : null}
      </BottomSheet>
    </View>
  );
}

function MenuAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, alignItems: 'flex-start' },
  search: {
    height: 48,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.input,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, height: '100%', fontSize: 16, color: colors.text },
  empty: { marginTop: 32, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  person: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { flexShrink: 1, fontSize: 17, fontWeight: '600', color: colors.text },
  more: { width: 40, height: 40, marginRight: -8, alignItems: 'center', justifyContent: 'center' },
  action: { height: 54, justifyContent: 'center' },
  actionText: { fontSize: 16.5, fontWeight: '600', color: colors.text },
});
