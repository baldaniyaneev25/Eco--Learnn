import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Chip, Segmented } from '@/components/ui';
import { API_URL } from '@/lib/config';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/types';
import { useApp } from '@/state/app-state';
import { radius, space, useColors } from '@/theme';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[styles.sectionTitle, { color: c.text }]}>{title}</Text>
      {children}
    </View>
  );
}

export default function ProfileScreen() {
  const { lang, setLang, user, meta, updateStudy, signOut } = useApp();
  const c = useColors();
  const [error, setError] = useState<string | null>(null);

  async function change(patch: { board?: string; classLevel?: string }) {
    setError(null);
    try {
      await updateStudy(patch);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: t('profile', lang) }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: c.background }} contentContainerStyle={{ paddingBottom: space.xl }}>
        <Section title={t('account', lang)}>
          <Text style={[styles.name, { color: c.text }]}>{user?.name}</Text>
          <Text style={{ color: c.textMuted }}>{user?.email}</Text>
        </Section>

        <Section title={t('preferences', lang)}>
          <Text style={[styles.label, { color: c.textMuted }]}>{t('language', lang)}</Text>
          <Segmented<Lang>
            options={[
              { value: 'gu', label: 'ગુજરાતી' },
              { value: 'en', label: 'English' },
            ]}
            value={lang}
            onChange={setLang}
          />
          <Text style={[styles.label, { color: c.textMuted }]}>{t('board', lang)}</Text>
          <View style={styles.chips}>
            {meta.boards.map((b) => (
              <Chip key={b} label={b} selected={user?.board === b} onPress={() => change({ board: b })} />
            ))}
          </View>
          <Text style={[styles.label, { color: c.textMuted }]}>{t('class', lang)}</Text>
          <View style={styles.chips}>
            {meta.classLevels.map((cl) => (
              <Chip key={cl} label={cl} selected={user?.classLevel === cl} onPress={() => change({ classLevel: cl })} />
            ))}
          </View>
          {error && <Text style={{ color: c.dangerText }}>{error}</Text>}
        </Section>

        <View style={{ margin: space.lg }}>
          <Button variant="secondary" title={t('signOut', lang)} onPress={signOut} />
        </View>
        <Text style={[styles.footer, { color: c.textMuted }]}>
          {t('server', lang)}: {API_URL}
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  section: { margin: space.lg, marginBottom: 0, padding: space.lg, borderRadius: radius.lg, borderWidth: 1, gap: space.sm },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: space.xs },
  name: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 13, marginTop: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  footer: { marginHorizontal: space.lg, fontSize: 12 },
});
