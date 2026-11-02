import { CreditCard, type LucideIcon, Smartphone, Wallet } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, ICON_STROKE, radius } from '../../theme';

const PROVIDERS: { name: string; Icon: LucideIcon }[] = [
  { name: 'PayPal', Icon: Wallet },
  { name: 'Venmo', Icon: Smartphone },
  { name: 'Stripe', Icon: CreditCard },
];

/**
 * Placeholder only. The app doesn't handle money (see ARCHITECTURE.md), so
 * these rows are disabled and nothing is ever connected or collected.
 */
export function PaymentPlaceholders() {
  return (
    <View style={styles.section}>
      <View>
        <Text style={styles.title} accessibilityRole="header">
          Connect a payment method
        </Text>
        <Text style={styles.subtitle}>Optional. Payment connections aren&apos;t available yet.</Text>
      </View>
      <View style={styles.list}>
        {PROVIDERS.map(({ name, Icon }, i) => (
          <View
            key={name}
            style={[styles.row, i > 0 && styles.rowDivider]}
            accessible
            accessibilityRole="button"
            aria-disabled
            accessibilityLabel={`Connect ${name}`}
            accessibilityHint="Coming soon. Not available yet."
          >
            <View style={styles.icon}>
              <Icon size={19} color={colors.textMuted} strokeWidth={ICON_STROKE} />
            </View>
            <Text style={styles.name}>Connect {name}</Text>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Coming soon</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 14 },
  title: { fontSize: 16.5, fontFamily: fonts.bold, color: colors.text, letterSpacing: -0.2 },
  subtitle: { marginTop: 4, fontSize: 13.5, fontFamily: fonts.regular, color: colors.textMuted },
  list: {
    borderRadius: radius.field + 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, height: 58 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { flex: 1, fontSize: 15, fontFamily: fonts.medium, color: colors.textMuted },
  pill: {
    paddingHorizontal: 10,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.orangeSoft,
    justifyContent: 'center',
  },
  pillText: { fontSize: 12, fontFamily: fonts.semibold, color: colors.orangeText },
});
