/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf8f3',
          100: '#f9ecdb',
          200: '#f2d5b3',
          300: '#eab882',
          400: '#e09652',
          500: '#d57a30',
          600: '#a5641e',
          700: '#8b4c18',
          800: '#723c16',
          900: '#5e3114',
        },
        secondary: {
          50: '#fefbe8',
          100: '#fef6c3',
          200: '#feea89',
          300: '#fdd944',
          400: '#f9c513',
          500: '#e4ab07',
          600: '#ca8804',
          700: '#a06408',
          800: '#84500f',
          900: '#6e4213',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
