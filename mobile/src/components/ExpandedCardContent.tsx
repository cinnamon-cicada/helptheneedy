import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../theme';
import type { GiftRequest } from '../types';
import { CommentInput, type TextInputHandle } from './CommentInput';
import { CommentList } from './CommentList';
import { RichText } from './post/RichText';
import { ReactionBar } from './ReactionBar';

type Props = {
  request: GiftRequest;
  heartOn: boolean;
  sparkleOn: boolean;
  onToggleHeart: () => void;
  onToggleSparkle: () => void;
  onToggleCommentLike: (commentId: string) => void;
  onAddComment: (text: string) => void;
};

/** The details that slide out of the card when it is dragged down. */
export function ExpandedCardContent({
  request,
  heartOn,
  sparkleOn,
  onToggleHeart,
  onToggleSparkle,
  onToggleCommentLike,
  onAddComment,
}: Props) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<TextInputHandle>(null);

  const submit = () => {
    if (!draft.trim()) return;
    onAddComment(draft);
    setDraft('');
  };

  const reply = (username: string) => {
    setDraft(`@${username} `);
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <RichText text={request.description} style={styles.description} />

        <View style={styles.reactions}>
          <ReactionBar
            reactions={request.reactions}
            commentCount={request.comments.length}
            heartOn={heartOn}
            sparkleOn={sparkleOn}
            onToggleHeart={onToggleHeart}
            onToggleSparkle={onToggleSparkle}
          />
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>
          {request.comments.length} {request.comments.length === 1 ? 'comment' : 'comments'}
        </Text>

        <CommentList comments={request.comments} onToggleLike={onToggleCommentLike} onReply={reply} />
      </ScrollView>

      <View style={styles.inputWrap}>
        <CommentInput value={draft} onChangeText={setDraft} onSubmit={submit} inputRef={inputRef} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 18 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 4 },
  description: {
    fontSize: 14.5, fontFamily: fonts.regular,
    lineHeight: 21,
    color: colors.textMuted,
  },
  reactions: { marginTop: 14 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderStrong,
    marginTop: 12,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12.5,
    fontFamily: fonts.semibold,
    color: colors.textMuted,
    marginBottom: 10,
  },
  inputWrap: {
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
