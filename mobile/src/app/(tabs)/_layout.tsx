import { Tabs } from 'expo-router';

import { colors } from '../../theme';

// Each screen renders BottomNavigation itself so its bottom sheets can cover the nav.
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="friends" />
      <Tabs.Screen name="ranks" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
