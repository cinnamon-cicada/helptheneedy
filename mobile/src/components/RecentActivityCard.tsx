import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, ICON_STROKE, radius, shadow } from '../theme';
import type { ActivityRecord } from '../types';
import { ActivityRow } from './ActivityRow';

export function RecentActivityCard({
  activity,
  onViewAll,
}: {
  activity: ActivityRecord[];
  onViewAll: () => void;
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
      {activity.map((item, i) => (
        <ActivityRow key={item.id} activity={item} divider={i > 0} />
      ))}
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
    borderColor: colors.border,
    boxShadow: shadow.layer,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 16.5, fontWeight: '700', color: colors.text },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { fontSize: 13.5, fontWeight: '600', color: colors.orangeText },
});
