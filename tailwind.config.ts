import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          DEFAULT: '#1a2332',
          soft: '#44546b',
          mute: '#7b8699',
        },
        paper: '#ffffff',
        cream: '#f5f3ef',
        rule: '#e5e1d8',
        brand: {
          magenta: '#9A1A5A',
          pink: '#E91E5A',
          orange: '#F26A1F',
          amber: '#FCB51A',
        },
      },
      letterSpacing: {
        'tightest': '-0.03em',
        'tighter': '-0.025em',
        'tight': '-0.015em',
        'widest': '0.18em',
      },
    },
  },
  plugins: [],
} satisfies Config;
