import * as WebBrowser from 'expo-web-browser';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/types';
import { radius, space, useColors } from '@/theme';

/** Opens a source link in the in-app browser. Only http(s) links from the API are opened. */
export function openSource(url: string | null) {
  if (url && /^https?:\/\//i.test(url)) void WebBrowser.openBrowserAsync(url);
}

type Tone = 'primary' | 'warn' | 'info' | 'danger' | 'neutral';

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  const c = useColors();
  const map: Record<Tone, [string, string]> = {
    primary: [c.primarySoft, c.primarySoftText],
    warn: [c.warnSoft, c.warnText],
    info: [c.infoSoft, c.infoText],
    danger: [c.dangerSoft, c.dangerText],
    neutral: [c.border, c.textMuted],
  };
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{children}</Text>
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, { borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.primary : c.card }]}>
      <Text style={{ color: selected ? c.primaryText : c.text, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {children}
    </ScrollView>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.segmented, { borderColor: c.primary }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[styles.segment, { backgroundColor: selected ? c.primary : 'transparent' }]}>
            <Text style={{ color: selected ? c.primaryText : c.primary, fontWeight: '600' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Button({ title, onPress, disabled, variant = 'primary' }: { title: string; onPress: () => void; disabled?: boolean; variant?: 'primary' | 'secondary' }) {
  const c = useColors();
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? c.primary : 'transparent',
          borderColor: c.primary,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}>
      <Text style={{ color: primary ? c.primaryText : c.primary, fontWeight: '600', fontSize: 16 }}>{title}</Text>
    </Pressable>
  );
}

export function StatusView({
  loading,
  error,
  empty,
  lang,
  onRetry,
  emptyText,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  lang: Lang;
  onRetry: () => void;
  emptyText?: string;
}) {
  const c = useColors();
  if (loading) {
    return (
      <View style={styles.status}>
        <ActivityIndicator color={c.primary} />
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.status, styles.errorBox, { backgroundColor: c.dangerSoft }]}>
        <Text style={{ color: c.dangerText, fontWeight: '600' }}>{t('error', lang)}</Text>
        <Text style={{ color: c.dangerText, marginTop: space.xs, textAlign: 'center' }}>{error}</Text>
        <View style={{ marginTop: space.md }}>
          <Button title={t('retry', lang)} onPress={onRetry} variant="secondary" />
        </View>
      </View>
    );
  }
  if (empty) {
    return (
      <View style={styles.status}>
        <Text style={{ color: c.textMuted, textAlign: 'center', lineHeight: 20 }}>{emptyText ?? t('empty', lang)}</Text>
      </View>
    );
  }
  return null;
}

export function Card({ children, onPress, style }: { children: ReactNode; onPress?: () => void; style?: object }) {
  const c = useColors();
  const base = [styles.card, { backgroundColor: c.card, borderColor: c.border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [...base, { opacity: pressed ? 0.85 : 1 }]}>
      {children}
    </Pressable>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[styles.sectionTitle, { color: c.text }]}>{children}</Text>;
}

export function ProgressBar({ value, total }: { value: number; total: number }) {
  const c = useColors();
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <View style={[styles.track, { backgroundColor: c.border }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: value }}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: c.primary }]} />
    </View>
  );
}

/** Colour tone for a percentage score. */
export function scoreTone(percent: number | null): Tone {
  if (percent === null) return 'neutral';
  if (percent >= 75) return 'primary';
  if (percent >= 50) return 'warn';
  return 'danger';
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, padding: space.lg, marginHorizontal: space.lg, marginBottom: space.md, gap: space.sm },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginHorizontal: space.lg, marginTop: space.lg, marginBottom: space.sm },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 999 },
  badge: { borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: 2, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: space.md, paddingVertical: 6 },
  chipRow: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, overflow: 'hidden', alignSelf: 'flex-start' },
  segment: { paddingHorizontal: space.lg, paddingVertical: space.sm },
  button: { borderWidth: 1, borderRadius: radius.md, paddingVertical: space.md, paddingHorizontal: space.lg, alignItems: 'center' },
  status: { padding: space.xl, alignItems: 'center', justifyContent: 'center' },
  errorBox: { margin: space.lg, borderRadius: radius.md },
});
