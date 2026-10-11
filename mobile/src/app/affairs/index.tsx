import { Stack, router } from 'expo-router';

import { ItemList } from '@/components/item-list';
import { t } from '@/lib/i18n';
import { useApp } from '@/state/app-state';

// Current affairs are filtered to the student's selected board and class.
export default function AffairsScreen() {
  const { lang } = useApp();
  return (
    <>
      <Stack.Screen options={{ title: t('affairs', lang) }} />
      <ItemList endpoint="/api/current-affairs" useClassFilter onOpen={(item) => router.push(`/affairs/${item.id}`)} />
    </>
  );
}
