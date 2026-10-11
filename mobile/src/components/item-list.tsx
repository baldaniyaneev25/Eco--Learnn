import { useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';

import { usePagedApi } from '@/hooks/use-api';
import { query } from '@/lib/api';
import { t } from '@/lib/i18n';
import type { PublicItem } from '@/lib/types';
import { useApp } from '@/state/app-state';
import { space, useColors } from '@/theme';

import { ItemCard } from './item-card';
import { Chip, ChipRow, StatusView } from './ui';

/**
 * Infinite, pull-to-refresh list of approved items from a public endpoint,
 * with a topic filter. Language (and optionally class/board) come from preferences.
 */
export function ItemList({
  endpoint,
  onOpen,
  useClassFilter = false,
  extraParams = {},
  header,
}: {
  endpoint: string;
  onOpen?: (item: PublicItem) => void;
  useClassFilter?: boolean;
  extraParams?: Record<string, string | undefined>;
  header?: ReactNode;
}) {
  const { lang, classLevel, board, meta, ready } = useApp();
  const c = useColors();
  const [category, setCategory] = useState<string | undefined>(undefined);

  const extra = JSON.stringify(extraParams);
  const buildPath = ready
    ? (page: number) =>
        `${endpoint}${query({
          page,
          limit: 15,
          lang,
          category,
          ...(useClassFilter ? { class: classLevel, board } : {}),
          ...(JSON.parse(extra) as Record<string, string | undefined>),
        })}`
    : null;
  const { items, error, loading, loadingMore, refreshing, refresh, loadMore } = usePagedApi<PublicItem>(buildPath);

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: c.background }}
      renderItem={({ item }) => <ItemCard item={item} lang={lang} onPress={onOpen ? () => onOpen(item) : undefined} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}
      ListHeaderComponent={
        <View style={{ paddingBottom: space.sm }}>
          {header}
          <ChipRow>
            <Chip label={t('all', lang)} selected={!category} onPress={() => setCategory(undefined)} />
            {meta?.categories.map((cat) => (
              <Chip key={cat.code} label={cat.label[lang]} selected={category === cat.code} onPress={() => setCategory(cat.code)} />
            ))}
          </ChipRow>
        </View>
      }
      ListEmptyComponent={<StatusView loading={loading || !ready} error={error} empty lang={lang} onRetry={refresh} />}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: space.lg }} color={c.primary} /> : null}
    />
  );
}
