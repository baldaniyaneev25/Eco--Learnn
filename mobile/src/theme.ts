// EcoLearn uses a single light theme on every device, regardless of the
// phone's dark-mode setting (see "userInterfaceStyle": "light" in app.json).
const colors = {
  background: '#F7F8F6',
  card: '#FFFFFF',
  text: '#1C2321',
  textMuted: '#5F6B66',
  border: '#E3E7E4',
  primary: '#047857',
  primaryText: '#FFFFFF',
  primarySoft: '#ECFDF5',
  primarySoftText: '#065F46',
  warnSoft: '#FEF3C7',
  warnText: '#92400E',
  infoSoft: '#E0F2FE',
  infoText: '#075985',
  dangerSoft: '#FEE2E2',
  dangerText: '#991B1B',
};

export type Palette = typeof colors;

export function useColors(): Palette {
  return colors;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 6, md: 10, lg: 14 } as const;
