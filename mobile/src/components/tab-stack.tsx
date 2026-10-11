import { Stack } from 'expo-router';

import { useColors } from '@/theme';

/** Header styling shared by every tab's stack. */
export function TabStack() {
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.card },
        headerTintColor: c.primary,
        headerTitleStyle: { color: c.text },
        contentStyle: { backgroundColor: c.background },
      }}
    />
  );
}
