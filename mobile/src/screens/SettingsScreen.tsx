import { RotateCcw } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PlaceholderCard, SubScreen } from '../components/SubScreen';
import { STARTING_BALANCE_CENTS, useDemo } from '../demo/DemoProvider';
import { colors, fonts, ICON_STROKE, radius } from '../theme';
import { formatDollars } from '../utils/format';

export function SettingsScreen() {
  const { resetDemo, online } = useDemo();
  const [didReset, setDidReset] = useState(false);

  return (
    <SubScreen title="Settings">
      <View style={styles.card}>
        <Pressable
          onPress={() => {
            resetDemo();
            setDidReset(true);
          }}
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
        >
          <View style={styles.icon}>
            <RotateCcw size={18} color={colors.orangeText} strokeWidth={ICON_STROKE} />
          </View>
          <View style={styles.text}>
            <Text style={styles.rowTitle}>Reset demo</Text>
            <Text style={styles.rowBody}>
              {didReset
                ? `Done. Your balance is back to ${formatDollars(STARTING_BALANCE_CENTS)}.`
                : online
                  ? `Sets your balance back to ${formatDollars(STARTING_BALANCE_CENTS)}. Your gifts stay on the leaderboards.`
                  : `Clears your gifts and profile edits and sets your balance back to ${formatDollars(STARTING_BALANCE_CENTS)}.`}
            </Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.gap} />
      <PlaceholderCard
        title="More settings later"
        body="Account and privacy settings will live here once the app connects to its backend."
      />
    </SubScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontFamily: fonts.semibold, color: colors.text },
  rowBody: { fontSize: 12.5, fontFamily: fonts.regular, lineHeight: 17, color: colors.textMuted },
  gap: { height: 16 },
});
