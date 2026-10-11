import { Stack, router } from 'expo-router';

import { ItemList } from '@/components/item-list';
import { t } from '@/lib/i18n';
import { useApp } from '@/state/app-state';

export default function NewsScreen() {
  const { lang } = useApp();
  return (
    <>
      <Stack.Screen options={{ title: t('newsTitle', lang) }} />
      <ItemList endpoint="/api/economics-news" onOpen={(item) => router.push(`/article/${item.id}`)} />
    </>
  );
}
