import { StyleSheet, Text, View } from 'react-native';

import { CATEGORY_LABELS, PERIOD_LABELS, formatMetric } from '../../leaderboard/copy';
import { colors, radius } from '../../theme';
import type { LeaderboardRow, RankingCategory, RankingPeriod } from '../../types';
import { BottomSheet } from '../BottomSheet';
import { PrimaryButton } from '../ui';
import { AliasAvatar } from './AliasAvatar';

const RULES = [
  ['Most Gifted', 'The total of gifts a member sent in the period.'],
  ['Most Helped', 'How many different people a member gifted. Gifting the same person twice counts once.'],
  ['Monthly', 'Gifts confirmed since the 1st of this month (UTC).'],
  ['Overall', 'Every confirmed gift since the member joined.'],
] as const;

/** Explains how rankings are calculated. */
export function LeaderboardInfoSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="How rankings work">
      <Text style={styles.title} accessibilityRole="header">
        How rankings work
      </Text>
      <View style={styles.rules}>
        {RULES.map(([term, detail]) => (
          <View key={term} style={styles.rule}>
            <Text style={styles.term}>{term}</Text>
            <Text style={styles.detail}>{detail}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.note}>
        Only gifts the receiver has confirmed count. Pending, disputed and cancelled gifts don&apos;t. Totals are reported by
        members, not verified. People who share a total share a rank. Members can hide themselves from the leaderboard.
      </Text>
      <PrimaryButton label="Got it" onPress={onClose} />
    </BottomSheet>
  );
}

type PreviewProps = {
  row: LeaderboardRow | null;
  visible: boolean;
  category: RankingCategory;
  period: RankingPeriod;
  isMe: boolean;
  onClose: () => void;
};

/** Lightweight profile preview from a leaderboard row; full profiles come later. */
export function ProfilePreviewSheet({ row, visible, category, period, isMe, onClose }: PreviewProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Profile preview">
      {row ? (
        <View style={styles.preview}>
          <AliasAvatar avatar={row.user.avatar} size={84} />
          <Text style={styles.alias}>{isMe ? `${row.user.alias} (you)` : row.user.alias}</Text>
          <View style={styles.stat}>
            <Text style={styles.statRank}>#{row.rank}</Text>
            <Text style={styles.statLabel}>
              {CATEGORY_LABELS[category]} · {PERIOD_LABELS[period]}
            </Text>
            <Text style={styles.statValue}>{formatMetric(category, row.value)}</Text>
          </View>
          <Text style={styles.note}>Members appear here under a public alias. Full profiles are coming soon.</Text>
          <View style={styles.action}>
            <PrimaryButton label="Close" onPress={onClose} />
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  rules: { marginTop: 14, gap: 12 },
  rule: { gap: 2 },
  term: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  detail: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  note: { marginTop: 16, marginBottom: 18, fontSize: 13, lineHeight: 19, color: colors.textMuted, textAlign: 'center' },
  preview: { alignItems: 'center', paddingTop: 4 },
  alias: { marginTop: 10, fontSize: 20, fontWeight: '700', color: colors.text },
  stat: {
    marginTop: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radius.field + 2,
    backgroundColor: colors.rankCard,
    borderWidth: 1,
    borderColor: colors.rankCardBorder,
  },
  statRank: { fontSize: 26, fontWeight: '800', color: colors.text },
  statLabel: { marginTop: 2, fontSize: 13, color: colors.textOnPeach },
  statValue: { marginTop: 6, fontSize: 15, fontWeight: '700', color: colors.orangeText },
  action: { alignSelf: 'stretch' },
});
