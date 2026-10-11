import { useColorScheme } from 'react-native';

const light = {
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

type Palette = typeof light;

const dark: Palette = {
  background: '#0F1412',
  card: '#1A211E',
  text: '#ECF1EE',
  textMuted: '#9BA8A2',
  border: '#2B3430',
  primary: '#34D399',
  primaryText: '#062B1F',
  primarySoft: '#123528',
  primarySoftText: '#A7F3D0',
  warnSoft: '#3D2E0A',
  warnText: '#FCD34D',
  infoSoft: '#0C2E40',
  infoText: '#7DD3FC',
  dangerSoft: '#3B1414',
  dangerText: '#FCA5A5',
};

export function useColors(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radius = { sm: 6, md: 10, lg: 14 } as const;
