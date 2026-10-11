import { Stack } from 'expo-router';
import { useState } from 'react';

import { ItemList } from '@/components/item-list';
import { Chip, ChipRow } from '@/components/ui';
import { t } from '@/lib/i18n';
import { useApp } from '@/state/app-state';

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

// Resources show the full card; "Read original" opens the source in the in-app browser.
export default function ResourcesScreen() {
  const { lang } = useApp();
  const [difficulty, setDifficulty] = useState<string | undefined>(undefined);
  return (
    <>
      <Stack.Screen options={{ title: t('resourcesTitle', lang) }} />
      <ItemList
        endpoint="/api/learning-resources"
        useClassFilter
        extraParams={{ difficulty }}
        header={
          <ChipRow>
            <Chip label={t('all', lang)} selected={!difficulty} onPress={() => setDifficulty(undefined)} />
            {DIFFICULTIES.map((d) => (
              <Chip key={d} label={t(d, lang)} selected={difficulty === d} onPress={() => setDifficulty(d)} />
            ))}
          </ChipRow>
        }
      />
    </>
  );
}
