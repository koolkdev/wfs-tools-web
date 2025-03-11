import { createTheme, ThemeOptions } from '@mui/material/styles';

// Define custom colors and options for light theme
const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
  },
};

// Define custom colors and options for dark theme
const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
  },
};

// Create theme instances
export const lightTheme = createTheme(lightThemeOptions);
export const darkTheme = createTheme(darkThemeOptions);
