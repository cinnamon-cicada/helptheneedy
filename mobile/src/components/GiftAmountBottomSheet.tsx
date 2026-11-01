import { Check, EyeOff } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { colors, ICON_STROKE, radius } from '../theme';
import type { GiftRequest } from '../types';
import { formatCents } from '../utils/format';
import { Avatar } from './Avatar';
import { BottomSheet } from './BottomSheet';
import { Chip, PrimaryButton } from './ui';

type Props = {
  request: GiftRequest | null;
  visible: boolean;
  /** Closed before finishing: the card goes back to the deck. */
  onDismiss: () => void;
  /** Finished the simulated flow: the deck advances. */
  onComplete: () => void;
};

type Step = 'amount' | 'done';

const MIN_CENTS = 100;

/** Rounds to whole dollars, never below $1. */
function suggestions(amountCents: number): number[] {
  const round = (cents: number) => Math.max(MIN_CENTS, Math.round(cents / 100) * 100);
  const values = [round(amountCents * 0.25), round(amountCents * 0.5), amountCents];
  return [...new Set(values)].filter((v) => v <= amountCents);
}

function parseDollarsToCents(text: string): number | null {
  const cleaned = text.replace(/[^0-9.]/g, '');
  if (!/^\d*(\.\d{0,2})?$/.test(cleaned) || cleaned === '' || cleaned === '.') return null;
  const [whole, frac = ''] = cleaned.split('.');
  return Number(whole || '0') * 100 + Number(frac.padEnd(2, '0'));
}

/**
 * Frontend-only gifting flow. Nothing here charges, moves, or records money
 * anywhere outside local component state.
 */
export function GiftAmountBottomSheet({ request, visible, onDismiss, onComplete }: Props) {
  const [step, setStep] = useState<Step>('amount');
  const [selected, setSelected] = useState<number | 'custom'>(0);
  const [customText, setCustomText] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  const options = useMemo(() => (request ? suggestions(request.amountCents) : []), [request]);

  const [openedFor, setOpenedFor] = useState<GiftRequest | null>(null);

  // Fresh state each time the sheet opens for a request.
  const openKey = visible ? request : null;
  if (openKey !== openedFor) {
    setOpenedFor(openKey);
    if (openKey) {
      setStep('amount');
      setSelected(openKey.amountCents);
      setCustomText('');
      setAnonymous(false);
    }
  }

  if (!request) return null;

  const name = request.recipient.displayName;
  const customCents = parseDollarsToCents(customText);
  const amountCents = selected === 'custom' ? customCents : selected;
  const customError =
    selected === 'custom' && customText !== ''
      ? customCents === null || customCents < MIN_CENTS
        ? 'Enter at least $1.00'
        : customCents > request.amountCents
          ? `Up to ${formatCents(request.amountCents)}, the amount ${name} asked for`
          : null
      : null;
  const valid = amountCents !== null && amountCents >= MIN_CENTS && amountCents <= request.amountCents;

  const close = step === 'done' ? onComplete : onDismiss;

  return (
    <BottomSheet visible={visible} onClose={close} accessibilityLabel={`Gift ${name}`}>
      {step === 'amount' ? (
        <View>
          <View style={styles.header}>
            <Avatar uri={request.recipient.avatarUrl} size={46} />
            <View style={styles.headerText}>
              <Text style={styles.title}>Gift {name}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {request.title}
              </Text>
            </View>
            <View style={styles.askPill}>
              <Text style={styles.askLabel}>Asking</Text>
              <Text style={styles.askAmount}>{formatCents(request.amountCents)}</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Choose an amount</Text>
          <View style={styles.chips}>
            {options.map((cents) => (
              <Chip
                key={cents}
                label={cents === request.amountCents ? `${formatCents(cents)} · Full` : formatCents(cents)}
                selected={selected === cents}
                onPress={() => setSelected(cents)}
              />
            ))}
            <Chip label="Custom" selected={selected === 'custom'} onPress={() => setSelected('custom')} />
          </View>

          {selected === 'custom' ? (
            <View>
              <View style={[styles.customField, customError ? styles.customFieldError : null]}>
                <Text style={styles.currency}>$</Text>
                <TextInput
                  value={customText}
                  onChangeText={setCustomText}
                  placeholder="0.00"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="decimal-pad"
                  style={styles.customInput}
                  autoFocus
                  maxLength={8}
                  accessibilityLabel="Custom gift amount in dollars"
                />
              </View>
              {customError ? <Text style={styles.error}>{customError}</Text> : null}
            </View>
          ) : null}

          <View style={styles.anonRow}>
            <View style={styles.anonIcon}>
              <EyeOff size={18} color={colors.orangeText} strokeWidth={ICON_STROKE} />
            </View>
            <View style={styles.anonText}>
              <Text style={styles.anonTitle}>Gift anonymously</Text>
              <Text style={styles.anonBody}>
                {anonymous
                  ? `${name} will see "Someone sent you a gift" instead of your name.`
                  : `${name} will see your name with the gift.`}
              </Text>
            </View>
            <Switch
              value={anonymous}
              onValueChange={setAnonymous}
              trackColor={{ false: colors.borderStrong, true: colors.orange }}
              thumbColor={colors.card}
              ios_backgroundColor={colors.borderStrong}
              accessibilityLabel="Gift anonymously"
            />
          </View>

          <PrimaryButton
            label={valid && amountCents !== null ? `Continue · ${formatCents(amountCents)}` : 'Continue'}
            disabled={!valid}
            onPress={() => setStep('done')}
          />
          <Text style={styles.footnote}>Prototype only. No payment is processed and no money moves.</Text>
        </View>
      ) : (
        <View style={styles.done}>
          <View style={styles.doneBadge}>
            <Check size={30} color={colors.orangeText} strokeWidth={2.25} />
          </View>
          <Text style={styles.doneTitle}>Thank you for your kindness</Text>
          <Text style={styles.doneBody}>
            {`Your ${amountCents !== null ? formatCents(amountCents) : ''} gift for ${name}'s "${request.title}" is saved in this prototype${anonymous ? ', anonymously' : ''}.`}
          </Text>
          <Text style={styles.footnote}>No payment was processed.</Text>
          <View style={styles.doneButton}>
            <PrimaryButton label="Done" onPress={onComplete} />
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: 19, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: colors.textMuted },
  askPill: {
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.orangeSoft,
  },
  askLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  askAmount: { fontSize: 15, fontWeight: '700', color: colors.orangeText, fontVariant: ['tabular-nums'] },
  sectionLabel: { marginTop: 22, marginBottom: 10, fontSize: 13, fontWeight: '600', color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  customField: {
    marginTop: 12,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.yellow,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
  },
  customFieldError: { borderColor: colors.skip },
  currency: { fontSize: 20, fontWeight: '600', color: colors.textMuted, marginRight: 4 },
  customInput: { flex: 1, fontSize: 20, fontWeight: '600', color: colors.text, paddingVertical: 0, outlineWidth: 0 },
  error: { marginTop: 6, fontSize: 12.5, color: colors.skip },
  anonRow: {
    marginTop: 20,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  anonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anonText: { flex: 1, gap: 2 },
  anonTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  anonBody: { fontSize: 12.5, lineHeight: 17, color: colors.textMuted },
  footnote: { marginTop: 12, fontSize: 12, color: colors.textFaint, textAlign: 'center' },
  done: { alignItems: 'center', paddingTop: 8 },
  doneBadge: {
    width: 68,
    height: 68,
    borderRadius: radius.pill,
    backgroundColor: colors.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  doneTitle: { fontSize: 20, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  doneBody: {
    marginTop: 8,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  doneButton: { alignSelf: 'stretch', marginTop: 20 },
});
