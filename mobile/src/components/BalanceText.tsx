import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useDemo } from '../demo/DemoProvider';
import { colors, fonts } from '../theme';
import { formatDollars } from '../utils/format';

const DURATION_MS = 400;

/** The demo balance as plain text. When it changes, it counts to the new value. */
export function BalanceText() {
  const { balanceCents } = useDemo();
  const [shown, setShown] = useState(balanceCents);
  const shownRef = useRef(balanceCents);

  useEffect(() => {
    const from = shownRef.current;
    if (from === balanceCents) return;
    const start = Date.now();
    let frame = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / DURATION_MS);
      const eased = 1 - (1 - t) ** 3;
      const value = t === 1 ? balanceCents : Math.round(from + (balanceCents - from) * eased);
      shownRef.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [balanceCents]);

  return (
    <Text style={styles.balance} accessibilityLabel={`Demo balance, ${formatDollars(balanceCents)}`}>
      {formatDollars(shown)}
    </Text>
  );
}

const styles = StyleSheet.create({
  balance: {
    fontSize: 20,
    fontFamily: fonts.semibold,
    color: colors.text,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
  },
});
