import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import { colors } from '../theme';

type Props = { uri: string; size: number; ring?: boolean };

export function Avatar({ uri, size, ring = false }: Props) {
  return (
    <Image
      source={{ uri }}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2 },
        ring && styles.ring,
      ]}
      contentFit="cover"
      transition={150}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.orangeSoft,
    // Subtle inner outline so light photos don't bleed into the card.
    outlineColor: 'rgba(53, 37, 29, 0.08)',
    outlineWidth: 1,
    outlineOffset: -1,
  },
  ring: {
    borderWidth: 2,
    borderColor: colors.card,
  },
});
