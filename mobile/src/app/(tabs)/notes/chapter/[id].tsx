import { Stack, router, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { QuizCard } from '@/components/quiz-card';
import { Card, SectionTitle, StatusView } from '@/components/ui';
import { useApi } from '@/hooks/use-api';
import { pick, t } from '@/lib/i18n';
import type { ChapterDetail } from '@/lib/types';
import { useApp } from '@/state/app-state';
import { space, useColors } from '@/theme';

export default function ChapterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lang } = useApp();
  const c = useColors();
  const { data, error, loading, refreshing, refresh } = useApi<ChapterDetail>(`/api/study/chapters/${encodeURIComponent(id)}`, { refetchOnFocus: true });

  return (
    <>
      <Stack.Screen options={{ title: data ? pick(data.title, lang) : t('notes', lang) }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: c.background }}
        contentContainerStyle={{ paddingBottom: space.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}>
        {!data && <StatusView loading={loading} error={error} empty={false} lang={lang} onRetry={refresh} />}
        {data && (
          <>
            {pick(data.description, lang) ? <Text style={[styles.description, { color: c.textMuted }]}>{pick(data.description, lang)}</Text> : null}
            <SectionTitle>{t('notes', lang)}</SectionTitle>
            {data.notes.length === 0 && <Text style={[styles.description, { color: c.textMuted }]}>{t('empty', lang)}</Text>}
            {data.notes.map((n, i) => (
              <Card key={n.id} onPress={() => router.push(`/notes/note/${n.id}`)} style={styles.row}>
                <View style={[styles.dot, { backgroundColor: n.read ? c.primary : c.card, borderColor: n.read ? c.primary : c.border }]}>
                  <Text style={{ color: n.read ? c.primaryText : c.textMuted, fontWeight: '700' }}>{n.read ? '✓' : i + 1}</Text>
                </View>
                <Text style={[styles.noteTitle, { color: c.text }]}>{pick(n.title, lang)}</Text>
                {n.hasPdf && <Text style={{ color: c.textMuted, fontSize: 12 }}>PDF</Text>}
              </Card>
            ))}
            {data.quizzes.length > 0 && (
              <>
                <SectionTitle>{t('practiceQuizzes', lang)}</SectionTitle>
                {data.quizzes.map((q) => (
                  <QuizCard key={q.id} quiz={q} lang={lang} />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  description: { marginHorizontal: space.lg, marginTop: space.lg, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  dot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  noteTitle: { flex: 1, fontSize: 16, fontWeight: '600', lineHeight: 22 },
});
