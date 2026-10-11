import { Stack, router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Badge, Card, ProgressBar, StatusView } from '@/components/ui';
import { useApi } from '@/hooks/use-api';
import { pick, t } from '@/lib/i18n';
import type { ChapterSummary } from '@/lib/types';
import { useApp, useStudyKey } from '@/state/app-state';
import { space, useColors } from '@/theme';

export default function ChaptersScreen() {
  const { lang } = useApp();
  const c = useColors();
  const key = useStudyKey();
  const { data, error, loading, refreshing, refresh } = useApi<{ items: ChapterSummary[] }>('/api/study/chapters', { key, refetchOnFocus: true });

  return (
    <>
      <Stack.Screen options={{ title: t('chapters', lang) }} />
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(ch) => ch.id}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: c.background }}
        contentContainerStyle={{ paddingTop: space.lg, paddingBottom: space.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}
        renderItem={({ item, index }) => (
          <Card onPress={() => router.push(`/notes/chapter/${item.id}`)}>
            <View style={styles.head}>
              <Text style={[styles.number, { color: c.primary }]}>{index + 1}</Text>
              <Text style={[styles.title, { color: c.text }]}>{pick(item.title, lang)}</Text>
              {item.notesTotal > 0 && item.notesRead === item.notesTotal && <Badge tone="primary">✓</Badge>}
            </View>
            {pick(item.description, lang) ? <Text style={{ color: c.textMuted, lineHeight: 20 }}>{pick(item.description, lang)}</Text> : null}
            <ProgressBar value={item.notesRead} total={item.notesTotal} />
            <Text style={{ color: c.textMuted, fontSize: 13 }}>
              {item.notesRead}/{item.notesTotal} {t('read', lang)} · {item.quizzes} {t('quizzes', lang)}
            </Text>
          </Card>
        )}
        ListEmptyComponent={<StatusView loading={loading} error={error} empty lang={lang} onRetry={refresh} emptyText={t('noChapters', lang)} />}
      />
    </>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  number: { fontSize: 18, fontWeight: '800', width: 24 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', lineHeight: 24 },
});
