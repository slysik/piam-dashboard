import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Light theme colors
        'anthropic-bg': '#f8f9fa',
        'anthropic-surface': '#ffffff',
        'anthropic-surface-light': '#f3f4f6',
        'anthropic-accent': '#dc2626',
        'anthropic-accent-secondary': '#7c3aed',
        'anthropic-text': '#111827',
        'anthropic-text-muted': '#6b7280',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
