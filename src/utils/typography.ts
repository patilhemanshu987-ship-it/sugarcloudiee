import { Platform } from 'react-native';

const primary = Platform.select({
  ios: 'Avenir Next',
  android: 'sans-serif-medium',
  default: 'System',
});

const secondary = Platform.select({
  ios: 'Avenir Next',
  android: 'sans-serif',
  default: 'System',
});

export const typography = {
  display: {
    fontFamily: primary,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  title: {
    fontFamily: primary,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  body: {
    fontFamily: secondary,
    fontWeight: '500' as const,
  },
  caption: {
    fontFamily: secondary,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
  },
};