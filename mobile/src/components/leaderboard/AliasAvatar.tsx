import {
  Bird,
  Cherry,
  Cloud,
  Coffee,
  Cookie,
  Feather,
  Flower2,
  Gift,
  Heart,
  Leaf,
  type LucideIcon,
  Moon,
  Music,
  Sparkles,
  Sprout,
  Star,
  Sun,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ICON_STROKE } from '../../theme';
import type { AliasAvatarSpec, AvatarIcon } from '../../types';
import { Avatar } from '../Avatar';

const ICONS: Record<AvatarIcon, LucideIcon> = {
  sun: Sun,
  moon: Moon,
  star: Star,
  leaf: Leaf,
  flower: Flower2,
  coffee: Coffee,
  heart: Heart,
  cloud: Cloud,
  sparkles: Sparkles,
  gift: Gift,
  feather: Feather,
  cherry: Cherry,
  bird: Bird,
  sprout: Sprout,
  music: Music,
  cookie: Cookie,
};

/** An anonymous member's avatar: an illustration, or the photo they chose. */
export function AliasAvatar({ avatar, size }: { avatar: AliasAvatarSpec; size: number }) {
  if (avatar.kind === 'photo') return <Avatar uri={avatar.uri} size={size} />;
  const Icon = ICONS[avatar.icon];
  return (
    <View
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: avatar.background }]}
    >
      <Icon size={size * 0.46} color={avatar.foreground} strokeWidth={ICON_STROKE} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    outlineColor: 'rgba(53, 37, 29, 0.06)',
    outlineWidth: 1,
    outlineOffset: -1,
  },
});
