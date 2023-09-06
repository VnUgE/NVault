import colors from 'tailwindcss/colors'

export default {
  cpurge: ['./*.html', './src/**/*.{vue,js,ts,jsx,tsx,css}'],
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // or 'media' or 'class'
  theme: {
    colors: {
      //Tw colors
      ...colors,
      primary: {
        default: '#52d9a7',
        50: '#E9FAF4',
        100: '#D8F6EB',
        200: '#B6EFDA',
        300: '#95E8C9',
        400: '#73E0B8',
        500: '#52d9a7',
        600: '#2CC78E',
        700: '#22996D',
        800: '#186B4C',
        900: '#0D3D2B'
      },
      secondary: {
        default: '#22D2FF',
        50: '#DAF7FF',
        100: '#C5F3FF',
        200: '#9CEBFF',
        300: '#74E3FF',
        400: '#4BDAFF',
        500: '#22D2FF',
        600: '#00B9E9',
        700: '#008DB1',
        800: '#006079',
        900: '#003341'
      },
      dark: {
        default: '#303843',
        100: '#5a6a7f',
        200: '#4f5d70',
        300: '#455161',
        400: '#3a4452',
        500: '#303843',
        600: '#252c34',
        700: '#1a1f25',
        800: '#101316',
        900: '#050607'
      }
    },
  },
  plugins: []
}
