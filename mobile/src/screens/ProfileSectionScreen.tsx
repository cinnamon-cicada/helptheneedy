import { useLocalSearchParams } from 'expo-router';

import type { ProfileSection } from '../components/ProfileShortcutGrid';
import { PlaceholderCard, SubScreen } from '../components/SubScreen';

const SECTIONS: Record<ProfileSection, { title: string; body: string }> = {
  'gifts-sent': { title: 'Gifts Sent', body: 'Your gifting history will appear here.' },
  'gifts-received': { title: 'Gifts Received', body: 'Gifts you receive will appear here.' },
  'saved-requests': { title: 'Saved Requests', body: 'Requests you bookmark will appear here.' },
  'my-posts': { title: 'My Posts', body: 'Requests you create will appear here.' },
};

export function ProfileSectionScreen() {
  const { section } = useLocalSearchParams<{ section: ProfileSection }>();
  const { title, body } = SECTIONS[section] ?? SECTIONS['gifts-sent'];

  return (
    <SubScreen title={title}>
      <PlaceholderCard title="Demo placeholder" body={`${body} This prototype uses sample data only.`} />
    </SubScreen>
  );
}
