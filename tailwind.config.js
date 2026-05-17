/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'capoeira-gold':   '#D4A017',
        'capoeira-brown':  '#6B3A2A',
        'capoeira-green':  '#2D5016',
        'capoeira-cream':  '#F5F0E8',
        'capoeira-night':  '#1A1208',
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
