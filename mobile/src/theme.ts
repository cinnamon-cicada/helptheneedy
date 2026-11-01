export const colors = {
  background: '#FFFAF4',
  card: '#FFFDF9',
  orange: '#EAA647',
  // Slightly deeper shade of the primary orange, used only where orange text
  // needs to stay readable on cream (amounts).
  orangeText: '#C9852B',
  yellow: '#F5C85C',
  peach: '#F29B65',
  text: '#35251D',
  textMuted: '#8C7B70',
  // Muted text dark enough to stay readable on the Profile gradient.
  textOnPeach: '#6F5C50',
  textFaint: '#B5A69B',
  border: '#F1E6D8',
  borderStrong: '#E8D8C4',
  orangeSoft: '#FDF0DC',
  peachSoft: '#FCE6D8',
  skip: '#E5566B',
  skipSoft: '#FDE8EC',
  // Rear deck layers.
  layerPeach: '#F9D3B6',
  layerYellow: '#FAE3B0',
  // Profile gradient, top to bottom; it fades into background.
  profileGradientTop: '#FBD9BD',
  profileGradientMid: '#FCE7D4',
  rankCard: '#FDEDD6',
  rankCardBorder: '#F3CE97',
  scrim: 'rgba(53, 37, 29, 0.38)',
} as const;

export const radius = {
  card: 24,
  sheet: 28,
  pill: 999,
  input: 22,
} as const;

export const shadow = {
  card: '0px 14px 32px rgba(138, 90, 43, 0.14), 0px 2px 6px rgba(138, 90, 43, 0.06)',
  layer: '0px 10px 24px rgba(138, 90, 43, 0.10)',
  nav: '0px 8px 28px rgba(138, 90, 43, 0.12)',
  sheet: '0px -8px 32px rgba(53, 37, 29, 0.12)',
} as const;

export const spring = {
  // Card returning to rest or settling after a gesture.
  settle: { damping: 18, stiffness: 180, mass: 0.9 },
  // Expanding and collapsing the card.
  expand: { damping: 22, stiffness: 190, mass: 1 },
  // Bottom sheets.
  sheet: { damping: 24, stiffness: 240, mass: 0.9 },
} as const;

export const ICON_STROKE = 1.75;
