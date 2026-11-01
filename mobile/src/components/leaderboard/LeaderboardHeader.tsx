import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { colors } from '../../theme';

const GOLD = '#E9B949';
const GOLD_DEEP = '#C9922B';

/** Leaves along one side of the wreath, as [x, y, angle] in a 120×88 box. */
const LEAVES: [number, number, number][] = [
  [36, 74, -70],
  [27, 64, -50],
  [21, 52, -32],
  [19, 39, -14],
  [21, 26, 6],
  [27, 15, 26],
];

function Laurel({ flip }: { flip?: boolean }) {
  return (
    <G transform={flip ? 'translate(120 0) scale(-1 1)' : undefined}>
      <Path d="M40 80 C 22 66, 14 40, 26 12" stroke={GOLD_DEEP} strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.75} />
      {LEAVES.map(([x, y, a]) => (
        <Ellipse key={`${x}-${y}`} cx={x} cy={y} rx={4.2} ry={8} fill={GOLD} opacity={0.85} transform={`rotate(${a} ${x} ${y})`} />
      ))}
    </G>
  );
}

/** Golden trophy in a light laurel wreath, then the title. */
export function LeaderboardHeader() {
  return (
    <View style={styles.wrap}>
      <Svg width={120} height={88} viewBox="0 0 120 88" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Defs>
          <LinearGradient id="cup" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FBD879" />
            <Stop offset="1" stopColor="#E3A33A" />
          </LinearGradient>
        </Defs>
        <Laurel />
        <Laurel flip />
        {/* Handles */}
        <Path d="M44 22 C 32 22, 32 40, 47 42" stroke={GOLD_DEEP} strokeWidth={3.2} fill="none" strokeLinecap="round" />
        <Path d="M76 22 C 88 22, 88 40, 73 42" stroke={GOLD_DEEP} strokeWidth={3.2} fill="none" strokeLinecap="round" />
        {/* Cup, stem and base */}
        <Path d="M43 16 H77 C77 38, 70 50, 60 52 C50 50, 43 38, 43 16 Z" fill="url(#cup)" stroke={GOLD_DEEP} strokeWidth={1.6} />
        <Path d="M50 21 C50 32, 53 40, 57 44" stroke="#FFF3D0" strokeWidth={2.4} fill="none" strokeLinecap="round" opacity={0.8} />
        <Rect x={56} y={52} width={8} height={10} fill={GOLD_DEEP} />
        <Rect x={47} y={62} width={26} height={8} rx={3} fill="url(#cup)" stroke={GOLD_DEEP} strokeWidth={1.4} />
      </Svg>
      <Text style={styles.title} accessibilityRole="header">
        Leaderboard
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  title: { marginTop: 2, fontSize: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.8 },
});
