import { StyleSheet, Text, View } from 'react-native';

import { formatMetric } from '../../leaderboard/copy';
import { colors, radius, shadow } from '../../theme';
import type { LeaderboardRow, RankingCategory } from '../../types';
import { AliasAvatar } from './AliasAvatar';

type Props = {
  row: LeaderboardRow | null;
  category: RankingCategory;
};

/** "Your Rank" strip under the podium; shown even when you're already in the top 3. */
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
  label: { fontSize: 12, fontWeight: '600', color: colors.textOnPeach },
  rank: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  alias: { flex: 1, fontSize: 14.5, fontWeight: '700', color: colors.text },
  // Wraps rather than squeezing the alias when the metric is long.
  metric: { maxWidth: '30%', fontSize: 14, fontWeight: '700', color: colors.orangeText, textAlign: 'right', fontVariant: ['tabular-nums'] },
  text: { flex: 1 },
  unranked: { marginTop: 2, fontSize: 16, fontWeight: '700', color: colors.text },
  hint: { marginTop: 2, fontSize: 13, color: colors.textOnPeach },
});
