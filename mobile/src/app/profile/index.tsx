import { Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

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

function AccountForm({ lang }: { lang: Lang }) {
  const { signIn, register } = useApp();
  const c = useColors();
  const [mode, setMode] = useState<'signIn' | 'register'>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputStyle = [styles.input, { borderColor: c.border, color: c.text, backgroundColor: c.background }];

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signIn') await signIn(email.trim(), password);
      else await register({ name: name.trim(), email: email.trim(), password });
      setPassword('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: space.sm }}>
      <Text style={{ color: c.textMuted, lineHeight: 20 }}>{t('guestNote', lang)}</Text>
      {mode === 'register' && (
        <TextInput style={inputStyle} placeholder={t('name', lang)} placeholderTextColor={c.textMuted} value={name} onChangeText={setName} autoComplete="name" />
      )}
      <TextInput
        style={inputStyle}
        placeholder={t('email', lang)}
        placeholderTextColor={c.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <TextInput
        style={inputStyle}
        placeholder={mode === 'register' ? `${t('password', lang)} (${t('passwordHint', lang)})` : t('password', lang)}
        placeholderTextColor={c.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
      />
      {error && <Text style={{ color: c.dangerText }}>{error}</Text>}
      <Button
        title={mode === 'signIn' ? t('signIn', lang) : t('createAccount', lang)}
        onPress={submit}
        disabled={busy || !email || !password || (mode === 'register' && (!name || password.length < 8))}
      />
      <Button
        variant="secondary"
        title={mode === 'signIn' ? t('noAccount', lang) : t('haveAccount', lang)}
        onPress={() => {
          setMode(mode === 'signIn' ? 'register' : 'signIn');
          setError(null);
        }}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const { lang, board, classLevel, meta, user, updatePrefs, signOut } = useApp();
  const c = useColors();
  const boards = meta?.boards ?? ['GSEB', 'CBSE'];
  const classes = meta?.classLevels ?? ['9', '10', '11', '12'];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: t('profile', lang) }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ backgroundColor: c.background }} keyboardShouldPersistTaps="handled">
        <Section title={t('preferences', lang)}>
          <Text style={[styles.label, { color: c.textMuted }]}>{t('language', lang)}</Text>
          <Segmented<Lang>
            options={[
              { value: 'gu', label: 'ગુજરાતી' },
              { value: 'en', label: 'English' },
            ]}
            value={lang}
            onChange={(l) => updatePrefs({ lang: l })}
          />
          <Text style={[styles.label, { color: c.textMuted }]}>{t('board', lang)}</Text>
          <View style={styles.chips}>
            {boards.map((b) => (
              <Chip key={b} label={b} selected={board === b} onPress={() => updatePrefs({ board: b })} />
            ))}
          </View>
          <Text style={[styles.label, { color: c.textMuted }]}>{t('class', lang)}</Text>
          <View style={styles.chips}>
            {classes.map((cl) => (
              <Chip key={cl} label={cl} selected={classLevel === cl} onPress={() => updatePrefs({ classLevel: cl })} />
            ))}
          </View>
        </Section>

        <Section title={t('account', lang)}>
          {user ? (
            <View style={{ gap: space.md }}>
              <Text style={{ color: c.text }}>
                {t('signedInAs', lang)} <Text style={{ fontWeight: '700' }}>{user.name}</Text> ({user.email})
              </Text>
              <Button variant="secondary" title={t('signOut', lang)} onPress={signOut} />
            </View>
          ) : (
            <AccountForm lang={lang} />
          )}
        </Section>

        <Text style={[styles.footer, { color: c.textMuted }]}>{t('sampleNotice', lang)}</Text>
        <Text style={[styles.footer, { color: c.textMuted }]}>
          {t('server', lang)}: {API_URL}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  section: { margin: space.lg, marginBottom: 0, padding: space.lg, borderRadius: radius.lg, borderWidth: 1, gap: space.sm },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: space.xs },
  label: { fontSize: 13, marginTop: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.md, fontSize: 16 },
  footer: { marginHorizontal: space.lg, marginTop: space.lg, fontSize: 12, lineHeight: 18 },
});
