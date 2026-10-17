/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          muted: 'var(--bg-surface-muted)',
          opaque: 'var(--bg-surface-opaque)',
        },
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          light: 'var(--accent-light)',
          contrast: 'var(--accent-contrast)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        status: {
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
          danger: 'var(--color-danger)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        heading: ['var(--font-heading)'],
      },
      borderRadius: {
        card: 'var(--radius-card)',
        dialog: 'var(--radius-dialog)',
      },
      boxShadow: {
        glass: 'var(--glass-shadow)',
      },
      backdropBlur: {
        subtle: 'var(--blur-subtle)',
        moderate: 'var(--blur-moderate)',
        strong: 'var(--blur-strong)',
      },
    },
  },
  plugins: [],
};
