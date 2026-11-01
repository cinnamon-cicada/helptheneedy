import { StyleSheet, Text, View } from 'react-native';

import { ActivityRow } from '../components/ActivityRow';
import { SubScreen } from '../components/SubScreen';
import { MOCK_ACTIVITY } from '../data/mockProfile';
import { colors, radius, shadow } from '../theme';

export function ActivityScreen() {
  return (
    <SubScreen title="Activity">
      <View style={styles.card}>
        {MOCK_ACTIVITY.map((item, i) => (
          <ActivityRow key={item.id} activity={item} divider={i > 0} />
        ))}
      </View>
      <Text style={styles.note}>Sample data for this prototype.</Text>
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
    borderColor: colors.border,
    boxShadow: shadow.layer,
  },
  note: { marginTop: 14, fontSize: 12.5, color: colors.textMuted, textAlign: 'center' },
});
