export const lightTheme = {
  mode: 'light',
  background: '#F7F9FC',
  text: '#1B2B3A',
  card: '#FFFFFF',
  mutedText: '#5F7488',
  border: '#D7E4F2',
  primary: '#4A90E2',
  secondary: '#EAF4FF',
  success: '#50C878',
  inputBackground: '#FFFFFF',
  overlay: 'rgba(18, 40, 58, 0.35)',
  shadow: 'rgba(26, 55, 84, 0.12)',
};

export const darkTheme = {
  mode: 'dark',
  background: '#121212',
  text: '#EAEAEA',
  card: '#1E1E1E',
  mutedText: '#B1B8BF',
  border: '#2C343C',
  primary: '#4A90E2',
  secondary: '#1B2632',
  success: '#50C878',
  inputBackground: '#22262B',
  overlay: 'rgba(0, 0, 0, 0.55)',
  shadow: 'rgba(0, 0, 0, 0.28)',
};

export const getTheme = (mode) => (mode === 'dark' ? darkTheme : lightTheme);
