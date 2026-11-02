import { Stack } from 'expo-router';

import { PostDraftProvider } from '../../post/PostDraftContext';

/** The create-post flow shares one draft, so going back keeps what was entered. */
export default function PostLayout() {
  return (
    <PostDraftProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="details" />
        <Stack.Screen name="published" options={{ gestureEnabled: false, animation: 'fade' }} />
      </Stack>
    </PostDraftProvider>
  );
}
