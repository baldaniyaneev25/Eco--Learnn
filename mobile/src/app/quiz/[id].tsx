import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, StatusView, scoreTone } from '@/components/ui';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { pick, t } from '@/lib/i18n';
import type { AttemptStart, QuizSummary } from '@/lib/types';
import { useApp } from '@/state/app-state';
import { radius, space, useColors } from '@/theme';

function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function Runner({ attempt, onSubmitted }: { attempt: AttemptStart; onSubmitted: (attemptId: string) => void }) {
  const { lang } = useApp();
  const c = useColors();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => attempt.questions.map(() => null));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Difference between this phone's clock and the server's, so the countdown matches the server deadline.
  const [clockOffset] = useState(() => Date.now() - new Date(attempt.serverNow).getTime());
  const deadline = attempt.deadlineAt ? new Date(attempt.deadlineAt).getTime() : null;
  const [remaining, setRemaining] = useState<number | null>(() => (deadline ? deadline - (Date.now() - clockOffset) : null));
  const answersRef = useRef(answers);
  const submittedRef = useRef(false);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  async function submit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await api(`/api/study/attempts/${attempt.attemptId}/submit`, { method: 'POST', json: { answers: answersRef.current } });
      onSubmitted(attempt.attemptId);
    } catch (err) {
      submittedRef.current = false;
      setError((err as Error).message);
      setSubmitting(false);
    }
  }
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });

  // Countdown for timed tests; submits automatically at zero.
  useEffect(() => {
    if (!deadline) return;
    const timer = setInterval(() => {
      const left = deadline - (Date.now() - clockOffset);
      setRemaining(left);
      if (left <= 0) {
        clearInterval(timer);
        void submitRef.current();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline, clockOffset]);

  function confirmSubmit() {
    const unanswered = answers.filter((a) => a === null).length;
    if (unanswered === 0) return void submit();
    Alert.alert(t('submitConfirmTitle', lang), `${unanswered} ${t('unanswered', lang)}`, [
      { text: t('cancel', lang), style: 'cancel' },
      { text: t('submit', lang), style: 'destructive', onPress: () => void submit() },
    ]);
  }

  const q = attempt.questions[index];
  const timeUp = remaining !== null && remaining <= 0;
  const lowTime = remaining !== null && remaining < 60_000;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[styles.topBar, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={{ color: c.textMuted, fontWeight: '600' }}>
          {t('question', lang)} {index + 1} {t('of', lang)} {attempt.questions.length}
        </Text>
        {remaining !== null && (
          <Text style={[styles.clock, { color: lowTime ? c.dangerText : c.text }]} accessibilityLabel={t('timeLeft', lang)}>
            ⏱ {formatClock(remaining)}
          </Text>
        )}
      </View>
      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
        <Text style={[styles.question, { color: c.text }]}>{pick(q.text, lang)}</Text>
        {q.options.map((opt, i) => {
          const selected = answers[index] === i;
          return (
            <Pressable
              key={i}
              disabled={submitting || timeUp}
              onPress={() => setAnswers((a) => a.map((v, j) => (j === index ? (v === i ? null : i) : v)))}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[styles.option, { borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primarySoft : c.card }]}>
              <View style={[styles.letter, { backgroundColor: selected ? c.primary : c.background, borderColor: selected ? c.primary : c.border }]}>
                <Text style={{ color: selected ? c.primaryText : c.textMuted, fontWeight: '700' }}>{String.fromCharCode(65 + i)}</Text>
              </View>
              <Text style={[styles.optionText, { color: c.text }]}>{pick(opt, lang)}</Text>
            </Pressable>
          );
        })}
        {timeUp && <Text style={{ color: c.dangerText, fontWeight: '600' }}>{t('timeUp', lang)}</Text>}
        {error && <Text style={{ color: c.dangerText }}>{error}</Text>}
      </ScrollView>

      <View style={[styles.dots, { borderColor: c.border, backgroundColor: c.card }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.xs, paddingHorizontal: space.lg }}>
          {attempt.questions.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => setIndex(i)}
              style={[styles.dot, { borderColor: i === index ? c.primary : c.border, backgroundColor: answers[i] !== null ? c.primarySoft : c.card }]}>
              <Text style={{ color: c.text, fontSize: 12, fontWeight: i === index ? '800' : '400' }}>{i + 1}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.nav}>
          <View style={{ flex: 1 }}>
            <Button variant="secondary" title={`← ${t('previous', lang)}`} onPress={() => setIndex((i) => i - 1)} disabled={index === 0} />
          </View>
          <View style={{ flex: 1 }}>
            {index < attempt.questions.length - 1 ? (
              <Button title={`${t('next', lang)} →`} onPress={() => setIndex((i) => i + 1)} />
            ) : (
              <Button title={submitting ? t('loading', lang) : t('submit', lang)} onPress={confirmSubmit} disabled={submitting} />
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lang } = useApp();
  const c = useColors();
  const { data: quiz, error, loading, refresh } = useApi<QuizSummary>(`/api/study/quizzes/${encodeURIComponent(id)}`);
  const [attempt, setAttempt] = useState<AttemptStart | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  async function start() {
    setStarting(true);
    setStartError(null);
    try {
      setAttempt(await api<AttemptStart>(`/api/study/quizzes/${encodeURIComponent(id)}/attempts`, { method: 'POST' }));
    } catch (err) {
      setStartError((err as Error).message);
    } finally {
      setStarting(false);
    }
  }

  if (attempt) {
    return (
      <>
        <Stack.Screen options={{ title: pick(attempt.quiz.title, lang) }} />
        <Runner attempt={attempt} onSubmitted={(attemptId) => router.replace(`/result/${attemptId}`)} />
      </>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      <Stack.Screen options={{ title: quiz ? pick(quiz.title, lang) : t('quizzes', lang) }} />
      {!quiz && <StatusView loading={loading} error={error} empty={false} lang={lang} onRetry={refresh} />}
      {quiz && (
        <View style={[styles.intro, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={{ flexDirection: 'row', gap: space.xs, flexWrap: 'wrap' }}>
            <Badge tone={quiz.kind === 'test' ? 'info' : 'primary'}>{quiz.kind === 'test' ? t('tests', lang) : t('practice', lang)}</Badge>
            {quiz.bestPercent !== null && (
              <Badge tone={scoreTone(quiz.bestPercent)}>
                {t('best', lang)} {quiz.bestPercent}%
              </Badge>
            )}
          </View>
          <Text style={[styles.introTitle, { color: c.text }]}>{pick(quiz.title, lang)}</Text>
          {pick(quiz.description, lang) ? <Text style={{ color: c.textMuted, lineHeight: 21 }}>{pick(quiz.description, lang)}</Text> : null}
          <Text style={{ color: c.text, fontSize: 16 }}>
            {quiz.questionCount} {t('questions', lang)}
            {quiz.durationMinutes ? ` · ⏱ ${quiz.durationMinutes} ${t('minutes', lang)}` : ''}
          </Text>
          {quiz.kind === 'test' && <Text style={[styles.rules, { color: c.infoText, backgroundColor: c.infoSoft }]}>{t('testRules', lang)}</Text>}
          {startError && <Text style={{ color: c.dangerText }}>{startError}</Text>}
          <Button
            title={quiz.hasRunningAttempt ? t('resumeTest', lang) : quiz.kind === 'test' ? t('startTest', lang) : t('start', lang)}
            onPress={start}
            disabled={starting}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md, borderBottomWidth: 1 },
  clock: { fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  question: { fontSize: 19, fontWeight: '700', lineHeight: 28 },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 2, borderRadius: radius.md, padding: space.md },
  letter: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, fontSize: 16, lineHeight: 23 },
  dots: { borderTopWidth: 1, paddingTop: space.sm, paddingBottom: space.lg, gap: space.sm },
  dot: { width: 32, height: 32, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg },
  intro: { borderWidth: 1, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  introTitle: { fontSize: 22, fontWeight: '800', lineHeight: 30 },
  rules: { padding: space.md, borderRadius: radius.md, lineHeight: 20 },
});
