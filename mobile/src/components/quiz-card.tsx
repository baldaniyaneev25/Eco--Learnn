import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { pick, t } from '@/lib/i18n';
import type { Lang, QuizSummary } from '@/lib/types';
import { space, useColors } from '@/theme';

import { Badge, Card, scoreTone } from './ui';

/** A practice quiz or timed test; tapping opens the full-screen quiz. */
export function QuizCard({ quiz, lang }: { quiz: QuizSummary; lang: Lang }) {
  const c = useColors();
  return (
    <Card onPress={() => router.push(`/quiz/${quiz.id}`)}>
      <View style={styles.row}>
        <Badge tone={quiz.kind === 'test' ? 'info' : 'primary'}>{quiz.kind === 'test' ? t('tests', lang) : t('practice', lang)}</Badge>
        {quiz.bestPercent !== null && (
          <Badge tone={scoreTone(quiz.bestPercent)}>
            {t('best', lang)} {quiz.bestPercent}%
          </Badge>
        )}
      </View>
      <Text style={[styles.title, { color: c.text }]}>{pick(quiz.title, lang)}</Text>
      {pick(quiz.description, lang) ? <Text style={{ color: c.textMuted, lineHeight: 20 }}>{pick(quiz.description, lang)}</Text> : null}
      <Text style={{ color: c.textMuted, fontSize: 13 }}>
        {quiz.questionCount} {t('questions', lang)}
        {quiz.durationMinutes ? ` · ${quiz.durationMinutes} ${t('minutes', lang)}` : ''}
        {quiz.attempts ? ` · ${quiz.attempts} ${t('attempts', lang)}` : ''}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  title: { fontSize: 17, fontWeight: '700', lineHeight: 24 },
});
