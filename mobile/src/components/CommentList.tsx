import { Heart } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, ICON_STROKE } from '../theme';
import type { Comment } from '../types';
import { formatCompact, formatRelative } from '../utils/format';
import { Avatar } from './Avatar';

type Props = {
  comments: Comment[];
  onToggleLike: (commentId: string) => void;
  onReply: (username: string) => void;
};

/** Compact, TikTok-style comment thread in the warm theme. Scrolled by its parent. */
export function CommentList({ comments, onToggleLike, onReply }: Props) {
  return (
    <View style={styles.content}>
      {comments.length === 0 ? (
        <Text style={styles.empty}>No comments yet. Say something kind.</Text>
      ) : (
        comments.map((comment) => (
          <CommentRow
            key={comment.id}
            comment={comment}
            onToggleLike={() => onToggleLike(comment.id)}
            onReply={() => onReply(comment.username)}
          />
        ))
      )}
    </View>
  );
}

function CommentRow({
  comment,
  onToggleLike,
  onReply,
}: {
  comment: Comment;
  onToggleLike: () => void;
  onReply: () => void;
}) {
  const liked = comment.likedByMe;
  return (
    <View style={styles.row}>
      <Avatar uri={comment.avatarUrl} size={32} />
      <View style={styles.body}>
        <Text style={styles.username}>{comment.username}</Text>
        <Text style={styles.text}>{comment.text}</Text>
        <View style={styles.meta}>
          <Text style={styles.time}>{formatRelative(comment.minutesAgo)}</Text>
          <Pressable onPress={onReply} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Reply to ${comment.username}`}>
            <Text style={styles.reply}>Reply</Text>
          </Pressable>
        </View>
      </View>
      <Pressable
        onPress={onToggleLike}
        hitSlop={10}
        style={({ pressed }) => [styles.like, pressed && { transform: [{ scale: 0.92 }] }]}
        accessibilityRole="button"
        accessibilityLabel={liked ? 'Unlike comment' : 'Like comment'}
        accessibilityState={{ selected: liked }}
      >
        <Heart
          size={16}
          strokeWidth={ICON_STROKE}
          color={liked ? colors.peach : colors.textFaint}
          fill={liked ? colors.peach : 'transparent'}
        />
        <Text style={[styles.likeCount, liked && { color: colors.peach }]}>{formatCompact(comment.likes)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 4, paddingBottom: 12, gap: 16 },
  empty: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  body: { flex: 1, gap: 2 },
  username: { fontSize: 12.5, fontWeight: '600', color: colors.textMuted },
  text: { fontSize: 14.5, lineHeight: 20, color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 3 },
  time: { fontSize: 12, color: colors.textFaint },
  reply: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  like: { alignItems: 'center', gap: 2, paddingTop: 4, minWidth: 28 },
  likeCount: { fontSize: 11.5, color: colors.textFaint, fontVariant: ['tabular-nums'] },
});
