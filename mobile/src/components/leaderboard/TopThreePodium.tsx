import { Crown } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { formatMetric } from '../../leaderboard/copy';
import { colors, fonts } from '../../theme';
import type { LeaderboardRow, RankingCategory } from '../../types';
import { AliasAvatar } from './AliasAvatar';

type Place = 1 | 2 | 3;

const MEDALS: Record<Place, { ring: string; crown: string; crownStroke: string; block: [string, string]; height: number }> = {
  1: { ring: '#E9B949', crown: '#F5C85C', crownStroke: '#C9922B', block: ['#FCE7AE', '#F4C862'], height: 112 },
  2: { ring: '#B9C0CA', crown: '#DFE3E9', crownStroke: '#8E97A3', block: ['#FFF8EE', '#F3E6D3'], height: 92 },
  3: { ring: '#D39A6A', crown: '#EDBB93', crownStroke: '#A8693F', block: ['#FDE8DA', '#F6C3A2'], height: 80 },
};

const ORDINAL: Record<Place, string> = { 1: '1st', 2: '2nd', 3: '3rd' };

type PodiumUserProps = {
  place: Place;
  row: LeaderboardRow | undefined;
  category: RankingCategory;
  avatarSize: number;
  /** Narrow phones: smaller type so aliases fit. */
  compact: boolean;
  animationKey: string;
  onPress: (row: LeaderboardRow) => void;
};

/** One podium column: crown, ringed avatar with a medal, then the block. */
export function PodiumUser({ place, row, category, avatarSize, compact, animationKey, onPress }: PodiumUserProps) {
  const medal = MEDALS[place];
  const ring = place === 1 ? 4 : 3;

  return (
    <Animated.View
      key={`${animationKey}-${row?.user.id ?? 'empty'}`}
      entering={FadeInDown.duration(340).delay(place === 1 ? 0 : 70 * place).springify().damping(17)}
      style={styles.column}
    >
      <Pressable
        disabled={!row}
        onPress={() => row && onPress(row)}
        accessibilityRole="button"
        accessibilityLabel={row ? `${ORDINAL[place]} place, ${row.user.alias}, ${formatMetric(category, row.value)}` : `${ORDINAL[place]} place, empty`}
        style={({ pressed }) => [styles.press, pressed && { transform: [{ scale: 0.97 }] }]}
      >
        <Crown size={place === 1 ? 26 : 20} color={medal.crownStroke} fill={medal.crown} strokeWidth={1.6} />
        <View style={[styles.ring, { padding: ring, borderRadius: avatarSize, backgroundColor: medal.ring }]}>
          {row ? (
            <AliasAvatar avatar={row.user.avatar} size={avatarSize} />
          ) : (
            <View style={[styles.emptyAvatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]} />
          )}
          <View style={[styles.medal, { backgroundColor: medal.ring }]}>
            <Text style={styles.medalText}>{place}</Text>
          </View>
        </View>

        <View style={[styles.block, { height: medal.height }]}>
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id={`podium${place}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={medal.block[0]} />
                <Stop offset="1" stopColor={medal.block[1]} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={`url(#podium${place})`} />
          </Svg>
          <Text style={[styles.name, place === 1 && styles.nameFirst, compact && styles.nameCompact]} numberOfLines={1}>
            {row ? row.user.alias : '—'}
          </Text>
          {row ? (
            <Text style={[styles.value, compact && styles.valueCompact]} numberOfLines={2}>
              {formatMetric(category, row.value)}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

type Props = {
  rows: LeaderboardRow[];
  category: RankingCategory;
  animationKey: string;
  onPress: (row: LeaderboardRow) => void;
};

/** Second | First | Third, with first raised in the middle. */
export function TopThreePodium({ rows, category, animationKey, onPress }: Props) {
  const { width } = useWindowDimensions();
  const compact = width < 370;
  const first = compact ? 66 : 78;
  const other = compact ? 52 : 60;
  const common = { category, compact, animationKey, onPress };

  return (
    <View style={styles.podium}>
      <PodiumUser place={2} row={rows[1]} avatarSize={other} {...common} />
      <PodiumUser place={1} row={rows[0]} avatarSize={first} {...common} />
      <PodiumUser place={3} row={rows[2]} avatarSize={other} {...common} />
    </View>
  );
}

const styles = StyleSheet.create({
  podium: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  column: { flex: 1 },
  press: { alignItems: 'center' },
  ring: { marginTop: 2, boxShadow: '0px 6px 16px rgba(138, 90, 43, 0.16)' },
  emptyAvatar: { backgroundColor: colors.orangeSoft },
  medal: {
    position: 'absolute',
    bottom: -8,
    alignSelf: 'center',
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalText: { fontSize: 12.5, fontFamily: fonts.bold, color: colors.text },
  block: {
    alignSelf: 'stretch',
    marginTop: 16,
    paddingTop: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    overflow: 'hidden',
    boxShadow: '0px 8px 20px rgba(138, 90, 43, 0.10)',
  },
  name: { fontSize: 14, fontFamily: fonts.bold, color: colors.text },
  nameFirst: { fontSize: 15 },
  nameCompact: { fontSize: 12.5 },
  value: {
    marginTop: 3,
    fontSize: 12.5,
    fontFamily: fonts.semibold,
    color: colors.text,
    opacity: 0.75,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  valueCompact: { fontSize: 11.5 },
});
