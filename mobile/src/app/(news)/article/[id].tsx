import { useLocalSearchParams } from 'expo-router';

import { ItemDetail } from '@/components/item-detail';

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ItemDetail id={id} />;
}
