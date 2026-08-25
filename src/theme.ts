export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  bgElevated: string;
  borderPrimary: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentPrimary: string;
  accentHover: string;
  accentSubtle: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  nodeBg: string;
  canvasBg: string;
  gridColor: string;
}

export const themes: Record<ThemeMode, ThemeColors> = {
  dark: {
    bgPrimary: '#0d1117',
    bgSecondary: '#161b22',
    bgTertiary: '#21262d',
    bgElevated: '#30363d',
    borderPrimary: '#30363d',
    borderSubtle: '#21262d',
    textPrimary: '#f0f6fc',
    textSecondary: '#c9d1d9',
    textMuted: '#8b949e',
    accentPrimary: '#58a6ff',
    accentHover: '#79c0ff',
    accentSubtle: 'rgba(56, 139, 253, 0.15)',
    success: '#3fb950',
    warning: '#d29922',
    error: '#f85149',
    info: '#58a6ff',
    nodeBg: '#161b22',
    canvasBg: '#090d13',
    gridColor: 'rgba(255, 255, 255, 0.05)',
  },
  light: {
    bgPrimary: '#ffffff',
    bgSecondary: '#f6f8fa',
    bgTertiary: '#eaeef2',
    bgElevated: '#ffffff',
    borderPrimary: '#d0d7de',
    borderSubtle: '#e1e4e8',
    textPrimary: '#1f2328',
    textSecondary: '#656d76',
    textMuted: '#8c959f',
    accentPrimary: '#0969da',
    accentHover: '#218bff',
    accentSubtle: 'rgba(9, 105, 218, 0.1)',
    success: '#1a7f37',
    warning: '#9a6700',
    error: '#cf222e',
    info: '#0969da',
    nodeBg: '#ffffff',
    canvasBg: '#f8fafc',
    gridColor: 'rgba(0, 0, 0, 0.06)',
  },
};

export const categoryColors: Record<string, { main: string; bg: string; border: string }> = {
  compute: { main: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6' },
  networking: { main: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)', border: '#8b5cf6' },
  storage: { main: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: '#10b981' },
  caching: { main: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b' },
  messaging: { main: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)', border: '#ec4899' },
  security: { main: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444' },
};
