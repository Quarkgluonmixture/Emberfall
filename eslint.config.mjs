// Lint gate for src/ and test/ only — probe scripts in scripts/ are untyped
// one-shots driving the ?probe=1 browser API and are intentionally excluded.
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { files: ['src/**/*.ts', 'test/**/*.ts'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      // The codebase leans on `!` where invariants guarantee presence
      // (texture fallbacks, map lookups after has()) — not worth fighting.
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  { ignores: ['dist/', 'scripts/', 'node_modules/', 'public/'] },
);
