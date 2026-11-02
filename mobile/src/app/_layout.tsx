import { Onest_400Regular } from '@expo-google-fonts/onest/400Regular';
import { Onest_500Medium } from '@expo-google-fonts/onest/500Medium';
import { Onest_600SemiBold } from '@expo-google-fonts/onest/600SemiBold';
import { Onest_700Bold } from '@expo-google-fonts/onest/700Bold';
import { YoungSerif_400Regular } from '@expo-google-fonts/young-serif/400Regular';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../auth/AuthContext';
import { MyPostsProvider } from '../post/MyPostsContext';
import { colors } from '../theme';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    YoungSerif_400Regular,
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
    Onest_700Bold,
  });

  // If a font fails to load, render anyway with the system font.
  if (!fontsLoaded && !fontError) {
    return <View style={styles.root} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <MyPostsProvider>
            <StatusBar style="dark" />
            <RootStack />
          </MyPostsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Signed-out users only see sign-in; signing in swaps to the app. */
function RootStack() {
  const { user } = useAuth();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: styles.root }}>
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="activity" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="user/[id]" />
        <Stack.Screen name="post" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="sign-in" options={{ contentStyle: styles.auth }} />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  auth: { flex: 1, backgroundColor: colors.white },
});
