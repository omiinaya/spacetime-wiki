/** @type {import('tailwindcss').Config} */
/**
 * NOTE: This config is used by Tailwind v4 for IntelliSense only.
 * Actual theme configuration is defined in src/index.css via @theme directive.
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'oklch(var(--background) / <alpha-value>)',
        foreground: 'oklch(var(--foreground) / <alpha-value>)',
        card: 'oklch(var(--card) / <alpha-value>)',
        primary: 'oklch(var(--primary) / <alpha-value>)',
        secondary: 'oklch(var(--secondary) / <alpha-value>)',
        muted: 'oklch(var(--muted) / <alpha-value>)',
        'muted-foreground': 'oklch(var(--muted-foreground) / <alpha-value>)',
        border: 'oklch(var(--border) / <alpha-value>)',
        sidebar: 'oklch(var(--sidebar) / <alpha-value>)',
        destructive: 'oklch(var(--destructive) / <alpha-value>)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
      },
    },
  },
  plugins: [],
};
