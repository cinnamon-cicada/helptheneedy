import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { GestureDetector, useExclusiveGestures, usePanGesture, useTapGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { filterLayers, fitRect } from '../../post/photo';
import type { FilterId, Overlay, Photo } from '../../post/types';
import { fonts } from '../../theme';

type Rect = { x: number; y: number; width: number; height: number };

export type OverlayEditing = {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
};

type Props = {
  photo: Photo;
  filter: FilterId;
  overlays: Overlay[];
  fit: 'contain' | 'cover';
  style?: StyleProp<ViewStyle>;
  /** Makes overlays draggable and selectable (the editor). */
  editing?: OverlayEditing;
  accessibilityLabel?: string;
};

/**
 * Draws a post photo with its filter and overlays. Edits are data, so the
 * same photo looks the same at any size, centre-cropped (cover) or whole
 * (contain).
 */
export function PhotoStage({ photo, filter, overlays, fit, style, editing, accessibilityLabel }: Props) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const rect = box.width > 0 ? fitRect(box.width, box.height, photo.width, photo.height, fit) : null;

  return (
    <View
      style={[styles.stage, style]}
      onLayout={(e: LayoutChangeEvent) => setBox(e.nativeEvent.layout)}
      accessible={!editing}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {editing ? (
        // Tapping the photo itself clears the selection.
        <Pressable style={StyleSheet.absoluteFill} onPress={() => editing.onSelect(null)} accessible={false} />
      ) : null}
      {rect ? (
        <View style={[styles.photo, { left: rect.x, top: rect.y, width: rect.width, height: rect.height }]} pointerEvents="box-none">
          <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="fill" pointerEvents="none" />
          {filterLayers(filter).map((layer, i) => (
            <View
              key={i}
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: layer.color, opacity: layer.opacity, mixBlendMode: layer.blend }]}
            />
          ))}
          {overlays.map((o) =>
            editing ? (
              <DraggableOverlay key={o.id} overlay={o} rect={rect} editing={editing} />
            ) : (
              <PlacedOverlay key={o.id} overlay={o} rect={rect} />
            ),
          )}
        </View>
      ) : null}
    </View>
  );
}

function OverlayContent({ overlay, rect }: { overlay: Overlay; rect: Rect }) {
  const fontSize = Math.max(8, overlay.size * rect.width);
  return (
    <Text
      style={[
        overlay.kind === 'text' ? styles.text : styles.sticker,
        { fontSize, lineHeight: fontSize * 1.2, color: overlay.color, maxWidth: rect.width * 0.92 },
      ]}
    >
      {overlay.content}
    </Text>
  );
}

/** Measures itself so (x, y) is the overlay's centre. */
function useCentered() {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || Math.abs(size.w - width) > 0.5 || Math.abs(size.h - height) > 0.5) setSize({ w: width, h: height });
  };
  return { size, onLayout };
}

function PlacedOverlay({ overlay, rect }: { overlay: Overlay; rect: Rect }) {
  const { size, onLayout } = useCentered();
  return (
    <View
      pointerEvents="none"
      onLayout={onLayout}
      style={[
        styles.overlay,
        {
          left: overlay.x * rect.width - (size?.w ?? 0) / 2,
          top: overlay.y * rect.height - (size?.h ?? 0) / 2,
          opacity: size ? 1 : 0,
        },
      ]}
    >
      <OverlayContent overlay={overlay} rect={rect} />
    </View>
  );
}

function DraggableOverlay({ overlay, rect, editing }: { overlay: Overlay; rect: Rect; editing: OverlayEditing }) {
  const { size, onLayout } = useCentered();
  const selected = editing.selectedId === overlay.id;
  // Position lives on the UI thread while dragging, so moves never stutter.
  const cx = useSharedValue(overlay.x * rect.width);
  const cy = useSharedValue(overlay.y * rect.height);
  const w = useSharedValue(0);
  const h = useSharedValue(0);

  useEffect(() => {
    cx.set(overlay.x * rect.width);
    cy.set(overlay.y * rect.height);
  }, [overlay.x, overlay.y, rect.width, rect.height, cx, cy]);

  useEffect(() => {
    if (size) {
      w.set(size.w);
      h.set(size.h);
    }
  }, [size, w, h]);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const { onMove, onSelect } = editing;
  const id = overlay.id;
  const width = rect.width;
  const height = rect.height;

  const pan = usePanGesture({
    minDistance: 4,
    onActivate: () => {
      'worklet';
      startX.set(cx.value);
      startY.set(cy.value);
      scheduleOnRN(onSelect, id);
    },
    onUpdate: (e) => {
      'worklet';
      // Keep the centre on the photo.
      cx.set(Math.min(width, Math.max(0, startX.value + e.translationX)));
      cy.set(Math.min(height, Math.max(0, startY.value + e.translationY)));
    },
    onDeactivate: () => {
      'worklet';
      scheduleOnRN(onMove, id, cx.value / width, cy.value / height);
    },
  });
  const tap = useTapGesture({
    onActivate: () => {
      'worklet';
      scheduleOnRN(onSelect, id);
    },
  });
  const gesture = useExclusiveGestures(pan, tap);

  const placed = useAnimatedStyle(() => ({
    left: cx.value - w.value / 2,
    top: cy.value - h.value / 2,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        onLayout={onLayout}
        style={[styles.overlay, styles.handle, selected && styles.selected, { opacity: size ? 1 : 0 }, placed]}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${overlay.kind === 'text' ? 'Text' : 'Sticker'}: ${overlay.content}. Drag to move, tap to select.`}
        accessibilityState={{ selected }}
      >
        <OverlayContent overlay={overlay} rect={rect} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  stage: { overflow: 'hidden' },
  photo: { position: 'absolute', overflow: 'hidden' },
  overlay: { position: 'absolute' },
  handle: { padding: 6, borderRadius: 10, borderWidth: 1.5, borderColor: 'transparent' },
  selected: { borderColor: 'rgba(255,255,255,0.9)', borderStyle: 'dashed' },
  text: {
    fontFamily: fonts.bold,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  sticker: { textAlign: 'center' },
});
