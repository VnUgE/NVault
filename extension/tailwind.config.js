import colors from 'tailwindcss/colors'
import plugin from 'tailwindcss/plugin'

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
  plugins: [
    //Adds button variants for each color
    plugin(({ theme, addUtilities }) => {
      const coloredButtons = {}

      for (let color in theme('colors')) {

        //Buttons must also have the .btn class
        coloredButtons[`.btn.${color}`] = {
          'color': theme(`colors.white`),
          'border-color': theme(`colors.${color}.500`),
          'background-color': theme(`colors.${color}.500`),

          '&:hover': {
            'border-color': theme(`colors.${color}.600`),
            'background-color': theme(`colors.${color}.600`),
          },

          '&:active': {
            'border-color': theme(`colors.${color}.700`),
            'background-color': theme(`colors.${color}.700`),
          },

          '&:focus': {
            '--tw-ring-color': theme(`colors.${color}.500`),
          },

          '&:disabled': {
            'border-color': theme(`colors.${color}.300`),
            'background-color': theme(`colors.${color}.300`),
            color: theme(`colors.white`),
          },

          '&.borderless, &.no-border, &.b-0': {
            'color': theme(`colors.${color}.500`),
            '&:hover': {
              'color': theme(`colors.${color}.600`),
            },
            'border': 'none',
            'background-color': 'transparent',
          },

          '.dark &': {
            'border-color': theme(`colors.${color}.600`),
            'background-color': 'transparent',
            'color': theme(`colors.${color}.600`),

            '&:hover': {
              'border-color': theme(`colors.${color}.500`),
              'color': theme(`colors.${color}.500`),
            },

            '&:focus': {
              '--tw-ring-color': theme(`colors.${color}.500`),
            },

            '&:disabled': {
              'border-color': theme(`colors.${color}.800`),
              'color': theme(`colors.${color}.800`),
            }
          }
        }
      }

      addUtilities(coloredButtons)
    }),

    //Plugin for input variants
    plugin(({ theme, addUtilities }) => {
      const coloredInputs = {}

      for (let color in theme('colors')) {
        coloredInputs[`.input.${color}`] = {
          'outline': 'none',

          '&:focus, &:active, &::after, &:focus:hover': {
            'border-color': theme(`colors.${color}.500`),
            'dark &': {
              'border-color': theme(`colors.${color}.600`),
            }
          }
        }
      }

      addUtilities(coloredInputs)
    })
  ]
}
