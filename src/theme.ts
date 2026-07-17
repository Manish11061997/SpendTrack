export interface ThemePreset {
  id: string;
  name: string;
  colorHex: string;
  light: {
    primary: string;
    secondary: string;
    tertiary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    secondaryContainer: string;
    onSecondaryContainer: string;
    background: string;
    surface: string;
    surfaceContainerLowest: string;
    surfaceContainerLow: string;
    surfaceContainer: string;
    surfaceContainerHigh: string;
    surfaceContainerHighest: string;
    outlineVariant: string;
  };
  dark: {
    primary: string;
    secondary: string;
    tertiary: string;
    primaryContainer: string;
    onPrimaryContainer: string;
    secondaryContainer: string;
    onSecondaryContainer: string;
    background: string;
    surface: string;
    surfaceContainerLowest: string;
    surfaceContainerLow: string;
    surfaceContainer: string;
    surfaceContainerHigh: string;
    surfaceContainerHighest: string;
    outlineVariant: string;
  };
}

export const COLOR_PRESETS: ThemePreset[] = [
  {
    id: 'navy',
    name: 'Oxford Navy',
    colorHex: '#1A2F4C',
    light: {
      primary: '#1A2F4C',
      secondary: '#455A73',
      tertiary: '#5D2B3F',
      primaryContainer: '#F1F4F9',
      onPrimaryContainer: '#0B1525',
      secondaryContainer: '#F5F7FA',
      onSecondaryContainer: '#1A2430',
      background: '#FAF9F6',
      surface: '#FFFFFF',
      surfaceContainerLowest: '#FFFFFF',
      surfaceContainerLow: '#F3F2EE',
      surfaceContainer: '#EDEBDF',
      surfaceContainerHigh: '#E5E3DF',
      surfaceContainerHighest: '#C4C0B9',
      outlineVariant: '#E5E3DF'
    },
    dark: {
      primary: '#A5C1E1',
      secondary: '#809BB0',
      tertiary: '#ECB1C0',
      primaryContainer: '#1F2E43',
      onPrimaryContainer: '#F1F4F9',
      secondaryContainer: '#2D3745',
      onSecondaryContainer: '#F5F7FA',
      background: '#0F1216',
      surface: '#161B22',
      surfaceContainerLowest: '#0A0D10',
      surfaceContainerLow: '#1A202A',
      surfaceContainer: '#212835',
      surfaceContainerHigh: '#283140',
      surfaceContainerHighest: '#303B4C',
      outlineVariant: '#2D3748'
    }
  },
  {
    id: 'emerald',
    name: 'Sherwood Olive',
    colorHex: '#2E4A35',
    light: {
      primary: '#2E4A35',
      secondary: '#496A51',
      tertiary: '#5E3B4E',
      primaryContainer: '#F2F7F3',
      onPrimaryContainer: '#112215',
      secondaryContainer: '#F5FAF6',
      onSecondaryContainer: '#1E293B',
      background: '#F6F7F3',
      surface: '#FFFFFF',
      surfaceContainerLowest: '#FFFFFF',
      surfaceContainerLow: '#ECEDE7',
      surfaceContainer: '#DFE1D9',
      surfaceContainerHigh: '#D2D5CB',
      surfaceContainerHighest: '#B1B5A8',
      outlineVariant: '#DFE1D9'
    },
    dark: {
      primary: '#9DC3A5',
      secondary: '#7BA383',
      tertiary: '#ECB1CC',
      primaryContainer: '#1B3822',
      onPrimaryContainer: '#F2F7F3',
      secondaryContainer: '#243A2A',
      onSecondaryContainer: '#F5FAF6',
      background: '#0E120F',
      surface: '#151B17',
      surfaceContainerLowest: '#080B09',
      surfaceContainerLow: '#1E2721',
      surfaceContainer: '#27332B',
      surfaceContainerHigh: '#304035',
      surfaceContainerHighest: '#3A4E40',
      outlineVariant: '#1E2721'
    }
  },
  {
    id: 'burgundy',
    name: 'Terracotta Rose',
    colorHex: '#853D3F',
    light: {
      primary: '#853D3F',
      secondary: '#A65A5C',
      tertiary: '#2C4A57',
      primaryContainer: '#FAF3F3',
      onPrimaryContainer: '#3B1416',
      secondaryContainer: '#FDF9FD',
      onSecondaryContainer: '#2A1D2B',
      background: '#FAF5F4',
      surface: '#FFFFFF',
      surfaceContainerLowest: '#FFFFFF',
      surfaceContainerLow: '#F2EAE8',
      surfaceContainer: '#E6DCDA',
      surfaceContainerHigh: '#DACDCA',
      surfaceContainerHighest: '#BEADA9',
      outlineVariant: '#E6DCDA'
    },
    dark: {
      primary: '#D99496',
      secondary: '#B87476',
      tertiary: '#93BCCB',
      primaryContainer: '#4B1C1E',
      onPrimaryContainer: '#FAF3F3',
      secondaryContainer: '#351B1C',
      onSecondaryContainer: '#FDF9FD',
      background: '#140E0F',
      surface: '#1B1415',
      surfaceContainerLowest: '#0B0809',
      surfaceContainerLow: '#281E20',
      surfaceContainer: '#342628',
      surfaceContainerHigh: '#413032',
      surfaceContainerHighest: '#4F3B3E',
      outlineVariant: '#281E20'
    }
  },
  {
    id: 'bronze',
    name: 'Antique Gold',
    colorHex: '#735625',
    light: {
      primary: '#735625',
      secondary: '#93733F',
      tertiary: '#2A4A4F',
      primaryContainer: '#FAF5EA',
      onPrimaryContainer: '#30210A',
      secondaryContainer: '#FAF7F0',
      onSecondaryContainer: '#1E293B',
      background: '#FAF7F0',
      surface: '#FFFFFF',
      surfaceContainerLowest: '#FFFFFF',
      surfaceContainerLow: '#F1EDE0',
      surfaceContainer: '#E3DEC9',
      surfaceContainerHigh: '#D6CFAF',
      surfaceContainerHighest: '#B9AF8C',
      outlineVariant: '#E3DEC9'
    },
    dark: {
      primary: '#D6AE69',
      secondary: '#B59052',
      tertiary: '#96BCC1',
      primaryContainer: '#45300F',
      onPrimaryContainer: '#FAF5EA',
      secondaryContainer: '#312513',
      onSecondaryContainer: '#FAF7F0',
      background: '#12100C',
      surface: '#1A1611',
      surfaceContainerLowest: '#0A0907',
      surfaceContainerLow: '#25201A',
      surfaceContainer: '#302A22',
      surfaceContainerHigh: '#3B332B',
      surfaceContainerHighest: '#473F34',
      outlineVariant: '#25201A'
    }
  },
  {
    id: 'plum',
    name: 'Vintage Plum',
    colorHex: '#5C3D5E',
    light: {
      primary: '#5C3D5E',
      secondary: '#7C5B7F',
      tertiary: '#2B4B3D',
      primaryContainer: '#FAF4FC',
      onPrimaryContainer: '#261228',
      secondaryContainer: '#FDF9FD',
      onSecondaryContainer: '#2A1D2B',
      background: '#FAF4FA',
      surface: '#FFFFFF',
      surfaceContainerLowest: '#FFFFFF',
      surfaceContainerLow: '#F1E6F1',
      surfaceContainer: '#E3D5E3',
      surfaceContainerHigh: '#D6C4D6',
      surfaceContainerHighest: '#BAA1BA',
      outlineVariant: '#E3D5E3'
    },
    dark: {
      primary: '#CCA6CD',
      secondary: '#A981AA',
      tertiary: '#9AC0AE',
      primaryContainer: '#361F38',
      onPrimaryContainer: '#FAF4FC',
      secondaryContainer: '#2C1D2E',
      onSecondaryContainer: '#FDF9FD',
      background: '#110D12',
      surface: '#19141B',
      surfaceContainerLowest: '#0A080C',
      surfaceContainerLow: '#251E28',
      surfaceContainer: '#312735',
      surfaceContainerHigh: '#3D3142',
      surfaceContainerHighest: '#4A3B4F',
      outlineVariant: '#251E28'
    }
  },
  {
    id: 'slate',
    name: 'Classic Slate',
    colorHex: '#38454F',
    light: {
      primary: '#38454F',
      secondary: '#556470',
      tertiary: '#6E2C2E',
      primaryContainer: '#F1F4F6',
      onPrimaryContainer: '#121C22',
      secondaryContainer: '#F8FAFC',
      onSecondaryContainer: '#1E293B',
      background: '#F3F5F6',
      surface: '#FFFFFF',
      surfaceContainerLowest: '#FFFFFF',
      surfaceContainerLow: '#E6E9EB',
      surfaceContainer: '#D8DCE0',
      surfaceContainerHigh: '#CACFD3',
      surfaceContainerHighest: '#ADAFB4',
      outlineVariant: '#D8DCE0'
    },
    dark: {
      primary: '#9BB0BF',
      secondary: '#7A8D9C',
      tertiary: '#ECB1B2',
      primaryContainer: '#222C33',
      onPrimaryContainer: '#F1F4F6',
      secondaryContainer: '#2D3840',
      onSecondaryContainer: '#F8FAFC',
      background: '#0F1113',
      surface: '#171B1E',
      surfaceContainerLowest: '#0A0C0E',
      surfaceContainerLow: '#21272B',
      surfaceContainer: '#2A3137',
      surfaceContainerHigh: '#333C43',
      surfaceContainerHighest: '#3F4951',
      outlineVariant: '#21272B'
    }
  }
];
