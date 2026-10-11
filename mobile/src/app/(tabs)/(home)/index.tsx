import { Stack, router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, Card, ProgressBar, SectionTitle, StatusView, scoreTone } from '@/components/ui';
import { useApi } from '@/hooks/use-api';
import { formatDate, pick, t } from '@/lib/i18n';
import type { Dashboard } from '@/lib/types';
import { useApp, useStudyKey } from '@/state/app-state';
import { radius, space, useColors } from '@/theme';

function Stat({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <View style={[styles.stat, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[styles.statValue, { color: c.primary }]}>{value}</Text>
      <Text style={{ color: c.textMuted, fontSize: 13 }}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { lang, user } = useApp();
  const c = useColors();
  const key = useStudyKey();
  const { data, error, loading, refreshing, refresh } = useApi<Dashboard>('/api/study/dashboard', { key, refetchOnFocus: true });

  return (
    <>
      <Stack.Screen options={{ title: t('dashboard', lang) }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: c.background }}
        contentContainerStyle={{ paddingBottom: space.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}>
        <View style={styles.hello}>
          <Text style={[styles.helloText, { color: c.text }]}>
            {t('hello', lang)}, {user?.name.split(' ')[0]} 👋
          </Text>
          <Badge tone="primary">
            {user?.board} · {t('class', lang)} {user?.classLevel}
          </Badge>
        </View>

        {!data && <StatusView loading={loading} error={error} empty={false} lang={lang} onRetry={refresh} />}

        {data && (
          <>
            {data.totals.chapters === 0 && <StatusView loading={false} error={null} empty lang={lang} onRetry={refresh} emptyText={t('noChapters', lang)} />}

            <View style={styles.stats}>
              <Stat label={t('notesRead', lang)} value={`${data.totals.notesRead}/${data.totals.notesTotal}`} />
              <Stat label={t('avgScore', lang)} value={data.totals.averagePercent === null ? '—' : `${data.totals.averagePercent}%`} />
              <Stat label={t('quizzesTaken', lang)} value={String(data.totals.quizzesTaken)} />
              <Stat label={t('testsTaken', lang)} value={String(data.totals.testsTaken)} />
            </View>

            {data.continueChapter && (
              <>
                <SectionTitle>{t('continueReading', lang)}</SectionTitle>
                <Card onPress={() => router.push(`/notes/chapter/${data.continueChapter!.id}`)}>
                  <Text style={[styles.cardTitle, { color: c.text }]}>{pick(data.continueChapter.title, lang)}</Text>
                  <ProgressBar value={data.continueChapter.notesRead} total={data.continueChapter.notesTotal} />
                  <Text style={{ color: c.textMuted, fontSize: 13 }}>
                    {data.continueChapter.notesRead}/{data.continueChapter.notesTotal} {t('read', lang)}
                  </Text>
                </Card>
              </>
            )}

            {data.weakChapters.length > 0 && (
              <>
                <SectionTitle>{t('needsPractice', lang)}</SectionTitle>
                {data.weakChapters.map((w) => (
                  <Card key={w.id} onPress={() => router.push(`/notes/chapter/${w.id}`)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.cardTitle, { color: c.text, flex: 1 }]}>{pick(w.title, lang)}</Text>
                    <Badge tone={scoreTone(w.averagePercent)}>{w.averagePercent}%</Badge>
                  </Card>
                ))}
              </>
            )}

            <SectionTitle>{t('recentResults', lang)}</SectionTitle>
            {data.recentAttempts.length === 0 ? (
              <Text style={[styles.muted, { color: c.textMuted }]}>{t('noResultsYet', lang)}</Text>
            ) : (
              data.recentAttempts.map((a) => (
                <Card key={a.attemptId} onPress={() => router.push(`/result/${a.attemptId}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.cardTitle, { color: c.text }]}>{pick(a.title, lang)}</Text>
                    <Text style={{ color: c.textMuted, fontSize: 13 }}>
                      {a.kind === 'test' ? t('tests', lang) : t('practice', lang)} · {formatDate(a.submittedAt, lang)}
                    </Text>
                  </View>
                  <Badge tone={scoreTone(a.percent)}>
                    {a.score}/{a.total}
                  </Badge>
                </Card>
              ))
            )}

            {data.chapterProgress.length > 0 && (
              <>
                <SectionTitle>{t('chapterProgress', lang)}</SectionTitle>
                {data.chapterProgress.map((p) => (
                  <Card key={p.id} onPress={() => router.push(`/notes/chapter/${p.id}`)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                      <Text style={[styles.cardTitle, { color: c.text, flex: 1 }]}>{pick(p.title, lang)}</Text>
                      {p.averagePercent !== null && <Badge tone={scoreTone(p.averagePercent)}>{p.averagePercent}%</Badge>}
                    </View>
                    <ProgressBar value={p.notesRead} total={p.notesTotal} />
                    <Text style={{ color: c.textMuted, fontSize: 13 }}>
                      {p.notesRead}/{p.notesTotal} {t('read', lang)}
                    </Text>
                  </Card>
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
  hello: { paddingHorizontal: space.lg, paddingTop: space.lg, gap: space.sm },
  helloText: { fontSize: 24, fontWeight: '800' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.lg },
  stat: { flexBasis: '47%', flexGrow: 1, borderWidth: 1, borderRadius: radius.lg, padding: space.lg, gap: 2 },
  statValue: { fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  cardTitle: { fontSize: 16, fontWeight: '700', lineHeight: 22 },
  muted: { marginHorizontal: space.lg, lineHeight: 20 },
});
