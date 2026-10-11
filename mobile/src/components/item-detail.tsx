import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useApi } from '@/hooks/use-api';
import { query } from '@/lib/api';
import { t } from '@/lib/i18n';
import type { PublicItem } from '@/lib/types';
import { useApp } from '@/state/app-state';
import { radius, space, useColors } from '@/theme';

import { Attribution, ItemMeta } from './item-card';
import { StatusView } from './ui';

/** Full article view for news and current-affairs items (both served by /api/economics-news/[id]). */
export function ItemDetail({ id }: { id: string }) {
  const { lang, ready } = useApp();
  const c = useColors();
  const { data, error, loading, refresh } = useApi<{ item: PublicItem }>(
    ready ? `/api/economics-news/${encodeURIComponent(id)}${query({ lang })}` : null,
  );
  const item = data?.item;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: c.background }}>
      <Stack.Screen options={{ title: t('articleTitle', lang) }} />
      {!item && <StatusView loading={loading} error={error} empty={false} lang={lang} onRetry={refresh} />}
      {item && (
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <ItemMeta item={item} lang={lang} />
          <Text style={[styles.title, { color: c.text }]} selectable>
            {item.title}
          </Text>
          <Text style={[styles.body, { color: c.text }]} selectable>
            {item.summary}
          </Text>
          <Text style={[styles.note, { color: c.textMuted }]}>{t('summaryNote', lang)}</Text>
          {item.translationUnavailable && <Text style={[styles.note, { color: c.warnText }]}>{t('translationUnavailable', lang)}</Text>}
          {item.isTranslation && <Text style={[styles.note, { color: c.textMuted }]}>{t('translatedNote', lang)}</Text>}
          <Attribution item={item} lang={lang} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { margin: space.lg, padding: space.lg, borderRadius: radius.lg, borderWidth: 1, gap: space.md },
  title: { fontSize: 22, fontWeight: '700', lineHeight: 30 },
  body: { fontSize: 17, lineHeight: 27 },
  note: { fontSize: 12, lineHeight: 18 },
});
