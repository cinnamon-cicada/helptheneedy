import { Bookmark, FileText, Gift, Inbox, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ProfileShortcutCard } from './ProfileShortcutCard';

export type ProfileSection = 'gifts-sent' | 'gifts-received' | 'saved-requests' | 'my-posts';

const SHORTCUTS: { section: ProfileSection; title: string; Icon: LucideIcon }[][] = [
  [
    { section: 'gifts-sent', title: 'Gifts Sent', Icon: Gift },
    { section: 'gifts-received', title: 'Gifts Received', Icon: Inbox },
  ],
  [
    { section: 'saved-requests', title: 'Saved Requests', Icon: Bookmark },
    { section: 'my-posts', title: 'My Posts', Icon: FileText },
  ],
];

export function ProfileShortcutGrid({ onOpen }: { onOpen: (section: ProfileSection) => void }) {
  return (
    <View style={styles.grid}>
      {SHORTCUTS.map((row) => (
        <View key={row[0].section} style={styles.row}>
          {row.map(({ section, title, Icon }) => (
            <ProfileShortcutCard key={section} title={title} Icon={Icon} onPress={() => onOpen(section)} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
});
