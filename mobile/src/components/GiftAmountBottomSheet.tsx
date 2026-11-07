import { Check, EyeOff, Wallet } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { STARTING_BALANCE_CENTS, useDemo } from '../demo/DemoProvider';
import { colors, fonts, ICON_STROKE, radius } from '../theme';
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

/** Rounds to whole dollars, never below $1, and drops any above the balance. */
function suggestions(amountCents: number, balanceCents: number): number[] {
  const round = (cents: number) => Math.max(MIN_CENTS, Math.round(cents / 100) * 100);
  const values = [round(amountCents * 0.25), round(amountCents * 0.5), amountCents];
  return [...new Set(values)].filter((v) => v <= amountCents && v <= balanceCents);
}

function parseDollarsToCents(text: string): number | null {
  const cleaned = text.replace(/[^0-9.]/g, '');
  if (!/^\d*(\.\d{0,2})?$/.test(cleaned) || cleaned === '' || cleaned === '.') return null;
  const [whole, frac = ''] = cleaned.split('.');
  return Number(whole || '0') * 100 + Number(frac.padEnd(2, '0'));
}

/** What to tell the gifter when a gift isn't saved. Nothing comes off the balance in that case. */
function giftErrorMessage(code: string, name: string): string {
  switch (code) {
    case 'insufficient_balance':
      return 'That is more than your demo balance.';
    case 'invalid_amount':
      return `${name}'s request changed. Pick a smaller amount.`;
    case 'post_not_open':
      return `${name}'s request is already fully gifted.`;
    case 'rate_limited':
      return "You've sent a lot of gifts today. Try again tomorrow.";
    default:
      return "Your gift wasn't sent. Check your connection and try again.";
  }
}

/**
 * Gifting flow for the demo. Gifts come out of the demo balance, which is play
 * money saved on this device only. Nothing here charges or moves real money.
 */
export function GiftAmountBottomSheet({ request, visible, onDismiss, onComplete }: Props) {
  const { balanceCents, sendGift, resetDemo } = useDemo();
  const [step, setStep] = useState<Step>('amount');
  const [selected, setSelected] = useState<number | 'custom'>(0);
  const [customText, setCustomText] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const options = useMemo(
    () => (request ? suggestions(request.amountCents, balanceCents) : []),
    [request, balanceCents],
  );

  const [openedFor, setOpenedFor] = useState<GiftRequest | null>(null);

  // Fresh state each time the sheet opens for a request.
  const openKey = visible ? request : null;
  if (openKey !== openedFor) {
    setOpenedFor(openKey);
    if (openKey) {
      const fits = suggestions(openKey.amountCents, balanceCents);
      setStep('amount');
      setSelected(fits.includes(openKey.amountCents) ? openKey.amountCents : (fits.at(-1) ?? 'custom'));
      setCustomText('');
      setAnonymous(false);
      setSendError(null);
    }
  }

  if (!request) return null;

  const name = request.recipient.displayName;
  const maxCents = Math.min(request.amountCents, balanceCents);
  const customCents = parseDollarsToCents(customText);
  const amountCents = selected === 'custom' ? customCents : selected;
  const customError =
    selected === 'custom' && customText !== ''
      ? customCents === null || customCents < MIN_CENTS
        ? 'Enter at least $1.00'
        : customCents > request.amountCents
          ? `Up to ${formatCents(request.amountCents)}, the amount ${name} asked for`
          : customCents > balanceCents
            ? `You have ${formatCents(balanceCents)} left`
            : null
      : null;
  const valid = amountCents !== null && amountCents >= MIN_CENTS && amountCents <= maxCents;

  const send = async () => {
    if (amountCents === null || sending) return;
    setSending(true);
    setSendError(null);
    const result = await sendGift(request, amountCents, anonymous);
    setSending(false);
    if (result.ok) setStep('done');
    else setSendError(giftErrorMessage(result.error, name));
  };

  const close = step === 'done' ? onComplete : onDismiss;

  if (step === 'amount' && balanceCents < MIN_CENTS) {
    return (
      <BottomSheet visible={visible} onClose={onDismiss} accessibilityLabel={`Gift ${name}`}>
        <View style={styles.done}>
          <View style={styles.doneBadge}>
            <Wallet size={28} color={colors.orangeText} strokeWidth={ICON_STROKE} />
          </View>
          <Text style={styles.doneTitle}>{"You've used your demo balance"}</Text>
          <Text style={styles.doneBody}>Reset the demo to start again with $1,000.</Text>
          <View style={styles.doneButton}>
            <PrimaryButton
              label="Reset demo"
              onPress={() => {
                resetDemo();
                setSelected(request.amountCents <= STARTING_BALANCE_CENTS ? request.amountCents : 'custom');
              }}
            />
          </View>
        </View>
      </BottomSheet>
    );
  }

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
            label={sending ? 'Sending…' : valid && amountCents !== null ? `Continue · ${formatCents(amountCents)}` : 'Continue'}
            disabled={!valid || sending}
            onPress={send}
          />
          {sendError ? <Text style={[styles.error, styles.sendError]}>{sendError}</Text> : null}
          <Text style={styles.footnote}>
            {`Demo balance ${formatCents(balanceCents)}. No real payment is processed.`}
          </Text>
        </View>
      ) : (
        <View style={styles.done}>
          <View style={styles.doneBadge}>
            <Check size={30} color={colors.orangeText} strokeWidth={2.25} />
          </View>
          <Text style={styles.doneTitle}>Demo gift recorded</Text>
          <Text style={styles.doneBody}>
            {`${amountCents !== null ? formatCents(amountCents) : ''} to ${name} for "${request.title}"${anonymous ? ', anonymously' : ''}. Demo balance: ${formatCents(balanceCents)}.`}
          </Text>
          <Text style={styles.footnote}>Demo only. No real payment was processed.</Text>
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
  title: { fontSize: 19, fontFamily: fonts.display, color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, fontFamily: fonts.regular, color: colors.textMuted },
  askPill: {
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.orangeSoft,
  },
  askLabel: { fontSize: 11, fontFamily: fonts.semibold, color: colors.textMuted },
  askAmount: { fontSize: 15, fontFamily: fonts.bold, color: colors.orangeText, fontVariant: ['tabular-nums'] },
  sectionLabel: { marginTop: 22, marginBottom: 10, fontSize: 13, fontFamily: fonts.semibold, color: colors.textMuted },
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
  currency: { fontSize: 20, fontFamily: fonts.semibold, color: colors.textMuted, marginRight: 4 },
  customInput: { flex: 1, fontSize: 20, fontFamily: fonts.semibold, color: colors.text, paddingVertical: 0, outlineWidth: 0 },
  sendError: { marginTop: 10, textAlign: 'center' },
  error: { marginTop: 6, fontSize: 12.5, fontFamily: fonts.regular, color: colors.skip },
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
  anonTitle: { fontSize: 15, fontFamily: fonts.semibold, color: colors.text },
  anonBody: { fontSize: 12.5, fontFamily: fonts.regular, lineHeight: 17, color: colors.textMuted },
  footnote: { marginTop: 12, fontSize: 12, fontFamily: fonts.regular, color: colors.textFaint, textAlign: 'center' },
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
  doneTitle: { fontSize: 20, fontFamily: fonts.display, color: colors.text, letterSpacing: -0.3 },
  doneBody: {
    marginTop: 8,
    fontSize: 14.5, fontFamily: fonts.regular,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  doneButton: { alignSelf: 'stretch', marginTop: 20 },
});
