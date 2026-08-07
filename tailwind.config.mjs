/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    screens: {
      'source-sm': { max: '479px' },
      'source-md': { min: '480px', max: '767px' },
      'source-lg': { min: '768px', max: '991px' },
      'source-desktop': '992px',
      'source-wide': '1440px',
      'source-xwide': '1920px',
    },
    extend: {
      colors: {
        paper: 'var(--site-paper)',
        ink: 'var(--site-ink)',
        primary: 'var(--site-primary)',
        'text-light': 'var(--site-text-light)',
        border: 'var(--site-border)',
        'border-soft': 'var(--site-border-soft)',
        kelp: 'var(--site-kelp)',
        reef: 'var(--site-reef)',
        input: 'var(--site-input)',
        'rsvp-bg': 'var(--site-rsvp-bg)',
      },
      fontFamily: {
        display: ['Gilda Display', 'serif'],
        body: ['Inter Tight', 'sans-serif'],
        script: ['Allura', 'cursive'],
      },
      maxWidth: {
        container: 'var(--site-container)',
        content: '940px',
        tablet: '728px',
      },
      spacing: {
        section: '100px',
      },
      transitionTimingFunction: {
        'source-standard': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
    },
  },
  corePlugins: {
    container: false,
  },
  plugins: [],
};
