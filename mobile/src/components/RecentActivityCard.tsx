import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, ICON_STROKE, radius } from '../theme';
import type { ActivityRecord } from '../types';
import { ActivityRow } from './ActivityRow';
import type { TileRect } from './ProfileShortcutCard';
import { EmptyNote } from './ui';

export function RecentActivityCard({
  activity,
  onViewAll,
  onOpen,
}: {
  activity: ActivityRecord[];
  onViewAll: () => void;
  onOpen: (requestId: string, origin: TileRect) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Recent Activity</Text>
        <Pressable
          onPress={onViewAll}
          hitSlop={10}
          accessibilityRole="button"
          style={({ pressed }) => [styles.viewAll, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <ChevronRight size={15} color={colors.orangeText} strokeWidth={ICON_STROKE} />
        </Pressable>
      </View>
      {activity.length === 0 ? (
        <EmptyNote>No activity yet. Gifts you send will show up here.</EmptyNote>
      ) : (
        activity.map((item, i) => <ActivityRow key={item.id} activity={item} divider={i > 0} onOpen={onOpen} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 16.5, fontFamily: fonts.display, color: colors.text },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { fontSize: 13.5, fontFamily: fonts.semibold, color: colors.orangeText },
});
