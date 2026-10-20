/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm white & warm stone base neutrals (maps all slate-* directly to warm white & warm charcoal)
        slate: {
          50: '#FAF9F5', // warm off-white / linen background
          100: '#F3F1EA', // warm light surface
          200: '#E6E3D8', // warm crisp border
          300: '#D5D0C1', // warm hover border
          400: '#9E9785', // warm subtle icons/labels
          500: '#756E5E', // warm secondary text
          600: '#5C5648', // warm body text
          700: '#454035', // warm dark surface
          800: '#2A2720', // warm dark border
          900: '#1C1B17', // warm charcoal text / card dark
          950: '#13120F', // warm deep black background dark
        },
        // Olive light & olive green primary accents
        brand: {
          50: '#F6F7F2', // delicate warm olive tint
          100: '#E8EFE1', // light olive wash
          200: '#D3E1C5', // soft light olive accent
          300: '#B6CCA2', // olive light
          400: '#97B57C', // olive light medium
          500: '#7B9B5C', // olive green
          600: '#5E7D42', // primary deep olive green
          700: '#4A6333', // darker olive for button hover
          800: '#3C4F2A', // deep olive
          900: '#324223', // rich olive forest
          950: '#182210', // dark olive base
        },
        olive: {
          50: '#F6F7F2',
          100: '#E8EFE1',
          200: '#D3E1C5',
          300: '#B6CCA2',
          400: '#97B57C',
          500: '#7B9B5C',
          600: '#5E7D42',
          700: '#4A6333',
          800: '#3C4F2A',
          900: '#324223',
          950: '#182210',
        },
        warm: {
          50: '#FAF9F5',
          100: '#F4F2EB',
          200: '#E6E3D8',
          300: '#D6D1C2',
          400: '#9E9785',
          500: '#756E5E',
          600: '#5C5648',
          700: '#454035',
          800: '#2A2720',
          900: '#1C1B17',
          950: '#13120F',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top, 0px)',
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'safe-left': 'env(safe-area-inset-left, 0px)',
        'safe-right': 'env(safe-area-inset-right, 0px)',
      },
    },
  },
  plugins: [],
}
