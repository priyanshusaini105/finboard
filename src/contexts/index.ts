export * from './ThemeContext';
// OptimizedThemeContext also exports useTheme, so we only export the provider to avoid conflicts
export { OptimizedThemeProvider } from './OptimizedThemeContext';
