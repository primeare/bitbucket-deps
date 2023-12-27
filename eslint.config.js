import js from '@eslint/js';
import globals from 'globals';

/**
 * @type { import('eslint').Linter.FlatConfig }
 */
const defaultConfig = {
  files: [
    '**/*.{js,mjs,cjs}'
  ],
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    globals: {
      ...globals.builtin,
      ...globals.es2021,
      ...globals.nodeBuiltin,
    },
  },
  linterOptions: {
    noInlineConfig: true,
    reportUnusedDisableDirectives: true,
  },
  plugins: {},
  rules: {
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
  },
};

export default [
  {
    ignores: [
      '**/node_modules/',
      '.git/',
      '.vscode/',
      '.husky/',
      '.cache/',
      'public/',
    ]
  },
  js.configs.recommended,
  defaultConfig,
];
