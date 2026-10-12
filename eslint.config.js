import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules/', 'test-results/', 'playwright-report/', 'screenshots/'],
  },
  js.configs.recommended,
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  // App code in the browser.
  {
    files: ['src/**/*.js'],
    ignores: ['src/core/**'],
    languageOptions: { globals: globals.browser },
  },
  // core: pure logic for the browser and Node. No browser or Node globals,
  // no direct clock or randomness (specification 13.2), no imports from
  // the other layers.
  {
    files: ['src/core/**/*.js'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: 'core gets time from the clock interface.' },
        { object: 'Math', property: 'random', message: 'core gets randomness from the seeded generator.' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'core gets time from the clock interface.',
        },
        {
          selector: "CallExpression[callee.name='Date']",
          message: 'core gets time from the clock interface.',
        },
      ],
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['**/data/**', '**/engine/**', '**/ui/**'], message: 'core does not depend on other layers.' }] },
      ],
    },
  },
  {
    files: ['sw.js'],
    languageOptions: { globals: globals.serviceworker },
  },
  // Dev tooling.
  {
    files: ['tools/**/*.mjs', 'tests/**/*.js', '*.config.js'],
    languageOptions: { globals: globals.node },
  },
  // Playwright tests also run functions inside the page.
  {
    files: ['tests/e2e/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
