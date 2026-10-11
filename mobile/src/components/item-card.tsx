import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDate, t } from '@/lib/i18n';
import type { Lang, PublicItem } from '@/lib/types';
import { useCategoryLabel } from '@/state/app-state';
import { radius, space, useColors } from '@/theme';

import { Badge, SampleBadge, openSource } from './ui';

export function ItemMeta({ item, lang }: { item: PublicItem; lang: Lang }) {
  const categoryLabel = useCategoryLabel();
  return (
    <View style={styles.badges}>
      <Badge tone="primary">{categoryLabel(item.category)}</Badge>
      {item.difficulty && <Badge tone="info">{t(item.difficulty, lang)}</Badge>}
      {item.classLevels.length > 0 && (
        <Badge>
          {t('forClass', lang)} {item.classLevels.join(', ')}
        </Badge>
      )}
      {item.isSample && <SampleBadge lang={lang} />}
    </View>
  );
}

export function Attribution({ item, lang }: { item: PublicItem; lang: Lang }) {
  const c = useColors();
  return (
    <View style={styles.attribution}>
      <Text style={[styles.small, { color: c.textMuted }]}>
        {t('source', lang)}: <Text style={{ fontWeight: '600', color: c.text }}>{item.source.name}</Text> · {t('published', lang)}{' '}
        {formatDate(item.publishedAt, lang)}
      </Text>
      {item.source.url ? (
        <Pressable onPress={() => openSource(item.source.url)} accessibilityRole="link" hitSlop={8}>
          <Text style={[styles.small, { color: c.primary, fontWeight: '600' }]}>{t('readOriginal', lang)} ↗</Text>
        </Pressable>
      ) : (
        <Text style={[styles.small, { color: c.textMuted, fontStyle: 'italic' }]}>{t('noSourceLink', lang)}</Text>
      )}
    </View>
  );
}

/** Card for news, current affairs and resources. Tapping opens the detail screen when `onPress` is set. */
export function ItemCard({ item, lang, onPress }: { item: PublicItem; lang: Lang; onPress?: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderColor: c.border, opacity: pressed ? 0.85 : 1 }]}>
      <ItemMeta item={item} lang={lang} />
      <Text style={[styles.title, { color: c.text }]}>{item.title}</Text>
      <Text style={[styles.summary, { color: c.text }]} numberOfLines={onPress ? 4 : undefined}>
        {item.summary}
      </Text>
      {item.translationUnavailable && <Text style={[styles.small, { color: c.warnText }]}>{t('translationUnavailable', lang)}</Text>}
      {item.isTranslation && <Text style={[styles.small, { color: c.textMuted }]}>{t('translatedNote', lang)}</Text>}
      <Attribution item={item} lang={lang} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, padding: space.lg, marginHorizontal: space.lg, marginBottom: space.md, gap: space.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  title: { fontSize: 17, fontWeight: '700', lineHeight: 24 },
  summary: { fontSize: 15, lineHeight: 23 },
  small: { fontSize: 12, lineHeight: 18 },
  attribution: { gap: 2, marginTop: space.xs },
});
