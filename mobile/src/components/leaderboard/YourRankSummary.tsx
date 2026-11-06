import { StyleSheet, Text, View } from 'react-native';

import { formatMetric } from '../../leaderboard/copy';
import { colors, fonts, radius, shadow } from '../../theme';
import type { LeaderboardRow, RankingCategory } from '../../types';
import { AliasAvatar } from './AliasAvatar';

type Props = {
  row: LeaderboardRow | null;
  category: RankingCategory;
};

/** "Your Rank" strip above the list; shown even when you're near the top. */
export function YourRankSummary({ row, category }: Props) {
  if (!row) {
    return (
      <View style={styles.card} accessible accessibilityLabel="Your rank. You're not ranked yet. Send your first gift to join the leaderboard.">
        <View style={styles.text}>
          <Text style={styles.label}>Your Rank</Text>
          <Text style={styles.unranked}>You&apos;re not ranked yet</Text>
          <Text style={styles.hint}>Send your first gift to join the leaderboard.</Text>
        </View>
      </View>
    );
  }

  const metric = formatMetric(category, row.value);
  return (
    <View style={styles.card} accessible accessibilityLabel={`Your rank: number ${row.rank}, ${row.user.alias}, ${metric}`}>
      <View style={styles.rankBlock}>
        <Text style={styles.label}>Your Rank</Text>
        <Text style={styles.rank}>#{row.rank}</Text>
      </View>
      <AliasAvatar avatar={row.user.avatar} size={34} />
      <Text style={styles.alias} numberOfLines={1}>
        {row.user.alias}
      </Text>
      <Text style={styles.metric} numberOfLines={2}>
        {metric}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.card - 4,
    backgroundColor: colors.rankCard,
    borderWidth: 1,
    borderColor: colors.rankCardBorder,
    boxShadow: shadow.layer,
  },
  rankBlock: { marginRight: 2 },
  label: { fontSize: 12, fontFamily: fonts.semibold, color: colors.textOnPeach },
  rank: { fontSize: 24, fontFamily: fonts.bold, color: colors.text, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  alias: { flex: 1, fontSize: 14.5, fontFamily: fonts.bold, color: colors.text },
  // Wraps rather than squeezing the alias when the metric is long.
  metric: { maxWidth: '30%', fontSize: 14, fontFamily: fonts.bold, color: colors.orangeText, textAlign: 'right', fontVariant: ['tabular-nums'] },
  text: { flex: 1 },
  unranked: { marginTop: 2, fontSize: 16, fontFamily: fonts.bold, color: colors.text },
  hint: { marginTop: 2, fontSize: 13, fontFamily: fonts.regular, color: colors.textOnPeach },
});
