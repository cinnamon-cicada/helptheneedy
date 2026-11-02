import { FileText, Gift } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, ICON_STROKE } from '../theme';
import type { ActivityRecord } from '../types';
import { formatCents, formatTimeAgo } from '../utils/format';

function describe(activity: ActivityRecord): string {
  return activity.kind === 'gift_sent'
    ? `You gifted ${formatCents(activity.amountCents)} to ${activity.recipientName}`
    : 'You posted a request';
}

export function ActivityRow({ activity, divider }: { activity: ActivityRecord; divider: boolean }) {
  const Icon = activity.kind === 'gift_sent' ? Gift : FileText;

  return (
    <View style={[styles.row, divider && styles.divider]}>
      <View style={styles.icon}>
        <Icon size={18} color={colors.orangeText} strokeWidth={ICON_STROKE} />
      </View>
      <View style={styles.text}>
        <Text style={styles.description}>{describe(activity)}</Text>
        <Text style={styles.time}>{formatTimeAgo(activity.minutesAgo)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orangeSoft,
  },
  text: { flex: 1 },
  description: { fontSize: 14.5, fontFamily: fonts.medium, color: colors.text },
  time: { marginTop: 2, fontSize: 12.5, fontFamily: fonts.regular, color: colors.textMuted },
});
