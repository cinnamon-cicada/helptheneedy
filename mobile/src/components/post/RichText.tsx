import { StyleSheet, Text, type TextStyle } from 'react-native';

import { colors, fonts } from '../../theme';

/** Text with #tags and @mentions highlighted. */
export function RichText({ text, style }: { text: string; style?: TextStyle }) {
  const parts = text.split(/((?:^|\s)[#@][\p{L}\p{N}_]+)/u);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={styles.token}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  token: { fontFamily: fonts.semibold, color: colors.orangeText },
});
