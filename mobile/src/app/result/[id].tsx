import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, StatusView, scoreTone } from '@/components/ui';
import { useApi } from '@/hooks/use-api';
import { formatDate, pick, t } from '@/lib/i18n';
import type { AttemptResult } from '@/lib/types';
import { useApp } from '@/state/app-state';
import { radius, space, useColors } from '@/theme';

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lang } = useApp();
  const c = useColors();
  const { data, error, loading, refresh } = useApi<AttemptResult>(`/api/study/attempts/${encodeURIComponent(id)}`);
  const tone = data ? scoreTone(data.percent) : 'neutral';
  const toneColors = { primary: [c.primarySoft, c.primarySoftText], warn: [c.warnSoft, c.warnText], danger: [c.dangerSoft, c.dangerText], info: [c.infoSoft, c.infoText], neutral: [c.border, c.text] }[tone];

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      <Stack.Screen options={{ title: t('result', lang) }} />
      {!data && <StatusView loading={loading} error={error} empty={false} lang={lang} onRetry={refresh} />}
      {data && data.review && (
        <>
          <View style={[styles.scoreBox, { backgroundColor: toneColors[0] }]}>
            <Text style={{ color: toneColors[1], fontWeight: '600' }}>{t('yourScore', lang)}</Text>
            <Text style={[styles.score, { color: toneColors[1] }]}>
              {data.score}/{data.total}
            </Text>
            <Text style={{ color: toneColors[1], fontSize: 18, fontWeight: '700' }}>{data.percent}%</Text>
            <Text style={{ color: toneColors[1], textAlign: 'center' }}>{pick(data.title, lang)}</Text>
            <Text style={{ color: toneColors[1], fontSize: 12 }}>{formatDate(data.submittedAt, lang, true)}</Text>
          </View>
          {data.status === 'expired' && <Text style={[styles.warn, { color: c.warnText, backgroundColor: c.warnSoft }]}>{t('expiredNote', lang)}</Text>}

          {data.review.map((r, i) => (
            <View key={i} style={[styles.card, { backgroundColor: c.card, borderColor: r.isCorrect ? c.primary : c.dangerText }]}>
              <Text style={[styles.qText, { color: c.text }]}>
                {i + 1}. {pick(r.text, lang)}
              </Text>
              {r.options.map((opt, j) => {
                const isCorrect = j === r.correctIndex;
                const isChosen = j === r.chosen;
                const bg = isCorrect ? c.primarySoft : isChosen ? c.dangerSoft : 'transparent';
                const fg = isCorrect ? c.primarySoftText : isChosen ? c.dangerText : c.text;
                return (
                  <View key={j} style={[styles.opt, { backgroundColor: bg }]}>
                    <Text style={{ color: fg, fontWeight: isCorrect || isChosen ? '700' : '400', lineHeight: 21 }}>
                      {String.fromCharCode(65 + j)}. {pick(opt, lang)} {isCorrect ? '✓' : isChosen ? '✗' : ''}
                    </Text>
                  </View>
                );
              })}
              {r.chosen === null && <Text style={{ color: c.textMuted, fontStyle: 'italic' }}>{t('notAnswered', lang)}</Text>}
              {pick(r.explanation, lang) ? (
                <Text style={{ color: c.textMuted, lineHeight: 20 }}>
                  <Text style={{ fontWeight: '700' }}>{t('explanation', lang)}: </Text>
                  {pick(r.explanation, lang)}
                </Text>
              ) : null}
            </View>
          ))}

          <View style={{ gap: space.sm }}>
            {data.kind === 'practice' && <Button title={t('tryAgain', lang)} onPress={() => router.replace(`/quiz/${data.quizId}`)} />}
            <Button variant="secondary" title={t('done', lang)} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scoreBox: { borderRadius: radius.lg, padding: space.xl, alignItems: 'center', gap: space.xs },
  score: { fontSize: 44, fontWeight: '800', fontVariant: ['tabular-nums'] },
  warn: { padding: space.md, borderRadius: radius.md, lineHeight: 20 },
  card: { borderWidth: 1, borderLeftWidth: 4, borderRadius: radius.md, padding: space.md, gap: space.sm },
  qText: { fontSize: 16, fontWeight: '700', lineHeight: 23 },
  opt: { borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: 6 },
});
