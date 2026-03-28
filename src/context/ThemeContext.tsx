import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

export type Theme = 'light' | 'dark' | 'gradient';

type ThemeColors = {
  background: string;
  headerBg: string;
  headerText: string;
  myBubble: string;
  otherBubble: string;
  myText: string;
  otherText: string;
  timestamp: string;
  otherTimestamp: string;
  inputBg: string;
  inputBorder: string;
  statusOnline: string;
  statusOffline: string;
  accent: string;
  card: string;
  divider: string;
};

type ThemeContextType = {
  theme: Theme;
  setTheme: (nextTheme: Theme) => void;
  toggleTheme: () => void;
  colors: ThemeColors;
};

const lightColors: ThemeColors = {
  background: '#F6F8FB',
  headerBg: '#FFFFFF',
  headerText: '#16202A',
  myBubble: '#1A73E8',
  otherBubble: '#E8EEF5',
  myText: '#FFFFFF',
  otherText: '#18212A',
  timestamp: 'rgba(255,255,255,0.78)',
  otherTimestamp: '#6D7A87',
  inputBg: '#FFFFFF',
  inputBorder: '#D5DEE8',
  statusOnline: '#1FA971',
  statusOffline: '#8693A1',
  accent: '#1A73E8',
  card: '#FFFFFF',
  divider: '#DFE6EE',
};

const darkColors: ThemeColors = {
  background: '#0F141A',
  headerBg: '#171E26',
  headerText: '#F5F8FC',
  myBubble: '#2D8CFF',
  otherBubble: '#263240',
  myText: '#FFFFFF',
  otherText: '#E6EDF5',
  timestamp: 'rgba(255,255,255,0.65)',
  otherTimestamp: '#AAB7C5',
  inputBg: '#121A22',
  inputBorder: '#2C3948',
  statusOnline: '#2DD684',
  statusOffline: '#8E9AA8',
  accent: '#6AA8FF',
  card: '#171E26',
  divider: '#2A3644',
};

const gradientColors: ThemeColors = {
  background: '#FFF4EA',
  headerBg: '#FFE6D3',
  headerText: '#3D2718',
  myBubble: '#EA6A3A',
  otherBubble: '#FFE8D6',
  myText: '#FFFFFF',
  otherText: '#4B3120',
  timestamp: 'rgba(255,255,255,0.78)',
  otherTimestamp: '#8B684F',
  inputBg: '#FFF7F0',
  inputBorder: '#F5C9A8',
  statusOnline: '#1FA971',
  statusOffline: '#9E8A79',
  accent: '#E45A22',
  card: '#FFF0E3',
  divider: '#F3CEB0',
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => undefined,
  toggleTheme: () => undefined,
  colors: lightColors,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemTheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [theme, setTheme] = useState<Theme>(systemTheme);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : prev === 'dark' ? 'gradient' : 'light'));
  };

  const colors = theme === 'dark' ? darkColors : theme === 'gradient' ? gradientColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);