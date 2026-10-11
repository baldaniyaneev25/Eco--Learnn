import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { t } from '@/lib/i18n';
import { AppProvider, useApp } from '@/state/app-state';
import { useColors } from '@/theme';

SplashScreen.preventAutoHideAsync();

function Tabs() {
  const { lang, ready } = useApp();
  const c = useColors();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  return (
    <NativeTabs tintColor={c.primary} iconColor={{ default: c.textMuted, selected: c.primary }} labelStyle={{ color: c.textMuted }}>
      <NativeTabs.Trigger name="(news)">
        <NativeTabs.Trigger.Label>{t('news', lang)}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="newspaper" md="newspaper" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="affairs">
        <NativeTabs.Trigger.Label>{t('affairs', lang)}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="economy">
        <NativeTabs.Trigger.Label>{t('economy', lang)}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar" md="bar_chart" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="resources">
        <NativeTabs.Trigger.Label>{t('resources', lang)}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="book" md="menu_book" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>{t('profile', lang)}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppProvider>
        <Tabs />
      </AppProvider>
    </ThemeProvider>
  );
}
