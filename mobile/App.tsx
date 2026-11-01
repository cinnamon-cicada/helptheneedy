import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { AuthUser } from './src/auth/types';
import { AuthScreen } from './src/screens/AuthScreen';
import { DiscoverScreen } from './src/screens/DiscoverScreen';
import { colors } from './src/theme';

export default function App() {
  // Session state lives here until navigation is set up.
  const [user, setUser] = useState<AuthUser | null>(null);

  return (
    <GestureHandlerRootView style={[styles.root, !user && styles.authRoot]}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {user ? <DiscoverScreen /> : <AuthScreen onAuthenticated={setUser} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  authRoot: { backgroundColor: colors.white },
});
