import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ArrowRight,
  ChevronLeft,
  Crop,
  Images,
  type LucideIcon,
  Palette,
  SmilePlus,
  SwitchCamera,
  Type,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Linking, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '../../components/BottomSheet';
import { CropSheet, FilterSheet, StickerSheet, TextSheet } from '../../components/post/EditSheets';
import { PhotoStage } from '../../components/post/PhotoStage';
import { PrimaryButton, TextButton } from '../../components/ui';
import { CARD_RATIO, renderCrop } from '../../post/photo';
import { hasTypedDetails, usePostDraft } from '../../post/PostDraftContext';
import type { CropSpec, Photo } from '../../post/types';
import { colors, fonts, ICON_STROKE, radius } from '../../theme';

type Sheet = 'crop' | 'text' | 'stickers' | 'filters' | null;

/** Space kept clear above the viewfinder (back button) and below it (shutter row). */
const FRAME_TOP = 66;
const FRAME_BOTTOM = 124;

/** A 3:4 viewfinder the shape of a wish card, as large as fits between the controls. */
function useCardFrame() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const top = insets.top + FRAME_TOP;
  const available = height - top - insets.bottom - FRAME_BOTTOM;
  const w = Math.min(width - 24, available * CARD_RATIO);
  const h = w / CARD_RATIO;
  return { left: (width - w) / 2, top: top + Math.max(0, (available - h) / 2), width: w, height: h };
}

let overlaySeq = 0;
const nextOverlayId = () => `ov${++overlaySeq}`;

/**
 * Step 1: live camera, then the frozen photo with an editing toolbar.
 * The draft lives in PostDraftProvider, so Back never loses typed details.
 */
export function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const frame = useCardFrame();
  const { draft, setSource, clearPhoto, setPhoto, setFilter, addOverlay, updateOverlay, removeOverlay, reset } =
    usePostDraft();
  const photo = draft.photo;
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);

  const selected = draft.edits.overlays.find((o) => o.id === selectedId) ?? null;

  const exit = useCallback(() => {
    reset();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [reset]);

  const goBack = useCallback(() => {
    if (sheet) return setSheet(null);
    if (photo) {
      // Back from the frozen photo returns to the camera to retake it.
      setSelectedId(null);
      clearPhoto();
      return;
    }
    if (hasTypedDetails(draft.details)) setConfirmExit(true);
    else exit();
  }, [sheet, photo, draft.details, clearPhoto, exit]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [goBack]);

  const acceptPhoto = (p: Photo) => {
    setSelectedId(null);
    setNotice(null);
    setSource(p);
  };

  const takePhoto = async () => {
    if (!camera.current || !cameraReady || busy) return;
    setBusy(true);
    try {
      const shot = await camera.current.takePictureAsync({ quality: 0.85 });
      if (shot) {
        // Keep exactly what the 3:4 viewfinder showed: the centre of the sensor image.
        let taken: Photo = { uri: shot.uri, width: shot.width, height: shot.height };
        if (Math.abs(taken.width / taken.height - CARD_RATIO) > 0.01) {
          taken = await renderCrop(taken, { aspect: 'card', rotation: 0 });
        }
        acceptPhoto(taken);
      }
    } catch {
      setNotice("Couldn't take the photo. Try again, or choose one from your album.");
    } finally {
      setBusy(false);
    }
  };

  const pickPhoto = async () => {
    // The system photo picker needs no library permission on iOS 14+ or Android.
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    const asset = result.canceled ? null : result.assets[0];
    if (asset) acceptPhoto({ uri: asset.uri, width: asset.width, height: asset.height });
  };

  const applyCrop = async (spec: CropSpec) => {
    if (!draft.source) return;
    setBusy(true);
    try {
      setPhoto(await renderCrop(draft.source, spec), spec);
      setSheet(null);
    } catch {
      setNotice("Couldn't crop this photo.");
    } finally {
      setBusy(false);
    }
  };

  const tools: { key: Exclude<Sheet, null>; label: string; Icon: LucideIcon }[] = [
    { key: 'crop', label: 'Crop', Icon: Crop },
    { key: 'text', label: 'Text', Icon: Type },
    { key: 'stickers', label: 'Stickers', Icon: SmilePlus },
    { key: 'filters', label: 'Filters', Icon: Palette },
  ];

  const showCamera = !photo && permission?.granted;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {photo ? (
        <PhotoStage
          photo={photo}
          filter={draft.edits.filter}
          overlays={draft.edits.overlays}
          fit="contain"
          style={[StyleSheet.absoluteFill, { top: insets.top + 60, bottom: insets.bottom + 92 }]}
          accessibilityLabel="Your photo"
          editing={{
            selectedId,
            onSelect: setSelectedId,
            onMove: (id, x, y) => updateOverlay(id, { x, y }),
          }}
        />
      ) : showCamera ? (
        <View style={[styles.viewfinder, frame]}>
          <CameraView
            ref={camera}
            style={StyleSheet.absoluteFill}
            facing={facing}
            mirror={facing === 'front'}
            onCameraReady={() => setCameraReady(true)}
            onMountError={(e) => setCameraError(e.message)}
          />
        </View>
      ) : null}

      {!photo && !showCamera ? (
        <View style={[styles.center, { paddingTop: insets.top }]}>
          {permission === null ? null : (
            <CameraPermissionCard
              canAsk={permission.canAskAgain}
              onAllow={requestPermission}
            />
          )}
        </View>
      ) : null}
      {!photo && showCamera && cameraError ? (
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.cameraNote}>The camera isn&apos;t available here. Choose a photo from your album instead.</Text>
        </View>
      ) : null}

      <Pressable
        onPress={goBack}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={photo ? 'Back to camera' : 'Close'}
        style={({ pressed }) => [styles.back, { top: insets.top + 10 }, pressed && styles.pressed]}
      >
        <ChevronLeft size={24} color={colors.white} strokeWidth={2} />
      </Pressable>

      {notice ? (
        <View style={[styles.notice, { top: insets.top + 62 }]} accessibilityLiveRegion="polite">
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}

      {photo ? (
        <>
          <View style={[styles.toolbar, { top: insets.top + 70 }]} accessibilityRole="toolbar">
            {tools.map(({ key, label, Icon }) => (
              <Pressable
                key={key}
                onPress={() => {
                  setSelectedId(null);
                  setEditingText(null);
                  setSheet(key);
                }}
                accessibilityRole="button"
                accessibilityLabel={label}
                style={({ pressed }) => [styles.tool, pressed && styles.pressed]}
              >
                <View style={styles.toolIcon}>
                  <Icon size={21} color={colors.white} strokeWidth={ICON_STROKE + 0.25} />
                </View>
                <Text style={styles.toolLabel}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.editorBar, { paddingBottom: insets.bottom + 18 }]}>
            <View style={styles.selection}>
              {selected ? (
                <>
                  {selected.kind === 'text' ? (
                    <Pill
                      label="Edit"
                      onPress={() => {
                        setEditingText(selected.id);
                        setSheet('text');
                      }}
                    />
                  ) : null}
                  <Pill
                    label="Remove"
                    onPress={() => {
                      removeOverlay(selected.id);
                      setSelectedId(null);
                    }}
                  />
                </>
              ) : (
                <Text style={styles.hint}>Editing is optional</Text>
              )}
            </View>
            <Pressable
              onPress={() => {
                setSelectedId(null);
                router.push('/post/details');
              }}
              accessibilityRole="button"
              accessibilityLabel="Next"
              style={({ pressed }) => [styles.next, pressed && styles.pressed]}
            >
              <ArrowRight size={26} color={colors.text} strokeWidth={2.2} />
            </Pressable>
          </View>
        </>
      ) : (
        <View style={[styles.cameraBar, { paddingBottom: insets.bottom + 22 }]}>
          <Pressable
            onPress={pickPhoto}
            accessibilityRole="button"
            accessibilityLabel="Choose from album"
            style={({ pressed }) => [styles.side, pressed && styles.pressed]}
          >
            <Images size={24} color={colors.white} strokeWidth={ICON_STROKE + 0.25} />
          </Pressable>
          <Pressable
            onPress={takePhoto}
            disabled={!cameraReady || busy}
            accessibilityRole="button"
            accessibilityLabel="Take photo"
            accessibilityState={{ disabled: !cameraReady || busy }}
            style={({ pressed }) => [styles.shutter, (!cameraReady || busy) && styles.shutterOff, pressed && styles.pressed]}
          >
            <View style={styles.shutterInner} />
          </Pressable>
          {showCamera ? (
            <Pressable
              onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
              accessibilityRole="button"
              accessibilityLabel="Switch camera"
              style={({ pressed }) => [styles.side, pressed && styles.pressed]}
            >
              <SwitchCamera size={24} color={colors.white} strokeWidth={ICON_STROKE + 0.25} />
            </Pressable>
          ) : (
            <View style={styles.side} />
          )}
        </View>
      )}

      <CropSheet visible={sheet === 'crop'} current={draft.edits.crop} busy={busy} onApply={applyCrop} onClose={() => setSheet(null)} />
      <TextSheet
        visible={sheet === 'text'}
        editing={draft.edits.overlays.find((o) => o.id === editingText) ?? null}
        onClose={() => setSheet(null)}
        onSave={({ content, color, size }) => {
          if (editingText) updateOverlay(editingText, { content, color, size });
          else {
            const id = nextOverlayId();
            addOverlay({ id, kind: 'text', content, color, size, x: 0.5, y: 0.5 });
            setSelectedId(id);
          }
          setSheet(null);
        }}
      />
      <StickerSheet
        visible={sheet === 'stickers'}
        onClose={() => setSheet(null)}
        onPick={(emoji) => {
          const id = nextOverlayId();
          addOverlay({ id, kind: 'sticker', content: emoji, color: colors.text, size: 0.14, x: 0.5, y: 0.42 });
          setSelectedId(id);
          setSheet(null);
        }}
      />
      <FilterSheet visible={sheet === 'filters'} photo={photo} current={draft.edits.filter} onPick={setFilter} onClose={() => setSheet(null)} />

      <BottomSheet visible={confirmExit} onClose={() => setConfirmExit(false)} accessibilityLabel="Discard post">
        <Text style={styles.confirmTitle}>Discard this post?</Text>
        <Text style={styles.confirmBody}>The details you&apos;ve typed will be lost.</Text>
        <View style={styles.confirmActions}>
          <TextButton label="Keep editing" onPress={() => setConfirmExit(false)} />
          <View style={styles.flex}>
            <PrimaryButton label="Discard" onPress={exit} />
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

function CameraPermissionCard({ canAsk, onAllow }: { canAsk: boolean; onAllow: () => void }) {
  return (
    <View style={styles.permission}>
      <Text style={styles.permissionTitle}>Take a photo of your wish</Text>
      <Text style={styles.permissionBody}>
        {canAsk
          ? 'poki needs your camera to take a photo. You can also choose one from your album below.'
          : 'Camera access is turned off for poki. Turn it on in Settings, or choose a photo from your album below.'}
      </Text>
      <View style={styles.permissionAction}>
        {canAsk ? (
          <PrimaryButton label="Allow camera" onPress={onAllow} />
        ) : Platform.OS !== 'web' ? (
          <PrimaryButton label="Open Settings" onPress={() => Linking.openSettings()} />
        ) : null}
      </View>
    </View>
  );
}

function Pill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.pill, pressed && styles.pressed]}>
      <Text style={styles.pillText}>{label}</Text>
    </Pressable>
  );
}

const DARK = 'rgba(20, 14, 10, 0.42)';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#14100D' },
  viewfinder: { position: 'absolute', overflow: 'hidden', borderRadius: radius.card, backgroundColor: '#000' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 28 },
  cameraNote: { color: colors.white, fontSize: 15, fontFamily: fonts.medium, textAlign: 'center', opacity: 0.85 },
  pressed: { transform: [{ scale: 0.94 }] },
  flex: { flex: 1 },
  back: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DARK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: { position: 'absolute', left: 20, right: 20, padding: 12, borderRadius: radius.field, backgroundColor: colors.errorSoft },
  noticeText: { fontSize: 14, fontFamily: fonts.medium, color: colors.text, textAlign: 'center' },
  cameraBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 18,
    paddingHorizontal: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: { width: 52, height: 52, borderRadius: 16, backgroundColor: DARK, alignItems: 'center', justifyContent: 'center' },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOff: { opacity: 0.45 },
  shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.white },
  toolbar: { position: 'absolute', right: 14, gap: 14, alignItems: 'center' },
  tool: { alignItems: 'center', gap: 4 },
  toolIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: DARK, alignItems: 'center', justifyContent: 'center' },
  toolLabel: { fontSize: 11, fontFamily: fonts.semibold, color: colors.white },
  editorBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selection: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  hint: { fontSize: 13, fontFamily: fonts.medium, color: 'rgba(255,255,255,0.7)' },
  pill: { height: 38, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: DARK, justifyContent: 'center' },
  pillText: { fontSize: 14, fontFamily: fonts.semibold, color: colors.white },
  next: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 6px 16px rgba(234, 166, 71, 0.4)',
  },
  permission: { maxWidth: 340, padding: 24, borderRadius: radius.card, backgroundColor: colors.card, alignItems: 'center' },
  permissionTitle: { fontSize: 20, fontFamily: fonts.display, color: colors.text, textAlign: 'center' },
  permissionBody: { marginTop: 8, fontSize: 14.5, lineHeight: 21, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
  permissionAction: { marginTop: 18, alignSelf: 'stretch' },
  confirmTitle: { fontSize: 20, fontFamily: fonts.display, color: colors.text },
  confirmBody: { marginTop: 6, fontSize: 14.5, fontFamily: fonts.regular, color: colors.textMuted },
  confirmActions: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
});
