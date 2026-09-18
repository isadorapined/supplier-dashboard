/** @type {import('tailwindcss').Config} */
// Every colour here maps to a Data Leaf token in src/index.css. Tailwind's own
// palette is switched off below so a stray `bg-white`, `text-gray-500` or
// `bg-blue-600` fails loudly instead of quietly shipping an off-brand screen.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  corePlugins: { preflight: true },
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      mint: 'var(--dl-mint-cream)',
      silver: 'var(--dl-silver)',
      deep: 'var(--dl-deep-space)',
      teal: 'var(--dl-deep-teal)',
      clay: 'var(--dl-burnt-clay)',
      'deep-60': 'color-mix(in srgb, var(--dl-deep-space) 60%, transparent)',
      'deep-30': 'color-mix(in srgb, var(--dl-deep-space) 30%, transparent)',
      'deep-12': 'color-mix(in srgb, var(--dl-deep-space) 12%, transparent)',
      'silver-50': 'color-mix(in srgb, var(--dl-silver) 50%, transparent)',
      'teal-10': 'color-mix(in srgb, var(--dl-deep-teal) 10%, transparent)',
      'clay-10': 'color-mix(in srgb, var(--dl-burnt-clay) 10%, transparent)',
    },
    extend: {
      fontFamily: {
        heading: ['DM Sans', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
