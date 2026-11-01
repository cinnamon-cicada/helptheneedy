import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DEFAULT_FILTERS } from '../state/useDiscoverState';
import { colors } from '../theme';
import type { Category, Filters } from '../types';
import { BottomSheet } from './BottomSheet';
import { Chip, PrimaryButton, TextButton } from './ui';

const CATEGORY_ORDER: Category[] = ['Food', 'Product', 'Bills', 'School', 'Celebration'];

const AMOUNTS: { label: string; cents: number | null }[] = [
  { label: 'Any amount', cents: null },
  { label: 'Under $10', cents: 1000 },
  { label: 'Under $25', cents: 2500 },
  { label: 'Under $50', cents: 5000 },
];

type Props = {
  visible: boolean;
  filters: Filters;
  /** Categories that have at least one request; others are hidden. */
  availableCategories: Category[];
  /** How many requests a set of filters would show, for the apply button. */
  countFor: (filters: Filters) => number;
  onApply: (filters: Filters) => void;
  onClose: () => void;
};

export function FilterBottomSheet({ visible, filters, availableCategories, countFor, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<Filters>(filters);
  const [wasVisible, setWasVisible] = useState(visible);

  // Start from the applied filters each time the sheet opens.
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDraft(filters);
  }

  const count = countFor(draft);
  const categories: (Category | 'All')[] = [
    'All',
    ...CATEGORY_ORDER.filter((c) => availableCategories.includes(c)),
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Filter requests">
      <View style={styles.header}>
        <Text style={styles.title}>Filters</Text>
        <TextButton label="Reset" onPress={() => setDraft(DEFAULT_FILTERS)} />
      </View>

      <Text style={styles.sectionLabel}>Category</Text>
      <View style={styles.chips}>
        {categories.map((cat) => (
          <Chip
            key={cat}
            label={cat}
            selected={draft.category === cat}
            onPress={() => setDraft((d) => ({ ...d, category: cat }))}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>Amount</Text>
      <View style={styles.chips}>
        {AMOUNTS.map((a) => (
          <Chip
            key={a.label}
            label={a.label}
            selected={draft.maxAmountCents === a.cents}
            onPress={() => setDraft((d) => ({ ...d, maxAmountCents: a.cents }))}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label={count === 0 ? 'No matching requests' : `Show ${count} ${count === 1 ? 'request' : 'requests'}`}
          disabled={count === 0}
          onPress={() => onApply(draft)}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 19, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  sectionLabel: { marginTop: 18, marginBottom: 10, fontSize: 13, fontWeight: '600', color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { marginTop: 26 },
});
