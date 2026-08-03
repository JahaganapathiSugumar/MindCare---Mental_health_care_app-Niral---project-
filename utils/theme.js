export const lightTheme = {
  mode: 'light',
  background: '#F8FAFC',
  text: '#0F172A',
  card: '#FFFFFF',
  mutedText: '#64748B',
  border: '#E2E8F0',
  primary: '#3B82F6',
  secondary: '#60A5FA',
  accent: '#38BDF8',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  inputBackground: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.4)',
  shadow: 'rgba(15, 23, 42, 0.08)',
  radius: 20,
};

export const darkTheme = {
  mode: 'dark',
  background: '#0B1220',
  text: '#FFFFFF',
  card: '#121826',
  mutedText: '#A1A1AA',
  border: 'rgba(255, 255, 255, 0.08)',
  primary: '#3B82F6',
  secondary: '#60A5FA',
  accent: '#38BDF8',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  inputBackground: 'rgba(255, 255, 255, 0.04)',
  overlay: 'rgba(0, 0, 0, 0.65)',
  shadow: 'rgba(0, 0, 0, 0.4)',
  radius: 22,
};

export const getTheme = (mode) => (mode === 'light' ? lightTheme : darkTheme);
