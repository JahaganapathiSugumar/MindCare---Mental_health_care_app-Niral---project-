export const lightTheme = {
  mode: 'light',
  background: '#F7F9FC',
  text: '#222222',
  card: '#FFFFFF',
  mutedText: '#6E859A',
  border: '#D9E6F2',
  primary: '#4A90E2',
  success: '#3FAF62',
  inputBackground: '#FFFFFF',
  overlay: 'rgba(18, 40, 58, 0.35)',
};

export const darkTheme = {
  mode: 'dark',
  background: '#121212',
  text: '#EAEAEA',
  card: '#1E1E1E',
  mutedText: '#A7A7A7',
  border: '#2E2E2E',
  primary: '#6FAEFF',
  success: '#5CC687',
  inputBackground: '#222222',
  overlay: 'rgba(0, 0, 0, 0.55)',
};

export const getTheme = (mode) => (mode === 'dark' ? darkTheme : lightTheme);
