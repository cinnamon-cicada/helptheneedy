import { RotateCw } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FILTERS } from '../../post/photo';
import type { CropAspect, CropSpec, FilterId, Overlay, Photo } from '../../post/types';
import { colors, fonts, ICON_STROKE, radius } from '../../theme';
import { BottomSheet } from '../BottomSheet';
import { Chip, PrimaryButton, TextButton } from '../ui';
import { PhotoStage } from './PhotoStage';

const ASPECTS: { id: CropAspect; label: string }[] = [
  { id: 'original', label: 'Original' },
  { id: 'card', label: '3:4' },
  { id: 'square', label: '1:1' },
  { id: 'portrait', label: '4:5' },
  { id: 'landscape', label: '16:9' },
];

/** Rotate and centre-crop. Applied to the actual image pixels. */
export function CropSheet({
  visible,
  current,
  busy,
  onApply,
  onClose,
}: {
  visible: boolean;
  current: CropSpec;
  busy: boolean;
  onApply: (spec: CropSpec) => void;
  onClose: () => void;
}) {
  const [spec, setSpec] = useState(current);
  // Start from what's applied each time the sheet opens.
  const [openedWith, setOpenedWith] = useState(current);
  if (visible && openedWith !== current) {
    setOpenedWith(current);
    setSpec(current);
  }
  const changed = spec.aspect !== current.aspect || spec.rotation !== current.rotation;

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Crop and rotate">
      <SheetHeader title="Crop" />
      <View style={styles.row}>
        {ASPECTS.map((a) => (
          <Chip key={a.id} label={a.label} selected={spec.aspect === a.id} onPress={() => setSpec({ ...spec, aspect: a.id })} style={styles.flex} />
        ))}
      </View>
      <Pressable
        onPress={() => setSpec({ ...spec, rotation: ((spec.rotation + 90) % 360) as CropSpec['rotation'] })}
        accessibilityRole="button"
        accessibilityLabel={`Rotate 90 degrees, now ${spec.rotation} degrees`}
        style={({ pressed }) => [styles.rotate, pressed && { opacity: 0.6 }]}
      >
        <RotateCw size={18} color={colors.text} strokeWidth={ICON_STROKE} />
        <Text style={styles.rotateText}>Rotate{spec.rotation ? ` (${spec.rotation}°)` : ''}</Text>
      </Pressable>
      <View style={styles.actions}>
        <TextButton label="Reset" onPress={() => setSpec({ aspect: 'original', rotation: 0 })} />
        <View style={styles.flex}>
          <PrimaryButton label={busy ? 'Applying…' : 'Apply'} onPress={() => onApply(spec)} disabled={busy || !changed} />
        </View>
      </View>
    </BottomSheet>
  );
}

const TEXT_COLORS = [colors.white, colors.text, colors.orange, colors.peach, colors.yellow];
const TEXT_SIZES: { label: string; size: number }[] = [
  { label: 'S', size: 0.055 },
  { label: 'M', size: 0.08 },
  { label: 'L', size: 0.11 },
];

/** Adds a text overlay, or edits the selected one. */
export function TextSheet({
  visible,
  editing,
  onSave,
  onClose,
}: {
  visible: boolean;
  editing: Overlay | null;
  onSave: (value: { content: string; color: string; size: number }) => void;
  onClose: () => void;
}) {
  const [content, setContent] = useState('');
  const [color, setColor] = useState<string>(colors.white);
  const [size, setSize] = useState(TEXT_SIZES[1].size);
  const [openedFor, setOpenedFor] = useState<Overlay | null | undefined>(undefined);
  if (visible && openedFor !== editing) {
    setOpenedFor(editing);
    setContent(editing?.content ?? '');
    setColor(editing?.color ?? colors.white);
    setSize(editing?.size ?? TEXT_SIZES[1].size);
  }
  if (!visible && openedFor !== undefined) setOpenedFor(undefined);

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel={editing ? 'Edit text' : 'Add text'}>
      <SheetHeader title={editing ? 'Edit text' : 'Add text'} />
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="Type something"
        placeholderTextColor={colors.textFaint}
        maxLength={60}
        autoFocus
        style={styles.input}
        accessibilityLabel="Text to add"
        selectionColor={colors.orange}
      />
      <Text style={styles.label}>Colour</Text>
      <View style={styles.row} accessibilityRole="radiogroup">
        {TEXT_COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            accessibilityRole="radio"
            accessibilityLabel={c}
            aria-checked={color === c}
            style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchOn]}
          />
        ))}
      </View>
      <Text style={styles.label}>Size</Text>
      <View style={styles.row}>
        {TEXT_SIZES.map((s) => (
          <Chip key={s.label} label={s.label} selected={size === s.size} onPress={() => setSize(s.size)} style={styles.flex} />
        ))}
      </View>
      <View style={styles.actions}>
        <View style={styles.flex}>
          <PrimaryButton
            label={editing ? 'Save' : 'Add'}
            onPress={() => onSave({ content: content.trim(), color, size })}
            disabled={!content.trim()}
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const STICKERS = ['🎁', '🧡', '✨', '🎉', '🌸', '☕️', '🍕', '📚', '🎧', '🧁', '🌈', '⭐️', '🙏', '😊', '🥳', '💛', '🍀', '🎈', '🛍️', '🍜', '🎂', '💐', '🌞', '🐾'];

export function StickerSheet({
  visible,
  onPick,
  onClose,
}: {
  visible: boolean;
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Stickers">
      <SheetHeader title="Stickers" />
      <View style={styles.stickers}>
        {STICKERS.map((s) => (
          <Pressable
            key={s}
            onPress={() => onPick(s)}
            accessibilityRole="button"
            accessibilityLabel={`Add ${s}`}
            style={({ pressed }) => [styles.sticker, pressed && { transform: [{ scale: 0.9 }] }]}
          >
            <Text style={styles.stickerText}>{s}</Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}

/** Live filter previews on the photo itself. */
export function FilterSheet({
  visible,
  photo,
  current,
  onPick,
  onClose,
}: {
  visible: boolean;
  photo: Photo | null;
  current: FilterId;
  onPick: (filter: FilterId) => void;
  onClose: () => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Filters">
      <SheetHeader title="Filters" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {photo
          ? FILTERS.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => onPick(f.id)}
                accessibilityRole="radio"
                accessibilityLabel={`${f.label} filter`}
                aria-checked={current === f.id}
                style={styles.filter}
              >
                <PhotoStage
                  photo={photo}
                  filter={f.id}
                  overlays={[]}
                  fit="cover"
                  style={[styles.thumb, current === f.id && styles.thumbOn]}
                />
                <Text style={[styles.filterLabel, current === f.id && styles.filterLabelOn]}>{f.label}</Text>
              </Pressable>
            ))
          : null}
      </ScrollView>
      <View style={styles.actions}>
        <View style={styles.flex}>
          <PrimaryButton label="Done" onPress={onClose} />
        </View>
      </View>
    </BottomSheet>
  );
}

function SheetHeader({ title }: { title: string }) {
  return (
    <Text style={styles.title} accessibilityRole="header">
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontFamily: fonts.display, color: colors.text, marginBottom: 14 },
  label: { marginTop: 16, marginBottom: 8, fontSize: 13.5, fontFamily: fonts.semibold, color: colors.text },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  rotate: {
    marginTop: 12,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  rotateText: { fontSize: 14.5, fontFamily: fonts.medium, color: colors.text },
  input: {
    height: 50,
    paddingHorizontal: 16,
    borderRadius: radius.field,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: colors.borderStrong },
  swatchOn: { borderWidth: 3, borderColor: colors.orange },
  stickers: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  sticker: { width: '15%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.background },
  stickerText: { fontSize: 28 },
  filters: { gap: 10, paddingVertical: 2 },
  filter: { alignItems: 'center', gap: 6 },
  thumb: { width: 72, height: 90, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', backgroundColor: colors.orangeSoft },
  thumbOn: { borderColor: colors.orange },
  filterLabel: { fontSize: 12.5, fontFamily: fonts.medium, color: colors.textMuted },
  filterLabelOn: { fontFamily: fonts.bold, color: colors.text },
});
