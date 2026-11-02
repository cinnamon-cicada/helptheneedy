import { Info } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomNavigation, useBottomNavSpace } from '../components/BottomNavigation';
import { LeaderboardHeader } from '../components/leaderboard/LeaderboardHeader';
import { LeaderboardInfoSheet, ProfilePreviewSheet } from '../components/leaderboard/LeaderboardSheets';
import { RankingList } from '../components/leaderboard/RankingList';
import { RankingTypeSelector, TimePeriodSelector } from '../components/leaderboard/SegmentedControl';
import { TopThreePodium } from '../components/leaderboard/TopThreePodium';
import { YourRankSummary } from '../components/leaderboard/YourRankSummary';
import { LEADERBOARD_USERS, MOCK_TRANSACTIONS, MY_LEADERBOARD_ID } from '../data/mockLeaderboard';
import { describeBoard } from '../leaderboard/copy';
import { computeLeaderboard, findRow } from '../leaderboard/ranking';
import { colors, fonts, ICON_STROKE } from '../theme';
import type { LeaderboardRow, RankingCategory, RankingPeriod } from '../types';

const CONTENT_MAX_W = 520;

export function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const navSpace = useBottomNavSpace();
  const [category, setCategory] = useState<RankingCategory>('gifted');
  const [period, setPeriod] = useState<RankingPeriod>('monthly');
  const [infoOpen, setInfoOpen] = useState(false);
  // Kept after the sheet closes so its exit animation still has content.
  const [preview, setPreview] = useState<LeaderboardRow | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const rows = useMemo(
    () => computeLeaderboard({ users: LEADERBOARD_USERS, transactions: MOCK_TRANSACTIONS, category, period }),
    [category, period],
  );
  const me = findRow(rows, MY_LEADERBOARD_ID);
  const boardKey = `${category}-${period}`;

  const openPreview = (row: LeaderboardRow) => {
    setPreview(row);
    setPreviewOpen(true);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 10, paddingBottom: navSpace + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.column}>
          <LeaderboardHeader />

          <View style={styles.filters}>
            <RankingTypeSelector value={category} onChange={setCategory} />
            <TimePeriodSelector value={period} onChange={setPeriod} />
          </View>

          <View style={styles.description}>
            <Text style={styles.descriptionText}>{describeBoard(category, period)}</Text>
            <Pressable
              onPress={() => setInfoOpen(true)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="How rankings work"
              style={({ pressed }) => pressed && { opacity: 0.6 }}
            >
              <Info size={16} color={colors.textMuted} strokeWidth={ICON_STROKE} />
            </Pressable>
          </View>

          <TopThreePodium rows={rows} category={category} animationKey={boardKey} onPress={openPreview} />

          <Animated.View key={`me-${boardKey}`} entering={FadeIn.duration(220)}>
            <YourRankSummary row={me} category={category} />
          </Animated.View>

          <Animated.View key={`list-${boardKey}`} entering={FadeIn.duration(260).delay(60)}>
            <RankingList rows={rows.slice(3)} category={category} myId={MY_LEADERBOARD_ID} onPress={openPreview} />
          </Animated.View>

          <Text style={styles.footnote}>Totals are reported by members, not verified.</Text>
        </View>
      </ScrollView>

      <BottomNavigation active="ranks" />

      <LeaderboardInfoSheet visible={infoOpen} onClose={() => setInfoOpen(false)} />
      <ProfilePreviewSheet
        row={preview}
        visible={previewOpen}
        category={category}
        period={period}
        isMe={preview?.user.id === MY_LEADERBOARD_ID}
        onClose={() => setPreviewOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18 },
  column: { width: '100%', maxWidth: CONTENT_MAX_W, alignSelf: 'center', gap: 16 },
  filters: { gap: 10, marginTop: 4 },
  description: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 },
  descriptionText: { flexShrink: 1, fontSize: 14, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
  footnote: { fontSize: 12, fontFamily: fonts.regular, color: colors.textFaint, textAlign: 'center' },
});
