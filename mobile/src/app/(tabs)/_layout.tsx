import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { t } from '@/lib/i18n';
import { useApp } from '@/state/app-state';
import { useColors } from '@/theme';

export default function TabsLayout() {
  const { lang } = useApp();
  const c = useColors();
  return (
    <NativeTabs
      backgroundColor={c.card}
      indicatorColor={c.primarySoft}
      tintColor={c.primary}
      iconColor={{ default: c.textMuted, selected: c.primary }}
      labelStyle={{ color: c.textMuted }}>
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>{t('dashboard', lang)}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar" md="dashboard" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notes">
        <NativeTabs.Trigger.Label>{t('notes', lang)}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="book" md="menu_book" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="quizzes">
        <NativeTabs.Trigger.Label>{t('quizzes', lang)}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="checkmark.circle" md="quiz" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>{t('profile', lang)}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
