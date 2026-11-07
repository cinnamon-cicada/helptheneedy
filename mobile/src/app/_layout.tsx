import { Onest_400Regular } from '@expo-google-fonts/onest/400Regular';
import { Onest_500Medium } from '@expo-google-fonts/onest/500Medium';
import { Onest_600SemiBold } from '@expo-google-fonts/onest/600SemiBold';
import { Onest_700Bold } from '@expo-google-fonts/onest/700Bold';
import { YoungSerif_400Regular } from '@expo-google-fonts/young-serif/400Regular';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../auth/AuthContext';
import { DemoProvider } from '../demo/DemoProvider';
import { MyPostsProvider } from '../post/MyPostsContext';
import { IntroSplash } from '../components/poki/IntroSplash';
import { DemoDisclosure } from '../components/DemoDisclosure';
import { TextButton } from '../components/ui';
import { colors, fonts } from '../theme';

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
          <DemoProvider>
            <MyPostsProvider>
              <StatusBar style="dark" />
              <View style={styles.root}><RootStack /></View>
              <DemoDisclosure />
              <LaunchSplash />
            </MyPostsProvider>
          </DemoProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * The account is created automatically (see AuthProvider), so sign-in never
 * shows: the app waits for the account instead.
 */
function RootStack() {
  const { user, status, retry } = useAuth();
  if (status === 'connecting') return <View style={styles.root} />;
  if (status === 'failed') {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.message}>{"Couldn't connect"}</Text>
        <View style={styles.retry}>
          <TextButton label="Try again" onPress={retry} />
        </View>
      </View>
    );
  }
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

/** The Poki intro on launch; it stays up until the account is set up (or setup fails). */
function LaunchSplash() {
  const { status } = useAuth();
  return <IntroSplash ready={status !== 'connecting'} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  auth: { flex: 1, backgroundColor: colors.white },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  message: { fontSize: 17, fontFamily: fonts.display, color: colors.text },
  retry: { marginTop: 12 },
});
