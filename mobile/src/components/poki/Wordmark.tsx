import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../../theme';

export function Wordmark() {
  return (
    <View style={styles.wordmark} accessible accessibilityRole="header" accessibilityLabel="poki">
      <Text style={styles.wordmarkText}>poki</Text>
      <View style={styles.wordmarkDot} />
    </View>
  );
}

const styles = StyleSheet.create({
  wordmark: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  wordmarkText: { fontSize: 30, fontFamily: fonts.display, color: colors.text, letterSpacing: -1.2 },
  wordmarkDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.orange, marginBottom: 7 },
});
