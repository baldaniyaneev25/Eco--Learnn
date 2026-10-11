import { Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';

import { QuizCard } from '@/components/quiz-card';
import { Segmented, StatusView } from '@/components/ui';
import { useApi } from '@/hooks/use-api';
import { t } from '@/lib/i18n';
import type { QuizSummary } from '@/lib/types';
import { useApp, useStudyKey } from '@/state/app-state';
import { space, useColors } from '@/theme';

export default function QuizzesScreen() {
  const { lang } = useApp();
  const c = useColors();
  const key = useStudyKey();
  const [kind, setKind] = useState<'practice' | 'test'>('practice');
  const { data, error, loading, refreshing, refresh } = useApi<{ items: QuizSummary[] }>(`/api/study/quizzes?kind=${kind}`, { key, refetchOnFocus: true });

  return (
    <>
      <Stack.Screen options={{ title: t('quizzes', lang) }} />
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(q) => q.id}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: c.background }}
        contentContainerStyle={{ paddingBottom: space.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}
        ListHeaderComponent={
          <View style={{ padding: space.lg }}>
            <Segmented
              options={[
                { value: 'practice', label: t('practice', lang) },
                { value: 'test', label: t('tests', lang) },
              ]}
              value={kind}
              onChange={setKind}
            />
          </View>
        }
        renderItem={({ item }) => <QuizCard quiz={item} lang={lang} />}
        ListEmptyComponent={
          <StatusView loading={loading} error={error} empty lang={lang} onRetry={refresh} emptyText={kind === 'test' ? t('noTests', lang) : t('noQuizzes', lang)} />
        }
      />
    </>
  );
}
