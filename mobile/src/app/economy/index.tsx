import { Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Badge, SampleBadge, StatusView, openSource } from '@/components/ui';
import { useApi } from '@/hooks/use-api';
import { formatDate, formatNumber, t } from '@/lib/i18n';
import type { Indicator, IndicatorSeries, Lang, RevisionStatus } from '@/lib/types';
import { useApp } from '@/state/app-state';
import { radius, space, useColors } from '@/theme';

const STATUS_TONE: Record<RevisionStatus, 'warn' | 'info' | 'primary' | 'neutral'> = {
  provisional: 'warn',
  estimate: 'info',
  revised: 'neutral',
  final: 'primary',
};

function History({ code, lang }: { code: string; lang: Lang }) {
  const c = useColors();
  const { data, error, loading, refresh } = useApi<IndicatorSeries>(`/api/economic-indicators/${encodeURIComponent(code)}`);
  if (!data) return <StatusView loading={loading} error={error} empty={false} lang={lang} onRetry={refresh} />;
  return (
    <View style={[styles.history, { borderColor: c.border }]}>
      {data.series.map((s) => (
        <View key={s.id} style={styles.historyRow}>
          <Text style={{ color: c.text, flex: 1 }}>{s.referencePeriod}</Text>
          <Text style={{ color: c.text, fontVariant: ['tabular-nums'], fontWeight: '600' }}>
            {formatNumber(s.value, lang)} <Text style={{ color: c.textMuted, fontWeight: '400' }}>{s.unit}</Text>
          </Text>
        </View>
      ))}
      {data.revisions.length > 0 && (
        <View style={{ marginTop: space.sm }}>
          <Text style={[styles.small, { color: c.textMuted, fontWeight: '600' }]}>{t('revisions', lang)}</Text>
          {data.revisions.map((r) => (
            <Text key={r.id} style={[styles.small, { color: c.textMuted }]}>
              {r.referencePeriod}: {formatNumber(r.value, lang)} {r.unit} ({formatDate(r.lastUpdated, lang)})
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

function IndicatorCard({ ind, lang }: { ind: Indicator; lang: Lang }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const name = lang === 'gu' ? (ind.nameGu ?? ind.name) : ind.name;
  const description = lang === 'gu' ? (ind.descriptionGu ?? ind.description) : ind.description;
  const row = (label: string, value: string) => (
    <View style={styles.metaRow}>
      <Text style={[styles.small, { color: c.textMuted, width: 90 }]}>{label}</Text>
      <Text style={[styles.small, { color: c.text, flex: 1 }]}>{value}</Text>
    </View>
  );

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.cardHead}>
        <Text style={[styles.name, { color: c.text }]}>{name}</Text>
        {ind.isSample && <SampleBadge lang={lang} />}
      </View>
      <Text style={[styles.value, { color: c.primary }]}>
        {formatNumber(ind.value, lang)}
        <Text style={[styles.unit, { color: c.textMuted }]}> {ind.unit}</Text>
      </Text>
      <Badge tone={STATUS_TONE[ind.revisionStatus]}>{t(ind.revisionStatus, lang)}</Badge>
      <View style={{ gap: 2 }}>
        {row(t('referencePeriod', lang), ind.referencePeriod)}
        {row(t('geography', lang), ind.geography)}
        {row(t('released', lang), formatDate(ind.releaseDate, lang))}
        {row(t('lastUpdated', lang), formatDate(ind.lastUpdated, lang, true))}
      </View>
      {description ? <Text style={[styles.desc, { color: c.text }]}>{description}</Text> : null}
      <Pressable onPress={() => openSource(ind.source.url)} disabled={!ind.source.url} accessibilityRole="link">
        <Text style={[styles.small, { color: ind.source.url ? c.primary : c.textMuted }]}>
          {t('source', lang)}: {ind.source.name}
          {ind.source.url ? ' ↗' : ''}
        </Text>
      </Pressable>
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button" hitSlop={8}>
        <Text style={{ color: c.primary, fontWeight: '600' }}>{open ? t('hideHistory', lang) : t('history', lang)}</Text>
      </Pressable>
      {open && <History code={ind.code} lang={lang} />}
    </View>
  );
}

export default function EconomyScreen() {
  const { lang } = useApp();
  const c = useColors();
  const { data, error, loading, refreshing, refresh } = useApi<{ items: Indicator[] }>('/api/economic-indicators');

  return (
    <>
      <Stack.Screen options={{ title: t('economyTitle', lang) }} />
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(i) => i.id}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: c.background }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.primary} />}
        ListHeaderComponent={
          <View style={[styles.note, { backgroundColor: c.infoSoft }]}>
            <Text style={{ color: c.infoText, lineHeight: 20 }}>{t('indicatorNote', lang)}</Text>
          </View>
        }
        renderItem={({ item }) => <IndicatorCard ind={item} lang={lang} />}
        ListEmptyComponent={<StatusView loading={loading} error={error} empty lang={lang} onRetry={refresh} />}
      />
    </>
  );
}

const styles = StyleSheet.create({
  note: { margin: space.lg, padding: space.md, borderRadius: radius.md },
  card: { marginHorizontal: space.lg, marginBottom: space.md, padding: space.lg, borderRadius: radius.lg, borderWidth: 1, gap: space.sm },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  name: { flex: 1, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  value: { fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] },
  unit: { fontSize: 15, fontWeight: '400' },
  metaRow: { flexDirection: 'row' },
  small: { fontSize: 12, lineHeight: 18 },
  desc: { fontSize: 14, lineHeight: 21 },
  history: { borderTopWidth: 1, paddingTop: space.sm, gap: 4 },
  historyRow: { flexDirection: 'row', alignItems: 'center' },
});
