import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, StatusView, openSource } from '@/components/ui';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { isFallback, pick, t } from '@/lib/i18n';
import type { NoteDetail } from '@/lib/types';
import { useApp } from '@/state/app-state';
import { radius, space, useColors } from '@/theme';

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lang } = useApp();
  const c = useColors();
  const { data, error, loading, refresh } = useApi<NoteDetail>(`/api/study/notes/${encodeURIComponent(id)}`);
  const [markedRead, setMarkedRead] = useState(false);
  const [busy, setBusy] = useState(false);

  const read = Boolean(data?.read || markedRead);
  const body = data ? pick(data.body, lang) : '';
  const pdf = data ? pick(data.pdfUrl, lang) : '';

  async function markAndContinue() {
    if (!data) return;
    setBusy(true);
    try {
      if (!read) {
        await api(`/api/study/notes/${data.id}/read`, { method: 'POST' });
        setMarkedRead(true);
      }
      if (data.nextId) router.replace(`/notes/note/${data.nextId}`);
    } catch {
      // keep the student on the page; they can try again
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: data ? pick(data.chapter.title, lang) : t('notes', lang) }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingBottom: space.xl }}>
        {!data && <StatusView loading={loading} error={error} empty={false} lang={lang} onRetry={refresh} />}
        {data && (
          <View style={[styles.paper, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.title, { color: c.text }]} selectable>
              {pick(data.title, lang)}
            </Text>
            {isFallback(data.body, lang) && <Text style={[styles.note, { color: c.warnText, backgroundColor: c.warnSoft }]}>{t('otherLanguage', lang)}</Text>}
            {body.split(/\n{2,}/).map((para, i) => (
              <Text key={i} style={[styles.body, { color: c.text }]} selectable>
                {para}
              </Text>
            ))}
            {pdf ? <Button variant="secondary" title={`📄 ${t('openPdf', lang)}`} onPress={() => openSource(pdf)} /> : null}
          </View>
        )}
        {data && (
          <View style={styles.actions}>
            <Button
              title={read ? (data.nextId ? `${t('next', lang)} →` : t('alreadyRead', lang)) : data.nextId ? t('markReadNext', lang) : t('markRead', lang)}
              onPress={markAndContinue}
              disabled={busy || (read && !data.nextId)}
            />
            {data.previousId && <Button variant="secondary" title={`← ${t('previous', lang)}`} onPress={() => router.replace(`/notes/note/${data.previousId}`)} />}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  paper: { margin: space.lg, padding: space.lg, borderRadius: radius.lg, borderWidth: 1, gap: space.md },
  title: { fontSize: 22, fontWeight: '800', lineHeight: 30 },
  body: { fontSize: 17, lineHeight: 28 },
  note: { fontSize: 13, padding: space.sm, borderRadius: radius.sm },
  actions: { marginHorizontal: space.lg, gap: space.sm },
});
