import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { CATEGORY_LABELS, PERIOD_LABELS } from '../../leaderboard/copy';
import { colors, fonts, radius } from '../../theme';
import type { RankingCategory, RankingPeriod } from '../../types';

type Props<T extends string> = {
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
};

const PAD = 4;
const SLIDE = { damping: 22, stiffness: 260, mass: 0.8 };

/** Rounded pill selector whose highlight slides to the selected option. */
export function SegmentedControl<T extends string>({ options, labels, value, onChange, accessibilityLabel }: Props<T>) {
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.indexOf(value));
  const segment = width > 0 ? (width - PAD * 2) / options.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    x.set(withSpring(index * segment, SLIDE));
  }, [index, segment, x]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      style={styles.track}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {segment > 0 ? <Animated.View style={[styles.pill, { width: segment }, pill]} /> : null}
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="tab"
            aria-selected={selected}
            style={({ pressed }) => [styles.option, pressed && !selected && { opacity: 0.6 }]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
              {labels[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const CATEGORIES = ['gifted', 'helped'] as const;
const PERIODS = ['monthly', 'overall'] as const;

export function RankingTypeSelector({ value, onChange }: { value: RankingCategory; onChange: (v: RankingCategory) => void }) {
  return (
    <SegmentedControl options={CATEGORIES} labels={CATEGORY_LABELS} value={value} onChange={onChange} accessibilityLabel="Ranking" />
  );
}

export function TimePeriodSelector({ value, onChange }: { value: RankingPeriod; onChange: (v: RankingPeriod) => void }) {
  return (
    <SegmentedControl options={PERIODS} labels={PERIOD_LABELS} value={value} onChange={onChange} accessibilityLabel="Time period" />
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    height: 46,
    padding: PAD,
    borderRadius: radius.pill,
    backgroundColor: colors.orangeSoft,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pill: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: radius.pill,
    backgroundColor: colors.orange,
  },
  option: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  label: { fontSize: 15, fontFamily: fonts.semibold, color: colors.text },
  // Dark text on the orange pill: white on #EAA647 is below 3:1 contrast.
  labelSelected: { fontFamily: fonts.bold, color: colors.text },
});
