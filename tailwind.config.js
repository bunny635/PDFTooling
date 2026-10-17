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
        canvas: {
          light: '#F6F8FF',
          dark: '#0B1121',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#17203B',
        },
        'surface-muted': {
          light: '#EEF2FF',
          dark: '#202B46',
        },
        accent: {
          DEFAULT: '#6675F5',
          hover: '#4E60DE',
          dark: '#91A0FF',
          'dark-hover': '#B0BAFF',
        },
      },
    },
  },
  plugins: [],
};
