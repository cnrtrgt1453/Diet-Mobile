/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1C3A24', // Koyu orman yeşili (Okunabilirlik için)
    background: '#F1F8F3', // Çok açık mint/yeşilimsi krem arka plan
    backgroundElement: '#E1EFE4', // Açık sage yeşili kartlar
    backgroundSelected: '#C8E6C9', // Seçili/Vurgulu yeşil tonu
    textSecondary: '#546E5A', // Orta yeşil/gri ikincil metin
    primary: '#2E7D32', // Ana yaprak yeşili rengi
  },
  dark: {
    text: '#E2EFE5',
    background: '#0E1C11', // Koyu orman arka planı
    backgroundElement: '#1A3321',
    backgroundSelected: '#254B31',
    textSecondary: '#81A588',
    primary: '#4CAF50',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
