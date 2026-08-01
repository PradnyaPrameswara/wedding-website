import astro from 'eslint-plugin-astro';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'public/assets/**', '.astro/**'],
  },
  ...astro.configs['flat/recommended'],
  {
    rules: {
      'no-unused-vars': 'error',
    },
  },
];
