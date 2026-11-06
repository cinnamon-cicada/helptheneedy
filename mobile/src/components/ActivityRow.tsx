import { FileText, Gift } from 'lucide-react-native';
import { type ComponentRef, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, ICON_STROKE } from '../theme';
import type { ActivityRecord } from '../types';
import type { TileRect } from './ProfileShortcutCard';
import { formatCents, formatTimeAgo } from '../utils/format';

function describe(activity: ActivityRecord): string {
  return activity.kind === 'gift_sent'
    ? `You gifted ${formatCents(activity.amountCents)} to ${activity.recipientName}`
    : 'You posted a request';
}

type Props = {
  activity: ActivityRecord;
  divider: boolean;
  /** Opens the full card for this activity, growing out of the row. */
  onOpen: (requestId: string, origin: TileRect) => void;
};

export function ActivityRow({ activity, divider, onOpen }: Props) {
  const Icon = activity.kind === 'gift_sent' ? Gift : FileText;
  const ref = useRef<ComponentRef<typeof Pressable>>(null);

  return (
    <Pressable
      ref={ref}
      onPress={() =>
        ref.current?.measureInWindow((x, y, width, height) => onOpen(activity.requestId, { x, y, width, height }))
      }
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, divider && styles.divider, pressed && { opacity: 0.6 }]}
    >
      <View style={styles.icon}>
        <Icon size={18} color={colors.orangeText} strokeWidth={ICON_STROKE} />
      </View>
      <View style={styles.text}>
        <Text style={styles.description}>{describe(activity)}</Text>
        <Text style={styles.time}>{formatTimeAgo(activity.minutesAgo)}</Text>
      </View>
    </Pressable>
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
