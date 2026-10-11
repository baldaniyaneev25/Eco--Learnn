import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Chip, Segmented } from '@/components/ui';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/types';
import { useApp } from '@/state/app-state';
import { radius, space, useColors } from '@/theme';

export default function SignInScreen() {
  const { lang, setLang, signIn, register, meta } = useApp();
  const c = useColors();
  const [mode, setMode] = useState<'signIn' | 'register'>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [board, setBoard] = useState('GSEB');
  const [classLevel, setClassLevel] = useState('12');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputStyle = [styles.input, { borderColor: c.border, color: c.text, backgroundColor: c.card }];
  const canSubmit = email.trim() && password && (mode === 'signIn' || (name.trim() && password.length >= 8));

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signIn') await signIn(email.trim(), password);
      else await register({ name: name.trim(), email: email.trim(), password, board, classLevel });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.langRow}>
            <Segmented<Lang>
              options={[
                { value: 'gu', label: 'ગુજરાતી' },
                { value: 'en', label: 'English' },
              ]}
              value={lang}
              onChange={setLang}
            />
          </View>
          <Text style={[styles.title, { color: c.primary }]}>{t('appName', lang)}</Text>
          <Text style={[styles.tagline, { color: c.textMuted }]}>{t('tagline', lang)}</Text>

          <View style={[styles.form, { backgroundColor: c.card, borderColor: c.border }]}>
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
            {mode === 'register' && (
              <>
                <Text style={[styles.label, { color: c.textMuted }]}>{t('board', lang)}</Text>
                <View style={styles.chips}>
                  {meta.boards.map((b) => (
                    <Chip key={b} label={b} selected={board === b} onPress={() => setBoard(b)} />
                  ))}
                </View>
                <Text style={[styles.label, { color: c.textMuted }]}>{t('class', lang)}</Text>
                <View style={styles.chips}>
                  {meta.classLevels.map((cl) => (
                    <Chip key={cl} label={cl} selected={classLevel === cl} onPress={() => setClassLevel(cl)} />
                  ))}
                </View>
              </>
            )}
            {error && <Text style={{ color: c.dangerText }}>{error}</Text>}
            <Button title={mode === 'signIn' ? t('signIn', lang) : t('createAccount', lang)} onPress={submit} disabled={busy || !canSubmit} />
            <Button
              variant="secondary"
              title={mode === 'signIn' ? t('noAccount', lang) : t('haveAccount', lang)}
              onPress={() => {
                setMode(mode === 'signIn' ? 'register' : 'signIn');
                setError(null);
              }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.xl, gap: space.md, flexGrow: 1, justifyContent: 'center' },
  langRow: { alignItems: 'flex-end' },
  title: { fontSize: 34, fontWeight: '800', textAlign: 'center', marginTop: space.lg },
  tagline: { fontSize: 15, textAlign: 'center', marginBottom: space.md },
  form: { borderWidth: 1, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.md, fontSize: 16 },
  label: { fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
