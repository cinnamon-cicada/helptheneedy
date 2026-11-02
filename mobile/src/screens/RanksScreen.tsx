import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNavigation, useBottomNavSpace } from '../components/BottomNavigation';
import { MY_LEADERBOARD_ID, rankOf, WEEKLY_MOST_GIFTED } from '../data/mockLeaderboard';
import { colors, fonts, radius, shadow } from '../theme';
import { formatDollars } from '../utils/format';

/** Minimal board so the Your Rank card has somewhere to go; the full screen isn't designed yet. */
export function RanksScreen() {
  const insets = useSafeAreaInsets();
  const navSpace = useBottomNavSpace();

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: navSpace + 16, paddingHorizontal: 20 }}>
        <Text style={styles.title} accessibilityRole="header">
          Most Gifted · Weekly
        </Text>
        <Text style={styles.note}>Sample data. Totals are reported by members, not verified.</Text>
        <View style={styles.card}>
          {WEEKLY_MOST_GIFTED.map((entry, i) => {
            const isMe = entry.id === MY_LEADERBOARD_ID;
            return (
              <View key={entry.id} style={[styles.row, i > 0 && styles.divider, isMe && styles.rowMe]}>
                <Text style={styles.rank}>{rankOf(WEEKLY_MOST_GIFTED, entry.id)}</Text>
                <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>
                  {isMe ? 'You' : entry.username}
                </Text>
                <Text style={styles.amount}>{formatDollars(entry.giftedCents)}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <BottomNavigation active="ranks" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 22, fontFamily: fonts.display, color: colors.text, letterSpacing: -0.4 },
  note: { marginTop: 4, marginBottom: 16, fontSize: 12.5, fontFamily: fonts.regular, color: colors.textMuted },
  card: {
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadow.layer,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16 },
  rowMe: { backgroundColor: colors.orangeSoft },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  rank: { width: 24, fontSize: 14, fontFamily: fonts.bold, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  name: { flex: 1, fontSize: 14.5, fontFamily: fonts.medium, color: colors.text },
  nameMe: { fontFamily: fonts.bold },
  amount: { fontSize: 14, fontFamily: fonts.semibold, color: colors.orangeText, fontVariant: ['tabular-nums'] },
});
