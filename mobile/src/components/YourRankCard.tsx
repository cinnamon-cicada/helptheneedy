import { ChevronRight, Trophy } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, ICON_STROKE, radius } from '../theme';
import type { MyRank } from '../types';

export function YourRankCard({ myRank, onPress }: { myRank: MyRank; onPress: () => void }) {
  const { rank, category, period } = myRank;
  const context = `${category} · ${period}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Your rank: ${rank ? `number ${rank}` : 'not ranked yet'}, ${context}`}
      style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <Trophy size={34} color={colors.orangeText} fill={colors.yellow} strokeWidth={ICON_STROKE} />
      <View style={styles.rank}>
        <Text style={styles.label}>Your Rank</Text>
        <Text style={rank ? styles.number : styles.unranked}>{rank ? `#${rank}` : 'Not ranked yet'}</Text>
      </View>
      <Text style={styles.context}>{context}</Text>
      <ChevronRight size={20} color={colors.text} strokeWidth={ICON_STROKE} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: radius.card,
    backgroundColor: colors.rankCard,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rank: { flexShrink: 1 },
  label: { fontSize: 13, fontFamily: fonts.medium, color: colors.text },
  number: { marginTop: 1, fontSize: 28, fontFamily: fonts.bold, color: colors.text, letterSpacing: -0.5 },
  unranked: { marginTop: 3, fontSize: 16, fontFamily: fonts.display, color: colors.text },
  context: { flex: 1, fontSize: 13.5, fontFamily: fonts.medium, color: colors.text, textAlign: 'right' },
});
