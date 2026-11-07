import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '../theme';

export const DEMO_DISCLOSURE = 'Fictional profiles and simulated gifts. No real payments. Photos are illustrative; the people pictured are not users, requesters, or endorsers.';

/** Always visible, including when a demo profile is opened by a direct link. */
export function DemoDisclosure() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.notice, { paddingBottom: Math.max(6, insets.bottom) }]}>
      <Text style={styles.title}>Poki demo · No real payments</Text>
      <Text style={styles.body}>{DEMO_DISCLOSURE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { paddingHorizontal: 16, paddingTop: 6, backgroundColor: colors.background },
  title: { fontFamily: fonts.semibold, fontSize: 11, color: colors.text, textAlign: 'center' },
  body: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 15, color: colors.textMuted, textAlign: 'center' },
});
