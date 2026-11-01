import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import type { Person } from '../types';
import { formatDollars } from '../utils/format';

export function ProfileStats({
  profile,
}: {
  profile: Pick<Person, 'totalGiftedCents' | 'peopleHelped' | 'requestsPosted'>;
}) {
  const stats = [
    { label: 'Total Gifted', value: profile.totalGiftedCents === null ? '–' : formatDollars(profile.totalGiftedCents) },
    { label: 'People Helped', value: String(profile.peopleHelped) },
    { label: 'Requests Posted', value: String(profile.requestsPosted) },
  ];

  return (
    <View style={styles.row}>
      {stats.map((stat, i) => (
        <Fragment key={stat.label}>
          {i > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.stat}>
            <Text style={styles.value}>{stat.value}</Text>
            <Text style={styles.label}>{stat.label}</Text>
          </View>
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  divider: { width: 1, height: 34, backgroundColor: colors.borderStrong },
  value: { fontSize: 21, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  label: { marginTop: 3, fontSize: 12.5, color: colors.textOnPeach, textAlign: 'center' },
});
