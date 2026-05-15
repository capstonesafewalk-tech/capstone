import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';

const lightColors = {
  background: '#F5F9FF',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  accent: '#38BDF8',
  border: '#DCE7FA',
  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',
  softBlue: '#EAF2FF',
  softGreen: '#DCFCE7',
  softAmber: '#FEF3C7',
  softRed: '#FEE2E2',
  softText: '#3B82F6',
  inputBackground: '#F8FBFF',
  shadow: 'rgba(37, 99, 235, 0.12)',
};

const darkColors = {
  background: '#081225',
  surface: '#0F172A',
  card: '#111B33',
  text: '#F8FAFC',
  muted: '#94A3B8',
  primary: '#60A5FA',
  primaryDark: '#2563EB',
  accent: '#38BDF8',
  border: '#1E293B',
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F87171',
  softBlue: '#102A4A',
  softGreen: '#0F2E21',
  softAmber: '#2A2208',
  softRed: '#341616',
  softText: '#93C5FD',
  inputBackground: '#0B162E',
  shadow: 'rgba(15, 23, 42, 0.45)',
};

const ThemeContext = createContext({
  scheme: 'light',
  isDark: false,
  colors: lightColors,
  navigationTheme: DefaultTheme,
});

export function AppThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [themeOverride, setThemeOverride] = useState(null);

  const value = useMemo(() => {
    const activeScheme = themeOverride || systemScheme || 'light';
    const isDark = activeScheme === 'dark';
    const colors = isDark ? darkColors : lightColors;
    const baseTheme = isDark ? DarkTheme : DefaultTheme;

    return {
      scheme: activeScheme,
      isDark,
      colors,
      themeOverride,
      setThemeOverride,
      navigationTheme: {
        ...baseTheme,
        colors: {
          ...baseTheme.colors,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          primary: colors.primary,
          notification: colors.accent,
        },
      },
    };
  }, [systemScheme, themeOverride]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
