import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { formatMetric } from '../../leaderboard/copy';
import { colors, fonts, ICON_STROKE, radius } from '../../theme';
import type { LeaderboardRow, RankingCategory } from '../../types';
import { AliasAvatar } from './AliasAvatar';
import { EmptyNote } from '../ui';

type RowProps = {
  row: LeaderboardRow;
  category: RankingCategory;
  isMe: boolean;
  first: boolean;
  /** Narrow phones: tighter spacing and a wrapping metric so aliases fit. */
  compact: boolean;
  onPress: (row: LeaderboardRow) => void;
};

export function RankingRow({ row, category, isMe, first, compact, onPress }: RowProps) {
  const metric = formatMetric(category, row.value);
  return (
    <Pressable
      onPress={() => onPress(row)}
      accessibilityRole="button"
      accessibilityLabel={`Rank ${row.rank}, ${row.user.alias}${isMe ? ' (you)' : ''}, ${metric}`}
      accessibilityHint="Shows a profile preview"
      style={({ pressed }) => [styles.row, compact && styles.rowCompact, !first && styles.divider, isMe && styles.rowMe, pressed && styles.pressed]}
    >
      <Text style={styles.rank}>{row.rank}</Text>
      <AliasAvatar avatar={row.user.avatar} size={compact ? 32 : 38} />
      <Text style={[styles.alias, isMe && styles.aliasMe]} numberOfLines={1}>
        {row.user.alias}
      </Text>
      <Text style={[styles.metric, compact && styles.metricCompact]} numberOfLines={2}>
        {metric}
      </Text>
      <ChevronRight size={18} color={colors.textFaint} strokeWidth={ICON_STROKE} />
    </Pressable>
  );
}

type Props = {
  rows: LeaderboardRow[];
  category: RankingCategory;
  myId: string;
  onPress: (row: LeaderboardRow) => void;
  /** Shown in place of the list when nobody is ranked; omit to show nothing, such as while loading. */
  emptyMessage?: string;
};

/** Everyone on the board, in one rounded list with thin dividers. */
export function RankingList({ rows, category, myId, onPress, emptyMessage }: Props) {
  const compact = useWindowDimensions().width < 370;
  if (rows.length === 0) {
    return emptyMessage ? (
      <View style={styles.list}>
        <EmptyNote>{emptyMessage}</EmptyNote>
      </View>
    ) : null;
  }
  return (
    <View style={styles.list}>
      {rows.map((row, i) => (
        <RankingRow
          key={row.user.id}
          row={row}
          category={category}
          isMe={row.user.id === myId}
          first={i === 0}
          compact={compact}
          onPress={onPress}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingLeft: 14, paddingRight: 10 },
  rowCompact: { gap: 8, paddingLeft: 10, paddingRight: 6 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowMe: { backgroundColor: colors.orangeSoft },
  pressed: { backgroundColor: colors.background },
  rank: { width: 26, fontSize: 14.5, fontFamily: fonts.bold, color: colors.textMuted, textAlign: 'center', fontVariant: ['tabular-nums'] },
  alias: { flex: 1, fontSize: 15, fontFamily: fonts.medium, color: colors.text },
  aliasMe: { fontFamily: fonts.bold },
  metric: { maxWidth: '45%', fontSize: 14, fontFamily: fonts.semibold, color: colors.text, textAlign: 'right', fontVariant: ['tabular-nums'] },
  metricCompact: { maxWidth: 76, fontSize: 13 },
});
