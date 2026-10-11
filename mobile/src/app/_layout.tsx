import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { t } from '@/lib/i18n';
import { AppProvider, useApp } from '@/state/app-state';
import { useColors } from '@/theme';

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { ready, user, lang } = useApp();
  const c = useColors();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.card },
        headerTintColor: c.primary,
        headerTitleStyle: { color: c.text },
        contentStyle: { backgroundColor: c.background },
      }}>
      {/* Signed-in area: tabs plus full-screen quiz and result screens. */}
      <Stack.Protected guard={Boolean(user)}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="quiz/[id]" options={{ title: t('quizzes', lang), gestureEnabled: false }} />
        <Stack.Screen name="result/[id]" options={{ title: t('result', lang) }} />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

// Light theme everywhere, including navigation chrome and the status bar.
const LightNavigationTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#F7F8F6', card: '#FFFFFF', primary: '#047857' },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={LightNavigationTheme}>
      <StatusBar style="dark" />
      <AppProvider>
        <RootStack />
      </AppProvider>
    </ThemeProvider>
  );
}
